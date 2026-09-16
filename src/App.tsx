import { Suspense, lazy, useEffect, useState } from 'react'

import { DOCS_URL, ORG_URL, RUNNER_REPO_URL, SPEC_REPO_URL } from './constants'
import { Docs } from './views/Docs'
import { Overview } from './views/Overview'

// Loaded on demand, because between them they account for almost the whole bundle and
// neither is needed to read the landing page. `@stellar/stellar-sdk` is the large one, and
// somebody who opens this site to read what a verdict means should not download a Stellar
// client to do it. Code splitting is also what keeps the first paint independent of a
// dependency that will be replaced long before the prose is.
const ReportViewer = lazy(() =>
  import('./views/ReportViewer').then((module) => ({ default: module.ReportViewer })),
)
const Inspector = lazy(() =>
  import('./views/Inspector').then((module) => ({ default: module.Inspector })),
)

/**
 * Four views, and one of them is the reason the others exist.
 *
 * `Report` reads a report and checks it. `Inspect` reads a live contract. `Docs` explains
 * both. `Overview` says what the application is not — because the most likely misreading of
 * a page like this is that it decides conformance, and it cannot: only the runner reaches a
 * verdict, against a named profile revision over a named corpus.
 */

type RouteId = 'overview' | 'report' | 'inspect' | 'docs'

interface Route {
  id: RouteId
  label: string
  blurb: string
}

const ROUTES: Route[] = [
  { id: 'overview', label: 'Overview', blurb: 'What this is, and what it is not' },
  { id: 'report', label: 'Conformance report', blurb: 'Read a report and check it against itself' },
  { id: 'inspect', label: 'Live contract', blurb: 'Read a deployed testnet contract' },
  { id: 'docs', label: 'Documentation', blurb: 'The guides and the reference' },
]

function routeFromHash(): RouteId {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES.find((route) => route.id === hash)?.id ?? 'overview') satisfies RouteId
}

export function App() {
  const [route, setRoute] = useState<RouteId>(routeFromHash)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-inner">
          <a className="wordmark" href="#/overview">
            <span className="wordmark-mark" aria-hidden="true">
              ◆
            </span>
            <span>
              <strong>Estamora</strong>
              <span className="wordmark-sub">conformance evidence</span>
            </span>
          </a>

          <nav className="nav" aria-label="Sections">
            {ROUTES.map((entry) => (
              <a
                key={entry.id}
                href={`#/${entry.id}`}
                className={entry.id === route ? 'nav-link is-current' : 'nav-link'}
                aria-current={entry.id === route ? 'page' : undefined}
                title={entry.blurb}
              >
                {entry.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        <Suspense
          fallback={
            <p className="muted" role="status">
              Loading…
            </p>
          }
        >
          {route === 'overview' && <Overview />}
          {route === 'report' && <ReportViewer />}
          {route === 'inspect' && <Inspector />}
          {route === 'docs' && <Docs />}
        </Suspense>
      </main>

      <footer className="footer">
        <p>
          <strong>This application reads results. It cannot produce a verdict.</strong> A
          conformance verdict is produced by the runner, against a named profile revision over a
          named corpus of vectors, and it is the report that carries the claim — not the way the
          report is displayed.
        </p>
        <p className="footer-note">
          Conformance is not security. A conformant contract can still be exploitable, and no page
          here replaces formal verification, an audit or human review.
        </p>
        <p className="footer-links">
          <a href={DOCS_URL}>Documentation</a>
          <a href={RUNNER_REPO_URL}>Runner</a>
          <a href={SPEC_REPO_URL}>Specification</a>
          <a href={ORG_URL}>GitHub</a>
        </p>
      </footer>
    </div>
  )
}
