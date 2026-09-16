import { DOCS_URL, RUNNER_REPO_URL, SPEC_REPO_URL } from '../constants'
import { EXIT_CODE_FOR_STATUS, STATUS_MEANING, type ConformanceStatus } from '../lib/report'

/**
 * The documentation, integrated into the application rather than beside it.
 *
 * Two things are deliberately different here from a list of links.
 *
 * First, the reference tables the application itself needs in order to interpret what it
 * shows -- the exit-code contract and what each status means -- are rendered from this
 * application's own constants, which are the same values its audit uses. They are not a
 * copy of a documentation page; they are the code's own view of the contract, so they
 * cannot drift from the behaviour.
 *
 * Second, this page does not restate the guides. The documents are assembled from tagged
 * revisions of two other repositories, and a second copy here would be a second answer to
 * what they say. It links, and it says where the documents come from.
 */

const SECTIONS: {
  title: string
  intro: string
  pages: { label: string; path: string; what: string }[]
}[] = [
  {
    title: 'Getting started',
    intro: 'Install it, point it at a specification checkout, and measure something.',
    pages: [
      {
        label: 'Installation',
        path: '/getting-started/installation/',
        what: 'Three install routes, and why a specification checkout is required',
      },
      {
        label: 'Your first measurement',
        path: '/getting-started/first-measurement/',
        what: 'Measure a fixture that is wrong in exactly one way, and read the verdict',
      },
    ],
  },
  {
    title: 'Runner guide',
    intro: 'The runner’s own engineering documents, at the revision this site pins.',
    pages: [
      { label: 'Command line', path: '/runner/cli/', what: 'Every flag of every command' },
      {
        label: 'CI integration',
        path: '/runner/ci-integration/',
        what: 'Exit codes as a gate, and the two outcomes that must not block a release',
      },
      {
        label: 'Certification',
        path: '/runner/certification/',
        what: 'Committing to a result so it can be checked later',
      },
      {
        label: 'Architecture',
        path: '/runner/architecture/',
        what: 'How the layers divide, and where a failure is attributed',
      },
      {
        label: 'Testnet testing',
        path: '/runner/testnet-testing/',
        what: 'Measuring a contract you do not control',
      },
      {
        label: 'Troubleshooting',
        path: '/runner/troubleshooting/',
        what: 'What to do when a run does not behave',
      },
    ],
  },
  {
    title: 'Specification',
    intro: 'The model that constrains any profile you write.',
    pages: [
      {
        label: 'Introduction',
        path: '/spec/introduction/',
        what: 'Why interface compatibility is an insufficient claim',
      },
      {
        label: 'Authorization model',
        path: '/spec/authorization-model/',
        what: 'Who must authorize, and what coverage means',
      },
      {
        label: 'Event model',
        path: '/spec/event-model/',
        what: 'Topics, bindings, cardinality, correlation with state',
      },
      {
        label: 'Failure model',
        path: '/spec/failure-model/',
        what: 'Failure categories and error-code policy',
      },
      {
        label: 'Authoring a profile',
        path: '/spec/profile-authoring/',
        what: 'How to write a profile bundle',
      },
      {
        label: 'Versioning',
        path: '/spec/versioning/',
        what: 'Why any change to a requirement is a version change',
      },
    ],
  },
  {
    title: 'Reference',
    intro: 'The contracts a report and a process obey.',
    pages: [
      {
        label: 'Exit codes',
        path: '/reference/exit-codes/',
        what: 'What each number commits you to',
      },
      {
        label: 'Error classes',
        path: '/reference/error-classes/',
        what: 'The ten classes, and the blame each one carries',
      },
      {
        label: 'Report format',
        path: '/reference/report-format/',
        what: 'Every member of the document this app renders',
      },
    ],
  },
]

export function Docs() {
  return (
    <article>
      <h1>Documentation</h1>
      <p className="lede">
        The guides, the model and the reference. The published site is assembled at build time from
        pinned revisions of <a href={SPEC_REPO_URL}>the specification</a> and{' '}
        <a href={RUNNER_REPO_URL}>the runner</a>, so a page there traces to a commit rather than to
        somebody&rsquo;s memory of one. This application links to it and does not restate it.
      </p>

      <div className="callout">
        <strong>
          Read the whole site at <a href={DOCS_URL}>{DOCS_URL.replace('https://', '')}</a>
        </strong>{' '}
        — including the nineteen normative documents and the runner&rsquo;s ten engineering
        documents, with search and cross-references.
      </div>

      <h2>What a status commits you to</h2>
      <p className="muted">
        Rendered from this application&rsquo;s own constants — the same values its audit checks a
        report against, so these cannot drift from the behaviour you see elsewhere on this page.
      </p>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th className="num">Exit</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(EXIT_CODE_FOR_STATUS) as ConformanceStatus[]).map((status) => (
            <tr key={status}>
              <td>
                <code>{status}</code>
              </td>
              <td className="num">
                <code>{EXIT_CODE_FOR_STATUS[status]}</code>
              </td>
              <td>{STATUS_MEANING[status].detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        Two codes are not statuses: <code>5</code> means the runner itself failed, and{' '}
        <code>64</code> means the command line was wrong (taken from <code>sysexits.h</code>, so a
        wrapper script can recognise it without knowing this program).
      </p>

      <h2>The most consequential distinction</h2>
      <p className="lede">
        <strong>
          Only a violated requirement exits <code>1</code>.
        </strong>{' '}
        An unreachable node, an unbuilt fixture, a refused connection and a malformed profile all
        exit something else, because a runner that reports a network outage as a contract failure
        blocks a release for the outage and teaches its users to distrust every <code>1</code> it
        produces.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p className="muted">{section.intro}</p>
          <table>
            <tbody>
              {section.pages.map((page) => (
                <tr key={page.path}>
                  <td style={{ width: '30%' }}>
                    <a href={`${DOCS_URL}${page.path}`}>{page.label}</a>
                  </td>
                  <td className="muted">{page.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <h2>Where the documents come from</h2>
      <dl className="kv">
        <dt>specification</dt>
        <dd>estamora-conformance-spec@v0.1.1 → docs/</dd>
        <dt>runner</dt>
        <dd>estamora-conformance-runner@v0.1.3 → docs/</dd>
        <dt>assembly</dt>
        <dd>estamora-docs → scripts/assemble-docs.sh</dd>
      </dl>
      <p className="muted">
        The pins are tags rather than branches, so a published page cannot change under its URL
        without a commit in the repository that owns it. A weekly job reports when either has moved,
        so the drift is found deliberately instead of as a surprise.
      </p>
    </article>
  )
}
