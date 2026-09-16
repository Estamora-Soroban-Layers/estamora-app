import { useCallback, useEffect, useMemo, useState } from 'react'

import { COMMITTED_REPORT_PAGE, COMMITTED_REPORT_URL, REPORT_SCHEMA_URL } from '../constants'
import {
  formatTimestamp,
  groupDigits,
  humanise,
  percent,
  shortenDigest,
  shortenIdentifier,
} from '../lib/format'
import {
  DIMENSIONS,
  STATUS_MEANING,
  asReport,
  auditReport,
  defects,
  resultCounts,
  totals,
  type Finding,
  type Report,
} from '../lib/report'
import { loadReportValidator, type ReportValidator, type ValidationOutcome } from '../lib/schema'

interface Loaded {
  report: Report
  source: string
  raw: string
}

function statusClass(status: Report['status']): string {
  return `verdict status-${status.toLowerCase().replace(/_/g, '-')}`
}

function statusTag(status: string): string {
  switch (status) {
    case 'passed':
      return 'tag tag-pass'
    case 'failed':
      return 'tag tag-defect'
    case 'skipped':
      return 'tag tag-skip'
    case 'error':
      return 'tag tag-error'
    default:
      return 'tag tag-neutral'
  }
}

export function ReportViewer() {
  const [url, setUrl] = useState(COMMITTED_REPORT_URL)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The schema validator is built once, from the published schema. `validatorError` is kept
  // separate from `failure` on purpose: "the report could not be fetched" and "the schema
  // could not be fetched" are different problems with different fixes, and collapsing them
  // would hide the second.
  const [validator, setValidator] = useState<ReportValidator | null>(null)
  const [validation, setValidation] = useState<ValidationOutcome | null>(null)
  const [validatorError, setValidatorError] = useState<string | null>(null)

  const load = useCallback(async (target: string) => {
    setBusy(true)
    setFailure(null)
    setLoaded(null)
    try {
      const response = await fetch(target, { headers: { accept: 'application/json' } })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      const raw = await response.text()
      const parsed: unknown = JSON.parse(raw)
      const outcome = asReport(parsed)
      if (!outcome.ok) {
        throw new Error(`this is not a conformance report: ${outcome.reason}`)
      }
      setLoaded({ report: outcome.report, source: target, raw })
    } catch (problem) {
      setFailure(problem instanceof Error ? problem.message : String(problem))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadReportValidator()
      .then((build) => {
        if (!cancelled) setValidator(() => build)
      })
      .catch((problem: unknown) => {
        if (!cancelled) {
          setValidatorError(problem instanceof Error ? problem.message : String(problem))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void load(COMMITTED_REPORT_URL)
  }, [load])

  useEffect(() => {
    if (!validator || !loaded) return
    setValidation(validator(JSON.parse(loaded.raw) as unknown))
  }, [validator, loaded])

  const findings = useMemo<Finding[]>(() => (loaded ? auditReport(loaded.report) : []), [loaded])
  const tally = useMemo(() => (loaded ? totals(loaded.report) : null), [loaded])
  const counts = useMemo(() => (loaded ? resultCounts(loaded.report) : null), [loaded])

  const fatal = useMemo(() => defects(findings), [findings])

  return (
    <article>
      <h1>Conformance report</h1>
      <p className="lede">
        The normative document a run produces. Before it is rendered, it is validated against the
        schema published at the URL its <code>$id</code> declares, and then audited against the
        claims the format makes about itself. A document that contradicts itself is reported as such
        rather than displayed convincingly.
      </p>

      <div className="card">
        <div className="row">
          <div className="grow">
            <label htmlFor="report-url">Report URL</label>
            <input
              id="report-url"
              type="url"
              value={url}
              spellCheck={false}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load(url)
              }}
            />
          </div>
          <button className="button-primary" onClick={() => void load(url)} disabled={busy}>
            {busy ? 'Loading…' : 'Load report'}
          </button>
          <button
            onClick={() => {
              setUrl(COMMITTED_REPORT_URL)
              void load(COMMITTED_REPORT_URL)
            }}
            disabled={busy}
          >
            Committed example
          </button>
        </div>
        <p className="faint" style={{ margin: '10px 0 0', fontSize: 12 }}>
          Schema fetched from <code>{REPORT_SCHEMA_URL}</code>
        </p>
      </div>

      {failure && (
        <div className="finding finding-defect">
          <span className="tag tag-defect">Failed</span>
          <p className="finding-body">
            <strong>The report could not be read.</strong> {failure}
          </p>
        </div>
      )}

      {validatorError && (
        <div className="finding finding-note">
          <span className="tag tag-note">Unvalidated</span>
          <p className="finding-body">
            <strong>
              The normative schema could not be fetched, so this report is unvalidated.
            </strong>{' '}
            It is still checked against the format&rsquo;s own internal rules below, but not against
            the specification. {validatorError}
          </p>
        </div>
      )}

      {loaded && (
        <>
          <section className={statusClass(loaded.report.status)}>
            <p className="verdict-headline">{STATUS_MEANING[loaded.report.status].headline}</p>
            <p className="verdict-detail">{STATUS_MEANING[loaded.report.status].detail}</p>
            <div className="verdict-meta">
              <span>
                status <code>{loaded.report.status}</code>
              </span>
              <span>
                exit code <code>{loaded.report.exit_code}</code>
              </span>
              <span>
                {tally?.checks ?? 0} checks · {tally?.failed ?? 0} failed
              </span>
              <span>
                {counts?.skipped ?? 0} of {loaded.report.results.length} vectors skipped
              </span>
            </div>
          </section>

          <h2>Checks</h2>
          <h3>Against the published schema</h3>
          {validation ? (
            validation.valid ? (
              <div className="finding finding-note" style={{ borderLeftColor: 'var(--ok)' }}>
                <span className="tag tag-pass">Valid</span>
                <p className="finding-body">
                  The document satisfies <code>report.schema.json</code>, fetched from the
                  specification site together with {validation.documents.length - 1} document it
                  references.
                </p>
              </div>
            ) : (
              <div className="finding finding-defect">
                <span className="tag tag-defect">Invalid</span>
                <p className="finding-body">
                  <strong>The document does not satisfy the published schema.</strong> It is shown
                  below for inspection, but it is not a valid conformance report:
                  <br />
                  {validation.errors.slice(0, 8).map((error) => (
                    <code key={error} style={{ display: 'block' }}>
                      {error}
                    </code>
                  ))}
                </p>
              </div>
            )
          ) : (
            !validatorError && <p className="muted">Validating…</p>
          )}

          <h3>Against the format&rsquo;s own rules</h3>
          {findings.length === 0 ? (
            <div className="finding finding-note" style={{ borderLeftColor: 'var(--ok)' }}>
              <span className="tag tag-pass">Consistent</span>
              <p className="finding-body">
                Nothing in this document contradicts anything else in it, and no dimension was left
                unmeasured.
              </p>
            </div>
          ) : (
            findings.map((finding) => (
              <div
                key={finding.code + finding.message}
                className={
                  finding.severity === 'defect' ? 'finding finding-defect' : 'finding finding-note'
                }
              >
                <span className={finding.severity === 'defect' ? 'tag tag-defect' : 'tag tag-note'}>
                  {finding.severity === 'defect' ? 'Defect' : 'Note'}
                </span>
                <p className="finding-body">
                  {finding.message}
                  <br />
                  <span className="faint mono" style={{ fontSize: 12 }}>
                    {finding.code}
                  </span>
                </p>
              </div>
            ))
          )}

          {fatal.length > 0 && (
            <div className="callout callout-warn">
              This report has {fatal.length} internal contradiction{fatal.length === 1 ? '' : 's'}.
              Whatever produced it does not implement the format it claims — treat the evidence
              below as unreliable until that is explained.
            </div>
          )}

          <h2>What was measured</h2>
          <dl className="kv">
            <dt>contract</dt>
            <dd>
              {shortenIdentifier(loaded.report.target?.contract)}{' '}
              <span className="faint">({loaded.report.target?.network})</span>
            </dd>
            <dt>wasm hash</dt>
            <dd>{loaded.report.target?.wasm_hash ?? '—'}</dd>
            <dt>profile</dt>
            <dd>
              {loaded.report.profile?.id}@{loaded.report.profile?.version}
            </dd>
            <dt>profile digest</dt>
            <dd title={loaded.report.profile?.digest}>
              {shortenDigest(loaded.report.profile?.digest)}
            </dd>
            <dt>corpus digest</dt>
            <dd title={loaded.report.vectors?.digest}>
              {shortenDigest(loaded.report.vectors?.digest)}
            </dd>
            <dt>runner</dt>
            <dd>
              {loaded.report.runner?.name} {loaded.report.runner?.version}
            </dd>
            <dt>generated</dt>
            <dd>{formatTimestamp(loaded.report.generated_at)}</dd>
            <dt>spec format</dt>
            <dd>{loaded.report.estamora_spec_version}</dd>
          </dl>

          <p className="muted" style={{ marginTop: 12 }}>
            The two digests are what make a verdict reproducible rather than merely repeatable: they
            pin the exact bytes of the requirements and of the corpus that were read, so a reviewer
            can fetch the same revision and check that the same verdict follows.
          </p>

          <h2>By dimension</h2>
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th className="num">Passed</th>
                <th className="num">Failed</th>
                <th className="num">Total</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dimension) => {
                const entry = loaded.report.summary?.[dimension]
                const total = entry?.total ?? 0
                const passed = entry?.passed ?? 0
                const failed = entry?.failed ?? 0
                return (
                  <tr key={dimension}>
                    <td>{humanise(dimension)}</td>
                    <td className="num">{groupDigits(String(passed))}</td>
                    <td className="num">{groupDigits(String(failed))}</td>
                    <td className="num">{groupDigits(String(total))}</td>
                    <td>
                      {total === 0 ? (
                        <span className="faint">not exercised</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="bar">
                            <div
                              className="bar-passed"
                              style={{ width: `${(passed / total) * 100}%` }}
                            />
                            <div
                              className="bar-failed"
                              style={{ width: `${(failed / total) * 100}%` }}
                            />
                          </div>
                          <span className="faint" style={{ fontSize: 12 }}>
                            {percent(passed, total)}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <h2>Vectors</h2>
          <p className="muted">
            Every vector the run attempted, including the ones it could not decide. A skipped vector
            is not a silent omission: it carries a diagnostic naming the reason, and it contributes
            nothing to the verdict.
          </p>
          <div className="card">
            {loaded.report.results.map((result) => (
              <div className="vector" key={result.vector_id}>
                <div className="vector-head">
                  <span className={statusTag(result.status)}>{result.status}</span>
                  <span className="vector-id">{result.vector_id}</span>
                  <span className="faint" style={{ fontSize: 12 }}>
                    {result.category}
                  </span>
                </div>
                {(result.diagnostics ?? []).map((diagnostic) => (
                  <p className="diagnostic" key={diagnostic.code + diagnostic.message}>
                    <strong>{diagnostic.code}:</strong> {diagnostic.message}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <h2>The document itself</h2>
      <p className="muted">
        <a href={COMMITTED_REPORT_PAGE}>View the committed example on GitHub</a>. The JUnit and
        Markdown renderings, and the command that produced them, are in the example&rsquo;s README.
      </p>
    </article>
  )
}
