/**
 * The report model, and the audit that makes displaying one worthwhile.
 *
 * The interesting part of this module is not the types. It is `auditReport`, which checks a
 * report against its own internal claims before the application presents it.
 *
 * The reasoning: this application exists to show a reader what a contract's behaviour was
 * measured to be. If the document it renders is internally inconsistent, then rendering it
 * beautifully is actively harmful -- the reader takes the presentation as evidence. A report
 * whose recorded `exit_code` disagrees with its `status` has already told two different
 * stories, and no amount of layout fixes that. So the audit runs first, and its findings are
 * shown above the report rather than hidden behind a details tag.
 *
 * Every rule below is a claim the format makes about itself. They are checked here rather
 * than trusted because each one is cheap to check and expensive to get wrong.
 */

export type ConformanceStatus =
  | 'CONFORMANT'
  | 'PARTIALLY_CONFORMANT'
  | 'NON_CONFORMANT'
  | 'INCONCLUSIVE'
  | 'EXECUTION_ERROR'
  | 'PROFILE_ERROR'

export type ResultStatus = 'passed' | 'failed' | 'error' | 'skipped'

/** The seven dimensions a report tallies. These are the keys `summary` is written with. */
export const DIMENSIONS = [
  'interface',
  'authorization',
  'events',
  'behavior',
  'state',
  'invariants',
  'failure',
] as const

export type Dimension = (typeof DIMENSIONS)[number]

export interface DimensionTally {
  passed: number
  failed: number
  total: number
}

export interface Diagnostic {
  code: string
  message: string
}

export interface AssertionOutcome {
  id?: string
  category?: string
  status?: 'passed' | 'failed'
  description?: string
}

export interface VectorResult {
  vector_id: string
  category: string
  status: ResultStatus
  assertions?: AssertionOutcome[]
  diagnostics?: Diagnostic[]
}

export interface Report {
  $schema: string
  estamora_spec_version: string
  runner: { name: string; version: string }
  generated_at: string
  target: {
    contract: string
    network: string
    wasm_hash: string
    metadata?: Record<string, unknown>
  }
  profile: { id: string; version: string; digest: string }
  vectors: { digest: string; count: number }
  configuration: Record<string, unknown>
  results: VectorResult[]
  summary: Record<string, DimensionTally>
  status: ConformanceStatus
  exit_code: number
}

/**
 * The documented mapping from a conformance status to a process exit code.
 *
 * This is the runner's public contract, so the application can check a report against it
 * without asking the runner anything. A report that fails this check was produced by
 * something that does not implement the contract it claims to.
 */
export const EXIT_CODE_FOR_STATUS: Record<ConformanceStatus, number> = {
  CONFORMANT: 0,
  // Both non-conformant outcomes exit 1: the contract violated a requirement.
  NON_CONFORMANT: 1,
  PARTIALLY_CONFORMANT: 1,
  INCONCLUSIVE: 2,
  PROFILE_ERROR: 3,
  EXECUTION_ERROR: 4,
}

/** What a status commits the reader to. Shown beside the verdict, always. */
export const STATUS_MEANING: Record<
  ConformanceStatus,
  { headline: string; detail: string; blamesContract: boolean }
> = {
  CONFORMANT: {
    headline: 'Conformant',
    detail:
      'Every required vector that was executed passed. This says the contract behaved as this named profile version requires over this named corpus — and nothing more.',
    blamesContract: false,
  },
  PARTIALLY_CONFORMANT: {
    headline: 'Partially conformant',
    detail:
      'Some requirements held and some did not. A partial result is still a failure: a contract that moves value correctly and skips an authorization check is not a conformant contract.',
    blamesContract: true,
  },
  NON_CONFORMANT: {
    headline: 'Non-conformant',
    detail: 'A required vector failed, so the contract violated a requirement the profile states.',
    blamesContract: true,
  },
  INCONCLUSIVE: {
    headline: 'Inconclusive',
    detail:
      'Part of the corpus could not be decided. This is not a pass and it is not a contract defect — it means this measurement did not settle the question. Read the skipped vectors before drawing any conclusion.',
    blamesContract: false,
  },
  EXECUTION_ERROR: {
    headline: 'Execution error',
    detail:
      'The environment failed, so nothing about the contract was learned. A pipeline should retry this, not block a release for it.',
    blamesContract: false,
  },
  PROFILE_ERROR: {
    headline: 'Profile error',
    detail:
      'The requirements themselves were unusable, so no verdict about any contract was reached. The specification is at fault, not the contract.',
    blamesContract: false,
  },
}

export type Severity = 'defect' | 'note'

export interface Finding {
  severity: Severity
  /** A stable identifier, so a finding can be discussed without quoting its prose. */
  code: string
  message: string
}

const STATUS_VALUES = Object.keys(EXIT_CODE_FOR_STATUS) as ConformanceStatus[]
const RESULT_STATUSES: ResultStatus[] = ['passed', 'failed', 'error', 'skipped']

/** Whether a value is a conformance status this application knows. */
export function isConformanceStatus(value: unknown): value is ConformanceStatus {
  return typeof value === 'string' && (STATUS_VALUES as string[]).includes(value)
}

/**
 * Read an unknown value as a report, or explain why it is not one.
 *
 * A structural check, not a schema validation: the schema is fetched from the
 * specification's own site and applied separately, because the normative answer to "is this
 * a valid report" belongs to the specification and not to this application. This function
 * answers the smaller question the application needs before it can render anything at all.
 */
export function asReport(
  value: unknown,
): { ok: true; report: Report } | { ok: false; reason: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'the document is not a JSON object' }
  }
  const candidate = value as Partial<Report>
  const missing: string[] = []
  for (const field of [
    'status',
    'exit_code',
    'results',
    'summary',
    'profile',
    'vectors',
    'target',
  ] as const) {
    if (candidate[field] === undefined) missing.push(field)
  }
  if (missing.length > 0) {
    return { ok: false, reason: `the document has no ${missing.join(', ')}` }
  }
  if (!isConformanceStatus(candidate.status)) {
    return { ok: false, reason: `"${String(candidate.status)}" is not a conformance status` }
  }
  if (!Array.isArray(candidate.results)) {
    return { ok: false, reason: 'results is not an array' }
  }
  if (typeof candidate.summary !== 'object' || candidate.summary === null) {
    return { ok: false, reason: 'summary is not an object' }
  }
  return { ok: true, report: candidate as Report }
}

/** The totals a report's `summary` reduces to. */
export function totals(report: Report): { passed: number; failed: number; checks: number } {
  let passed = 0
  let failed = 0
  for (const dimension of DIMENSIONS) {
    const tally = report.summary[dimension]
    if (!tally) continue
    passed += tally.passed
    failed += tally.failed
  }
  return { passed, failed, checks: passed + failed }
}

/** How many vectors ended in each status. */
export function resultCounts(report: Report): Record<ResultStatus, number> {
  const counts: Record<ResultStatus, number> = { passed: 0, failed: 0, error: 0, skipped: 0 }
  for (const result of report.results) {
    if (RESULT_STATUSES.includes(result.status)) counts[result.status] += 1
  }
  return counts
}

/**
 * Check a report against the claims the format makes about itself.
 *
 * `defect` findings mean the document contradicts itself. `note` findings mean the report
 * is telling the reader something they should not skim past — a dimension no vector
 * exercised, or a verdict that rests on fewer vectors than it appears to.
 */
export function auditReport(report: Report): Finding[] {
  const findings: Finding[] = []

  const expectedExit = EXIT_CODE_FOR_STATUS[report.status]
  if (report.exit_code !== expectedExit) {
    findings.push({
      severity: 'defect',
      code: 'exit-code-disagrees-with-status',
      message: `status is ${report.status}, which the exit-code contract maps to ${expectedExit}, but the report records exit_code ${report.exit_code}. The report has told two different stories about the same run.`,
    })
  }

  if (typeof report.vectors.count === 'number' && report.vectors.count !== report.results.length) {
    findings.push({
      severity: 'defect',
      code: 'vector-count-disagrees-with-results',
      message: `vectors.count is ${report.vectors.count} but results contains ${report.results.length} entries. A consumer cannot know which is right.`,
    })
  }

  for (const dimension of DIMENSIONS) {
    const tally = report.summary[dimension]
    if (!tally) {
      findings.push({
        severity: 'defect',
        code: 'dimension-missing-from-summary',
        message: `summary has no "${dimension}" key. A dimension with no checks is reported as a zero, not omitted, so its absence means the summary is incomplete.`,
      })
      continue
    }
    if (tally.passed + tally.failed !== tally.total) {
      findings.push({
        severity: 'defect',
        code: 'dimension-total-inconsistent',
        message: `summary.${dimension} reports total ${tally.total} but passed ${tally.passed} plus failed ${tally.failed} is ${tally.passed + tally.failed}.`,
      })
    }
  }

  for (const result of report.results) {
    const undecided = result.status === 'skipped' || result.status === 'error'
    const explained = (result.diagnostics ?? []).length > 0
    if (undecided && !explained) {
      findings.push({
        severity: 'defect',
        code: 'undecided-vector-without-diagnostic',
        message: `vector "${result.vector_id}" is ${result.status} and names no diagnostic. An undecided vector must say why: "this was not exercised" and "this held" are different claims.`,
      })
    }
  }

  const counts = resultCounts(report)
  if (report.status === 'CONFORMANT' && counts.failed > 0) {
    findings.push({
      severity: 'defect',
      code: 'conformant-with-failed-vectors',
      message: `status is CONFORMANT but ${counts.failed} vector(s) are recorded as failed.`,
    })
  }
  if (report.status === 'NON_CONFORMANT' && counts.failed === 0) {
    findings.push({
      severity: 'defect',
      code: 'non-conformant-without-a-failure',
      message:
        'status is NON_CONFORMANT but no vector is recorded as failed, so nothing in the report says which requirement was violated.',
    })
  }

  for (const [field, value] of [
    ['profile.digest', report.profile?.digest],
    ['vectors.digest', report.vectors?.digest],
  ] as const) {
    if (typeof value !== 'string' || !value.startsWith('sha256:')) {
      findings.push({
        severity: 'defect',
        code: 'digest-not-a-digest',
        message: `${field} is ${JSON.stringify(value)}, which is not a sha256-prefixed digest. Without it the verdict cannot be tied to an exact revision of the requirements.`,
      })
    }
  }

  // Notes. These are the observations that stop "0 failed" being read as "everything was
  // checked": the worked example is exactly this case, and it is the most misreadable thing
  // about a conformance report.
  const silentDimensions = DIMENSIONS.filter((d) => (report.summary[d]?.total ?? 0) === 0)
  if (silentDimensions.length > 0) {
    findings.push({
      severity: 'note',
      code: 'dimensions-not-exercised',
      message: `${silentDimensions.join(', ')} recorded no checks at all. Those dimensions were not measured, which is different from being satisfied.`,
    })
  }

  if (counts.skipped > 0) {
    findings.push({
      severity: 'note',
      code: 'vectors-skipped',
      message: `${counts.skipped} of ${report.results.length} vector(s) were skipped. They contribute nothing to the verdict, so the verdict rests on ${report.results.length - counts.skipped} vector(s).`,
    })
  }

  if (!report.profile?.version) {
    findings.push({
      severity: 'defect',
      code: 'profile-version-absent',
      message:
        'the profile records no version. A result that names only a profile family is incomplete, because a later revision of it can require something the earlier one did not.',
    })
  }

  return findings
}

/** Findings that mean the document contradicts itself. */
export function defects(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.severity === 'defect')
}
