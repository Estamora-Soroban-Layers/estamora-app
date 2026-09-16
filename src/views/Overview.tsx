import { DOCS_URL, EXAMPLE_CONTRACT, RUNNER_REPO_URL, SPEC_REPO_URL } from '../constants'
import { shortenIdentifier } from '../lib/format'

export function Overview() {
  return (
    <article>
      <h1>Conformance evidence, for a contract you did not write</h1>
      <p className="lede">
        Estamora answers one question about a Soroban contract:{' '}
        <strong>
          does it actually behave according to the standard or profile it claims to implement?
        </strong>{' '}
        A contract can expose every method of the token interface with the exact expected signatures
        and still lose user funds, because it never checked whose signature it received, or
        publishes its success event before validating the amount.
      </p>
      <p className="lede">
        This application shows you the evidence. It reads a conformance report the{' '}
        <a href={RUNNER_REPO_URL}>runner</a> produced, checks that report against the{' '}
        <a href={SPEC_REPO_URL}>specification</a>&rsquo;s own schema, and reports anything the
        document says about itself that does not add up.
      </p>{' '}
      <div className="callout">
        <strong>Prefer to watch instead of read?</strong>{' '}
        <a href="https://github.com/Estamora-Soroban-Layers/estamora-docs/releases/download/pitch-v1/estamora-pitch.mp4">
          The five-minute product pitch
        </a>{' '}
        walks through the problem, a real free-mint bug from this project, the verdict contract and
        this application. Every frame of it is a live deployment or real program output.
      </div>
      <div className="callout callout-warn">
        <strong>
          This application cannot produce a verdict, and this is not a limitation to be fixed.
        </strong>{' '}
        A verdict is produced by executing a profile&rsquo;s vectors against a contract over RPC. It
        names a profile revision and a corpus of vectors, and the runner is the thing that measures
        it. An interface read here is not evidence of behaviour, and a page that made it look like
        one would be worse than no page at all.
      </div>
      <h2>What each view does</h2>
      <div className="grid">
        <div className="card">
          <h3>Conformance report</h3>
          <p className="muted">
            Loads a report, validates it against the published normative schema, then audits it:
            does the recorded exit code match the status, does the vector count match the results,
            is every undecided vector explained?
          </p>
        </div>
        <div className="card">
          <h3>Live contract</h3>
          <p className="muted">
            Reads a deployed testnet contract over Soroban RPC: symbol, name, decimals and a
            balance. Read-only by construction — this repository contains no code that submits a
            transaction, so nothing here can change state.
          </p>
        </div>
        <div className="card">
          <h3>Documentation</h3>
          <p className="muted">
            The guides and the reference. The documents are assembled from tagged revisions of the
            two source repositories, so a page here traces to a commit rather than to
            somebody&rsquo;s memory of one.
          </p>
        </div>
      </div>
      <h2>The worked example this is built around</h2>
      <p className="lede">
        A real measurement the runner made over RPC against a contract deployed to Soroban testnet,
        committed to the repository rather than described in prose. It reports{' '}
        <strong>63 checks across all seven dimensions, 0 failed</strong> — and it is{' '}
        <strong>not</strong> conformant, because 19 of its 20 vectors need seeded state that a
        read-only measurement cannot arrange.
      </p>
      <div className="card">
        <dl className="kv">
          <dt>contract</dt>
          <dd>{EXAMPLE_CONTRACT.id}</dd>
          <dt>network</dt>
          <dd>{EXAMPLE_CONTRACT.network}</dd>
          <dt>reads as</dt>
          <dd>
            {EXAMPLE_CONTRACT.reading.name} ({EXAMPLE_CONTRACT.reading.symbol}),{' '}
            {EXAMPLE_CONTRACT.reading.decimals} decimals
          </dd>
          <dt>short form</dt>
          <dd>{shortenIdentifier(EXAMPLE_CONTRACT.id)}</dd>
        </dl>
        <p className="muted" style={{ marginBottom: 0 }}>
          The identifier above is the one deployed <em>after</em> the <code>burn</code>/
          <code>burn_from</code> free-mint fix. The superseded deployment is named in the
          example&rsquo;s README rather than quietly replaced, because it is the fix&rsquo;s own
          motivating example.
        </p>
      </div>
      <h2>Where the pieces live</h2>
      <table>
        <thead>
          <tr>
            <th>Repository</th>
            <th>Owns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <a href={SPEC_REPO_URL}>estamora-conformance-spec</a>
            </td>
            <td>What conformance means: profiles, vectors, schemas, validation tooling</td>
          </tr>
          <tr>
            <td>
              <a href={RUNNER_REPO_URL}>estamora-conformance-runner</a>
            </td>
            <td>Measuring a contract against those requirements and reporting the result</td>
          </tr>
          <tr>
            <td>
              <a href={DOCS_URL}>estamora-docs</a>
            </td>
            <td>Explaining both: the guides and the assembled reference</td>
          </tr>
          <tr>
            <td>estamora-app (this application)</td>
            <td>Presenting evidence for a live contract. It reads results; it cannot judge them</td>
          </tr>
        </tbody>
      </table>
      <h2>Conformance is not security</h2>
      <p className="lede">
        Passing a profile means a contract behaved as that profile defines. Profiles are written by
        people, and a profile that does not state a failure mode does not detect it. A conformant
        contract can still be exploitable. Nothing here replaces formal verification, a security
        audit, penetration testing or economic analysis — and no page in this application should be
        quoted as evidence that a contract is safe.
      </p>
    </article>
  )
}
