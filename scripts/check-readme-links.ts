/**
 * Check that every link in the README resolves.
 *
 * The README is the first thing a reviewer reads and the last thing anybody updates, so a link
 * to a moved page or a renamed workflow is the most common rot in a repository like this one.
 * The application's own CI already asserts the URLs the *application* sends a reader to; this
 * asserts the ones the *README* does, which is a different list.
 *
 * Two kinds of link are checked, and only one of them needs a network:
 *
 * - **Absolute**, over HTTP. Releases and raw content are requested with GET rather than HEAD:
 *   GitHub answers HEAD on a release asset inconsistently, and a checker that reports 405 as a
 *   broken link trains its readers to ignore it.
 * - **Relative**, against the working tree. These matter more than they look: a relative path is
 *   the only kind that can be broken without anything noticing, because no tool fetches it and
 *   a reader who lands on a 404 image simply sees nothing. An image that does not load is
 *   invisible rather than wrong, which is the worse failure.
 *
 * A brand-new absolute URL can also 404 for a few seconds while the other repository indexes the
 * commit that added it, so a failure here is worth re-running before it is believed.
 */

import { readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const README = new URL('../README.md', import.meta.url)
// The README *is* at the repository root, so the directory holding it is the root. This started
// as `resolve(dirname(...), '..')`, which resolved to the parent of the repository and reported
// every relative target as missing -- including files that plainly exist. A path check that
// cannot find `LICENSE` is not checking anything.
const REPO_ROOT = dirname(fileURLToPath(README))
const TIMEOUT_MS = 30_000

/** A link whose host is this deployment. */
const OWN_HOSTS = ['estamora-app.vercel.app', 'estamora-docs.vercel.app']

function extract(urls: Set<string>, text: string): void {
  const markdown = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g
  const bare = /(?<![("])(https?:\/\/[^\s)<>]+)/g
  for (const pattern of [markdown, bare]) {
    for (const match of text.matchAll(pattern)) {
      const url = match[1]?.replace(/[.,;:]$/, '')
      if (url) urls.add(url)
    }
  }
}

/**
 * Every relative target in the README: `[...](path)` and `![...](path)`, in Markdown or in HTML
 * `src=`/`href=` attributes.
 *
 * Anchors are stripped: `#test-coverage` refers to a heading in this file, and a heading is not
 * something this script can resolve without re-implementing a Markdown slugger. Leaving them in
 * would mean asserting the existence of a file called `#test-coverage`.
 */
function extractRelative(targets: Set<string>, text: string): void {
  const patterns = [/\[[^\]]*\]\(([^\s)]+)\)/g, /(?:src|href)="([^"]+)"/g]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const target = match[1]
      if (!target) continue
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue // scheme-qualified: http, mailto, data
      if (target.startsWith('#')) continue
      targets.add(target.split('#')[0]?.split('?')[0] ?? target)
    }
  }
}

async function resolves(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': 'estamora-app-link-check' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok) return null
    return `HTTP ${response.status}`
  } catch (problem) {
    return problem instanceof Error ? problem.message : String(problem)
  }
}

const text = await readFile(README, 'utf8')

const urls = new Set<string>()
extract(urls, text)

// Two exclusions, both deliberate:
// - A badge URL is an image endpoint. It is still fetched, because a renamed workflow breaks the
//   badge silently and nobody notices until a reviewer does.
// - A development-server URL is printed by `npm run dev` as output, not offered as a link. It
//   resolves only while a contributor has the server running, so checking it would fail in CI
//   for a reason that says nothing about the repository.
const targets = [...urls].filter(
  (url) => !url.includes('shields.io') && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url),
)

const relative = new Set<string>()
extractRelative(relative, text)

const failures: string[] = []

// Relative targets first: no network, so they cannot fail for a reason that is not the
// repository's own.
for (const target of relative) {
  if (target.length === 0) continue
  const path = resolve(REPO_ROOT, target)
  try {
    await access(path)
  } catch {
    failures.push(`${target} — not present in the working tree`)
  }
}

const results = await Promise.all(
  targets.map(async (url) => ({ url, problem: await resolves(url) })),
)

for (const { url, problem } of results) {
  const own = OWN_HOSTS.some((host) => url.includes(host))
  if (problem) {
    failures.push(
      `${url} — ${problem}${own ? ' (this deployment, so a stale URL here ships)' : ''}`,
    )
  }
}

if (failures.length > 0) {
  console.error(`::error::${failures.length} link(s) in README.md do not resolve:`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(
  `README.md: ${targets.length} link(s) fetched, ${relative.size} relative target(s) present, all resolve`,
)
