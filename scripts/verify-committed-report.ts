/**
 * Verify the runner's committed report against the specification's published schema.
 *
 * This is the one check in this repository that reaches the network, and it runs as its own
 * CI job rather than inside the unit suite, so that a red build always means one thing:
 * either the published schema and the committed report have stopped agreeing, or a document
 * this repository depends on has stopped being served where it claims to be.
 *
 * It exists because it is the only way to check the property the whole application rests on:
 * that the report it renders is a valid instance of the format the specification defines,
 * and that both `$id`s resolve on the public site. Three repositories have to agree for that
 * to be true -- the spec's schema, the runner's output, and this app's understanding -- and
 * an integration check is the only thing that can see all three at once.
 *
 *   npm run verify:report
 */

import { COMMITTED_REPORT_URL, REPORT_SCHEMA_URL } from '../src/constants'
import { asReport, auditReport, defects, totals, type Report } from '../src/lib/report'
import { loadReportValidator } from '../src/lib/schema'

function fail(message: string): never {
  process.stderr.write(`verify-committed-report: ${message}\n`)
  process.exit(1)
}

async function main(): Promise<void> {
  process.stdout.write(`schema: ${REPORT_SCHEMA_URL}\n`)
  process.stdout.write(`report: ${COMMITTED_REPORT_URL}\n\n`)

  const validate = await loadReportValidator()

  const response = await fetch(COMMITTED_REPORT_URL, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    fail(`the committed report could not be fetched: HTTP ${response.status}`)
  }
  const document: unknown = await response.json()

  const outcome = asReport(document)
  if (!outcome.ok) {
    fail(`the committed report is not a report: ${outcome.reason}`)
  }
  const report: Report = outcome.report

  // 1. The normative check. This is the specification's answer, not this application's.
  const validation = validate(document)
  process.stdout.write(
    `schema validation: ${validation.valid ? 'valid' : 'INVALID'} ` +
      `(against ${validation.documents.length} fetched document(s))\n`,
  )
  if (!validation.valid) {
    for (const error of validation.errors) process.stdout.write(`  ${error}\n`)
    fail('the committed report does not satisfy the published schema')
  }

  // 2. The internal check. A valid document can still contradict itself.
  const findings = auditReport(report)
  const contradictions = defects(findings)
  process.stdout.write(
    `internal audit: ${contradictions.length} defect(s), ${findings.length - contradictions.length} note(s)\n`,
  )
  for (const finding of findings) {
    process.stdout.write(`  [${finding.severity}] ${finding.code}: ${finding.message}\n`)
  }
  if (contradictions.length > 0) {
    fail('the committed report contradicts itself')
  }

  // 3. The claims this application displays must still hold. If the runner re-measures the
  //    contract and the numbers move, this fails and the page that states "63 checks" gets
  //    corrected, rather than quietly going stale.
  const { passed, failed, checks } = totals(report)
  process.stdout.write(
    `\ntotals: ${checks} checks, ${passed} passed, ${failed} failed, ` +
      `status ${report.status}, exit ${report.exit_code}\n`,
  )
  if (checks !== 63 || failed !== 0) {
    fail(
      `the worked example no longer reports 63 checks with 0 failed; it reports ${checks} with ${failed}. ` +
        'The application describes these numbers, so either the description or the measurement must change.',
    )
  }
  if (report.status !== 'INCONCLUSIVE' || report.exit_code !== 2) {
    fail(
      `the worked example is now ${report.status} (exit ${report.exit_code}). The application is built around ` +
        'it being INCONCLUSIVE, because 19 of its 20 vectors need seeded state a read-only measurement cannot arrange.',
    )
  }

  process.stdout.write(
    '\nverify-committed-report: the report is valid, consistent, and matches what the app claims.\n',
  )
}

main().catch((problem: unknown) => {
  fail(problem instanceof Error ? problem.message : String(problem))
})
