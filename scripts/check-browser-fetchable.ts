/**
 * Assert that every cross-origin URL this application fetches is readable *from a browser*.
 *
 * This check exists because of a bug that every other check in this repository passed.
 *
 * The application fetched its report from `github.com/.../raw/...`. That URL answers `302`
 * with `access-control-allow-origin:` — an **empty** header — and redirects to
 * `raw.githubusercontent.com`, which answers `200` with `*`. `curl` follows the redirect and
 * sees the good header. Node's `fetch` follows it too, so `npm run verify:report` was green
 * and the report validated against the published schema. In a browser, however, CORS is
 * enforced on **every hop**, and the first hop's empty header is not a valid value, so the
 * fetch was blocked and the primary view of the application showed "the report could not be
 * read".
 *
 * The lesson is not "check CORS". It is that every check had been pointed at a *different
 * URL* than the code used, so all of them were verifying a claim rather than the thing. This
 * script reads the URLs out of `src/constants.ts` — the same values the application uses —
 * and asserts the property a browser actually requires, at every hop.
 *
 *   npm run check:browser-fetchable
 */

import {
  COMMITTED_REPORT_URL,
  PITCH_POSTER_URL,
  PITCH_VIDEO_URL,
  REPORT_SCHEMA_URL,
  TESTNET_RPC_URL,
} from '../src/constants'

/** The origin the deployed application is served from. */
const ORIGIN = 'https://estamora-app.vercel.app'
const MAX_HOPS = 6

interface Failure {
  url: string
  hop: number
  problem: string
}

const failures: Failure[] = []

function headerValue(headers: Headers, name: string): string {
  const raw = headers.get(name)
  return raw === null ? '<absent>' : `"${raw}"`
}

/**
 * Follow a URL the way a browser would, checking CORS at every hop.
 *
 * `redirect: 'manual'` is the whole point: following redirects automatically would hide the
 * intermediate response, which is where the empty header lived.
 */
async function checkRedirectChain(url: string): Promise<void> {
  let current = url
  for (let hop = 1; hop <= MAX_HOPS; hop += 1) {
    let response: Response
    try {
      response = await fetch(current, {
        redirect: 'manual',
        headers: { Origin: ORIGIN, accept: '*/*' },
      })
    } catch (problem) {
      failures.push({
        url,
        hop,
        problem: `the request failed outright: ${problem instanceof Error ? problem.message : String(problem)}`,
      })
      return
    }

    const allowed = response.headers.get('access-control-allow-origin')
    if (allowed === null || allowed.trim() === '') {
      // This is the bug. An empty `Access-Control-Allow-Origin` is not a permissive header,
      // it is an invalid one: the browser rejects the response rather than ignoring it.
      failures.push({
        url,
        hop,
        problem:
          `no usable access-control-allow-origin (got ${headerValue(response.headers, 'access-control-allow-origin')}). ` +
          'A browser would block this response, even if every other tool follows it happily.',
      })
      return
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        failures.push({ url, hop, problem: `status ${response.status} with no location header` })
        return
      }
      current = new URL(location, current).href
      continue
    }

    if (!response.ok) {
      failures.push({ url, hop, problem: `final status ${response.status}` })
      return
    }

    console.log(`ok   ${url}${hop > 1 ? ` (after ${hop - 1} redirect(s))` : ''} — ${allowed}`)
    return
  }
  failures.push({ url, hop: MAX_HOPS, problem: `more than ${MAX_HOPS} redirects` })
}

/**
 * Assert that media this page embeds is *played* rather than downloaded.
 *
 * This is a third failure mode, distinct from both CORS and a 404, and it is the one that a
 * release asset hits every time. `<video>` and `<img>` are exempt from CORS, so an embedded
 * player appears correct: the request succeeds, the bytes arrive, nothing is blocked. What
 * makes the browser offer a 15 MB download instead of playing the file is the *response*, not
 * its reachability -- `content-type: application/octet-stream` with
 * `content-disposition: attachment`. A GitHub release asset is served exactly that way.
 *
 * So the assertions here are the ones a media element depends on: a media content type, and
 * byte-range support so that the player can start before the whole file has arrived and seek
 * once it is there. The request asks for a byte range specifically so that this measures the
 * property instead of inferring it.
 */
async function checkPlayableMedia(url: string, kind: 'video' | 'image'): Promise<void> {
  const expectedPrefix = kind === 'video' ? 'video/' : 'image/'
  const problems: string[] = []

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Origin: ORIGIN,
        accept: '*/*',
        ...(kind === 'video' ? { range: 'bytes=0-1023' } : {}),
      },
    })
  } catch (problem) {
    failures.push({
      url,
      hop: 1,
      problem: `the request failed outright: ${problem instanceof Error ? problem.message : String(problem)}`,
    })
    return
  }

  if (!response.ok && response.status !== 206) {
    failures.push({ url, hop: 1, problem: `status ${response.status}` })
    return
  }

  const contentType = response.headers.get('content-type') ?? '<absent>'
  if (!contentType.startsWith(expectedPrefix)) {
    problems.push(
      `content-type is "${contentType}", not ${expectedPrefix}*; a browser will download this instead of playing it`,
    )
  }

  if (kind === 'video' && (response.headers.get('accept-ranges') ?? '') !== 'bytes') {
    problems.push(
      `accept-ranges is "${response.headers.get('accept-ranges') ?? '<absent>'}", not "bytes"; the player cannot seek`,
    )
  }

  if (problems.length > 0) {
    failures.push({ url, hop: 1, problem: problems.join('; ') })
    return
  }

  console.log(`ok   ${url} (${kind}) — ${contentType}, status ${response.status}`)
}

/** The RPC endpoint is called with POST, so it is checked with POST. */
async function checkRpc(url: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
    })
    const allowed = response.headers.get('access-control-allow-origin')
    if (allowed === null || allowed.trim() === '') {
      failures.push({
        url,
        hop: 1,
        problem: `no usable access-control-allow-origin (got ${headerValue(response.headers, 'access-control-allow-origin')})`,
      })
      return
    }
    if (!response.ok) {
      failures.push({ url, hop: 1, problem: `status ${response.status}` })
      return
    }
    console.log(`ok   ${url} (POST) — ${allowed}`)
  } catch (problem) {
    failures.push({
      url,
      hop: 1,
      problem: `the request failed: ${problem instanceof Error ? problem.message : String(problem)}`,
    })
  }
}

async function main(): Promise<void> {
  console.log(`every URL below is fetched from a browser origin of ${ORIGIN}\n`)

  await checkRedirectChain(REPORT_SCHEMA_URL)
  await checkRedirectChain(COMMITTED_REPORT_URL)
  await checkRpc(TESTNET_RPC_URL)
  // The pitch is embedded on the landing page, so the reason it is checked here rather than
  // left to a link checker is that a link checker would call an unplayable video "working".
  await checkPlayableMedia(PITCH_VIDEO_URL, 'video')
  await checkPlayableMedia(PITCH_POSTER_URL, 'image')

  if (failures.length > 0) {
    console.log('')
    for (const failure of failures) {
      console.log(
        `::error::${failure.url} cannot be read from a browser: hop ${failure.hop}: ${failure.problem}`,
      )
    }
    console.log(
      `\ncheck-browser-fetchable: ${failures.length} URL(s) a browser cannot read.\n` +
        'This is invisible to curl and to Node, which is exactly how it shipped once.',
    )
    process.exit(1)
  }

  console.log(
    '\ncheck-browser-fetchable: every cross-origin URL is readable from a browser origin.',
  )
}

main().catch((problem: unknown) => {
  console.error('check-browser-fetchable: the check itself failed:', problem)
  process.exit(1)
})
