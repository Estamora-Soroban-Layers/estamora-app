import { describe, expect, it } from 'vitest'

import {
  DIMENSIONS,
  EXIT_CODE_FOR_STATUS,
  asReport,
  auditReport,
  defects,
  resultCounts,
  totals,
  type Report,
  type VectorResult,
} from './report'

const DIGEST = 'sha256:' + 'a'.repeat(64)

function result(overrides: Partial<VectorResult> & { vector_id: string }): VectorResult {
  return { category: 'boundary', status: 'passed', assertions: [], ...overrides }
}

/**
 * A report that is internally consistent. Every test below changes exactly one thing, so a
 * failure names the rule that broke rather than the fixture that drifted.
 */
function validReport(overrides: Partial<Report> = {}): Report {
  const summary = Object.fromEntries(DIMENSIONS.map((d) => [d, { passed: 1, failed: 0, total: 1 }]))
  return {
    $schema: 'https://example.invalid/report.schema.json',
    estamora_spec_version: '1.0',
    runner: { name: 'estamora', version: '0.1.3' },
    generated_at: '2026-09-16T08:43:15Z',
    target: { contract: 'C'.repeat(56), network: 'testnet', wasm_hash: 'a'.repeat(64) },
    profile: { id: 'sep-41', version: '1.0', digest: DIGEST },
    vectors: { digest: DIGEST, count: 7 },
    configuration: {},
    results: DIMENSIONS.map((d) => result({ vector_id: `${d}-vector` })),
    summary,
    status: 'CONFORMANT',
    exit_code: 0,
    ...overrides,
  }
}

describe('asReport', () => {
  it('accepts a well-formed report', () => {
    const outcome = asReport(validReport())
    expect(outcome.ok).toBe(true)
  })

  it('rejects a value that is not an object', () => {
    expect(asReport([1, 2, 3])).toEqual({ ok: false, reason: 'the document is not a JSON object' })
    expect(asReport(null)).toEqual({ ok: false, reason: 'the document is not a JSON object' })
  })

  it('names what is missing rather than saying "invalid"', () => {
    const broken = validReport() as Partial<Report>
    delete broken.summary
    delete broken.status
    const outcome = asReport(broken)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('summary')
  })

  it('rejects a status it does not know', () => {
    // A report with an unknown status is not a report this application can describe, and
    // guessing at its meaning would be the worst possible response.
    const outcome = asReport(validReport({ status: 'PROBABLY_FINE' as Report['status'] }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('not a conformance status')
  })
})

describe('totals and counts', () => {
  it('sums the seven dimensions', () => {
    expect(totals(validReport())).toEqual({ passed: 7, failed: 0, checks: 7 })
  })

  it('counts result statuses', () => {
    const report = validReport({
      results: [
        result({ vector_id: 'a', status: 'passed' }),
        result({ vector_id: 'b', status: 'failed' }),
        result({ vector_id: 'c', status: 'skipped', diagnostics: [{ code: 'x', message: 'y' }] }),
      ],
    })
    expect(resultCounts(report)).toEqual({ passed: 1, failed: 1, error: 0, skipped: 1 })
  })
})

describe('auditReport — the format checking itself', () => {
  it('finds nothing wrong with a consistent report', () => {
    expect(defects(auditReport(validReport()))).toEqual([])
  })

  it('catches an exit code that disagrees with the status', () => {
    // The report has told two different stories about the same run. A CI system reads the
    // exit code and a reader reads the status, so they must agree.
    const findings = defects(auditReport(validReport({ status: 'INCONCLUSIVE', exit_code: 0 })))
    expect(findings.map((f) => f.code)).toContain('exit-code-disagrees-with-status')
  })

  it('catches a vector count that disagrees with the results', () => {
    const report = validReport({ vectors: { digest: DIGEST, count: 99 } })
    expect(defects(auditReport(report)).map((f) => f.code)).toContain(
      'vector-count-disagrees-with-results',
    )
  })

  it('catches a dimension missing from the summary', () => {
    // A dimension with no checks is reported as a zero, never omitted, so absence means the
    // summary is incomplete rather than that nothing was measured.
    const report = validReport()
    delete report.summary.failure
    expect(defects(auditReport(report)).map((f) => f.code)).toContain(
      'dimension-missing-from-summary',
    )
  })

  it('catches a dimension whose total does not add up', () => {
    const report = validReport()
    report.summary.interface = { passed: 2, failed: 0, total: 5 }
    expect(defects(auditReport(report)).map((f) => f.code)).toContain(
      'dimension-total-inconsistent',
    )
  })

  it('catches a skipped vector that does not say why', () => {
    // "This was not exercised" and "this held" are different claims, and a report that
    // conflates them is exactly the document this application exists to question.
    const report = validReport({
      results: [result({ vector_id: 'silent-skip', status: 'skipped', diagnostics: [] })],
      vectors: { digest: DIGEST, count: 1 },
      exit_code: 2,
      status: 'INCONCLUSIVE',
    })
    expect(defects(auditReport(report)).map((f) => f.code)).toContain(
      'undecided-vector-without-diagnostic',
    )
  })

  it('catches CONFORMANT while vectors are recorded as failed', () => {
    const report = validReport({
      results: [result({ vector_id: 'a', status: 'failed' })],
      vectors: { digest: DIGEST, count: 1 },
    })
    expect(defects(auditReport(report)).map((f) => f.code)).toContain(
      'conformant-with-failed-vectors',
    )
  })

  it('catches NON_CONFORMANT with nothing recorded as failed', () => {
    // The verdict names the contract, but nothing in the report says which requirement it
    // violated, so the accusation is unsupported.
    const report = validReport({
      results: [result({ vector_id: 'a', status: 'passed' })],
      vectors: { digest: DIGEST, count: 1 },
      status: 'NON_CONFORMANT',
      exit_code: 1,
    })
    expect(defects(auditReport(report)).map((f) => f.code)).toContain(
      'non-conformant-without-a-failure',
    )
  })

  it('catches a digest that is not a digest', () => {
    const report = validReport({ profile: { id: 'sep-41', version: '1.0', digest: 'abc123' } })
    expect(defects(auditReport(report)).map((f) => f.code)).toContain('digest-not-a-digest')
  })

  it('catches a profile with no version', () => {
    // "sep-41" is incomplete: a later revision can require something the earlier one did not.
    const report = validReport({ profile: { id: 'sep-41', version: '', digest: DIGEST } })
    expect(defects(auditReport(report)).map((f) => f.code)).toContain('profile-version-absent')
  })

  it('notes a dimension that was never exercised', () => {
    const report = validReport()
    report.summary.failure = { passed: 0, failed: 0, total: 0 }
    const notes = auditReport(report).filter((f) => f.severity === 'note')
    expect(notes.map((f) => f.code)).toContain('dimensions-not-exercised')
  })
})

/**
 * The committed worked example, with its real numbers.
 *
 * Every value here was read out of
 * `estamora-conformance-runner/examples/testnet-contract/report.json` and from live reads of
 * the deployment, rather than invented for a test. That matters: this test's job is to pin
 * the observation the application is built to surface -- 63 checks, 0 failed, and *not* a
 * conformant verdict -- so that if the interpretation ever changes, it changes loudly.
 */
describe('the committed worked example', () => {
  const example: Report = {
    $schema:
      'https://estamora-soroban-layers.github.io/estamora-conformance-spec/schema/report.schema.json',
    estamora_spec_version: '1.0',
    runner: { name: 'estamora', version: '0.1.3' },
    generated_at: '2026-09-16T08:43:15Z',
    target: {
      contract: 'CDB3EKMUGN5E7X2LMO56IB3A55EU4PPUYEF5EBVDKDV3LCLICJNSYKLW',
      network: 'testnet',
      wasm_hash: '8393f41098591fc37a0a61ef54f3e76154db67139854f0589eb8c64e07ffc688',
    },
    profile: {
      id: 'sep-41',
      version: '1.0',
      digest: 'sha256:94654291d4caf1eccd5aa3f2193532288b0667348ebcb60ec862c188e732aee6',
    },
    vectors: {
      digest: 'sha256:63d1905d8f4795d42df487baaa086acd26713e24c118663396ca72d68b0418ef',
      count: 20,
    },
    configuration: { seeding: 'none' },
    // 20 vectors: one decided, nineteen requiring seeded state that a read-only measurement
    // of a deployed contract cannot arrange.
    results: [
      result({ vector_id: 'transfer-moves-value', status: 'passed' }),
      ...Array.from({ length: 19 }, (_, index) =>
        result({
          vector_id: `seeded-vector-${index + 1}`,
          status: 'skipped',
          diagnostics: [
            { code: 'seeding-unavailable', message: 'the requirement was not exercised' },
          ],
        }),
      ),
    ],
    summary: {
      interface: { passed: 49, failed: 0, total: 49 },
      authorization: { passed: 4, failed: 0, total: 4 },
      events: { passed: 6, failed: 0, total: 6 },
      behavior: { passed: 2, failed: 0, total: 2 },
      state: { passed: 1, failed: 0, total: 1 },
      invariants: { passed: 1, failed: 0, total: 1 },
      failure: { passed: 0, failed: 0, total: 0 },
    },
    status: 'INCONCLUSIVE',
    exit_code: 2,
  }

  it('totals 63 checks with none failed', () => {
    expect(totals(example)).toEqual({ passed: 63, failed: 0, checks: 63 })
  })

  it('contradicts itself in no way', () => {
    expect(defects(auditReport(example))).toEqual([])
  })

  it('is not conformant, and says so rather than implying it by omission', () => {
    expect(example.status).toBe('INCONCLUSIVE')
    expect(EXIT_CODE_FOR_STATUS[example.status]).toBe(2)
  })

  it('surfaces the two things a reader must not skim past', () => {
    // "0 failed" reads as "everything was checked". It was not: one dimension was never
    // exercised and nineteen of twenty vectors contributed nothing. These notes are the
    // correction, and losing them would be the most damaging regression this file could have.
    const notes = auditReport(example)
      .filter((finding) => finding.severity === 'note')
      .map((finding) => finding.code)
    expect(notes).toContain('dimensions-not-exercised')
    expect(notes).toContain('vectors-skipped')
  })

  it('reports that nineteen of twenty vectors were skipped', () => {
    expect(resultCounts(example).skipped).toBe(19)
  })
})
