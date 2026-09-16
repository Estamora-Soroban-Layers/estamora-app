/**
 * Check that every link in the README resolves.
 *
 * The README is the first thing a reviewer reads and the last thing anybody updates, so a link
 * to a moved page or a renamed workflow is the most common rot in a repository like this one.
 * The application's own CI already asserts the URLs the *application* sends a reader to; this
 * asserts the ones the *README* does, which is a different list.
 *
 * Releases and raw content are requested with GET rather than HEAD: GitHub answers HEAD on a
 * release asset inconsistently, and a checker that reports 405 as a broken link trains its
 * readers to ignore it.
 */

const README = new URL('../README.md', import.meta.url)
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

const text = await (await import('node:fs/promises')).readFile(README, 'utf8')

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

const failures: string[] = []
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

console.log(`README.md: ${targets.length} link(s) checked, all resolve`)
