/**
 * The report viewer, which is the reason the other views exist.
 *
 * Two things are mocked and neither is the application's own logic: the schema fetch (which
 * would otherwise reach the specification site) and `fetch` itself. The report is a real
 * document, the audit that runs over it is the real audit, and the states rendered are the ones
 * the component decides between — a valid report, an invalid one, an unreachable schema, an
 * unreachable report, and a document that is not a report at all.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { COMMITTED_REPORT_URL, EXAMPLE_CONTRACT, REPORT_SCHEMA_URL } from '../constants'

const loadReportValidator = vi.fn()

vi.mock('../lib/schema', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/schema')>()
  return {
    ...actual,
    loadReportValidator: (...args: unknown[]) => loadReportValidator(...args),
  }
})

import { ReportViewer } from './ReportViewer'

const DIMENSIONS = [
  'interface',
  'authorization',
  'events',
  'behavior',
  'state',
  'invariants',
  'failure',
] as const

/** A report that is internally consistent but not a pass — the shape of the worked example. */
function consistentReport(overrides: Record<string, unknown> = {}) {
  const tally = { passed: 9, failed: 0, total: 9 }
  return {
    $schema: REPORT_SCHEMA_URL,
    estamora_spec_version: '0.1.0',
    runner: { name: 'estamora', version: '0.1.3' },
    generated_at: '2026-09-15T10:00:00Z',
    target: {
      contract: EXAMPLE_CONTRACT.id,
      network: 'testnet',
      wasm_hash: '8393f410',
    },
    profile: { id: 'sep-41', version: '1.0', digest: 'sha256:aaaa' },
    vectors: { digest: 'sha256:bbbb', count: 2 },
    configuration: {},
    results: [
      { vector_id: 'sep41.transfer.basic', category: 'behavior', status: 'passed' },
      {
        vector_id: 'sep41.auth.withheld',
        category: 'authorization',
        status: 'skipped',
        diagnostics: [{ code: 'needs-seeded-state', message: 'requires a funded account' }],
      },
    ],
    summary: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, tally])),
    status: 'INCONCLUSIVE',
    exit_code: 2,
    ...overrides,
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Server Error',
    headers: { get: () => 'application/json' },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response
}

function stubFetch(implementation: (url: string) => Promise<Response>) {
  const mock = vi.fn((input: unknown) => implementation(String(input)))
  vi.stubGlobal('fetch', mock)
  return mock
}

function validateAs(valid: boolean, errors: string[] = ['(root): must have required property']) {
  loadReportValidator.mockResolvedValue(() => ({
    valid,
    errors,
    documents: [REPORT_SCHEMA_URL, `${REPORT_SCHEMA_URL.replace('report', 'profile')}`],
  }))
}

beforeEach(() => {
  loadReportValidator.mockReset()
  validateAs(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the committed example loads without being asked for', () => {
  it('fetches the committed report on mount, so a first-time reader sees real evidence', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(COMMITTED_REPORT_URL)
  })

  it('renders the verdict, the exit code and the counts', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))
    const { container } = render(<ReportViewer />)

    // INCONCLUSIVE, not "passed": 63 checks and no failures is still not a pass.
    expect(await screen.findByText('Inconclusive')).toBeDefined()
    expect(screen.getByText(/Part of the corpus could not be decided/)).toBeDefined()
    expect(container.querySelector('.verdict')?.className).toContain('status-inconclusive')

    // Read through the container rather than a text query: the line is assembled from several
    // expressions, so React renders it as more than one text node.
    const meta = container.querySelector('.verdict-meta')?.textContent ?? ''
    expect(meta).toContain('INCONCLUSIVE')
    expect(meta).toContain('exit code 2')
    // Seven dimensions of nine checks each.
    expect(meta).toContain('63 checks · 0 failed')
    expect(meta).toContain('1 of 2 vectors skipped')
  })

  it('shows the profile and corpus digests that make the verdict reproducible', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    await screen.findByText('Inconclusive')
    expect(screen.getByText('sep-41@1.0')).toBeDefined()
    expect(screen.getByText('estamora 0.1.3')).toBeDefined()
    expect(screen.getByText('0.1.0')).toBeDefined()
  })

  it('lists every vector, including the undecided one and its diagnostic', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    await screen.findByText('Inconclusive')
    expect(screen.getByText('sep41.transfer.basic')).toBeDefined()
    expect(screen.getByText(/sep41.auth.withheld/)).toBeDefined()
    expect(screen.getByText(/needs-seeded-state:/)).toBeDefined()
    expect(screen.getByText(/requires a funded account/)).toBeDefined()
  })
})

describe('the schema verdict is reported separately from the audit', () => {
  it('says so when the document satisfies the published schema', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    expect(await screen.findByText('Valid')).toBeDefined()
    expect(
      screen.getByText(/fetched from the specification site together with 1 document/),
    ).toBeDefined()
  })

  it('lists the schema errors when the document does not', async () => {
    validateAs(false, [
      '/target/contract: must match pattern',
      '(root): must have required property',
    ])
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    expect(await screen.findByText('Invalid')).toBeDefined()
    expect(screen.getByText('/target/contract: must match pattern')).toBeDefined()
    expect(screen.getByText(/not a valid conformance report/)).toBeDefined()
  })

  it('distinguishes an unreachable schema from an unreachable report', async () => {
    loadReportValidator.mockRejectedValue(
      new Error(`could not fetch ${REPORT_SCHEMA_URL}: HTTP 503`),
    )
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    expect(await screen.findByText('Unvalidated')).toBeDefined()
    expect(screen.getByText(/the normative schema could not be fetched/i)).toBeDefined()
    expect(screen.getByText(/HTTP 503/)).toBeDefined()
    // The audit still ran, because it does not need the schema.
    expect(screen.getByText('Inconclusive')).toBeDefined()
  })
})

describe('the audit runs before the report is presented as evidence', () => {
  it('renders each note the audit produced', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    await screen.findByText('Inconclusive')
    expect(screen.getAllByText('Note').length).toBeGreaterThan(0)
    expect(screen.getByText(/vectors-skipped/)).toBeDefined()
  })

  it('says the document is consistent when nothing contradicts anything', async () => {
    const passed = {
      passed: 1,
      failed: 0,
      total: 1,
    }
    const clean = consistentReport({
      results: [{ vector_id: 'sep41.transfer.basic', category: 'behavior', status: 'passed' }],
      vectors: { digest: 'sha256:bbbb', count: 1 },
      summary: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, passed])),
      status: 'CONFORMANT',
      exit_code: 0,
    })
    stubFetch(async () => jsonResponse(clean))

    render(<ReportViewer />)

    expect(await screen.findByText('Consistent')).toBeDefined()
    expect(screen.getByText(/no dimension was left unmeasured/i)).toBeDefined()
  })

  it('refuses to present a self-contradicting document convincingly', async () => {
    // CONFORMANT with a failed vector is exactly the contradiction the audit exists to catch.
    const contradictory = consistentReport({
      results: [
        { vector_id: 'sep41.transfer.basic', category: 'behavior', status: 'failed' },
        { vector_id: 'sep41.auth.withheld', category: 'authorization', status: 'passed' },
      ],
      status: 'CONFORMANT',
      exit_code: 0,
    })
    stubFetch(async () => jsonResponse(contradictory))

    render(<ReportViewer />)

    expect(await screen.findByText('Defect')).toBeDefined()
    expect(screen.getByText(/conformant-with-failed-vectors/)).toBeDefined()
    const warning = document.querySelector('.callout-warn')?.textContent ?? ''
    expect(warning).toContain('1 internal contradiction')
    expect(warning).toContain('does not implement the format it claims')
  })

  it('marks a dimension no vector exercised rather than showing it as satisfied', async () => {
    const tallies = Object.fromEntries(
      DIMENSIONS.map((dimension) => [
        dimension,
        dimension === 'invariants'
          ? { passed: 0, failed: 0, total: 0 }
          : { passed: 2, failed: 0, total: 2 },
      ]),
    )
    stubFetch(async () => jsonResponse(consistentReport({ summary: tallies })))

    render(<ReportViewer />)

    await screen.findByText('Inconclusive')
    expect(screen.getByText('not exercised')).toBeDefined()
    expect(screen.getByText(/dimensions-not-exercised/)).toBeDefined()
  })
})

describe('a report that cannot be read is reported as such', () => {
  it('names an http status rather than rendering nothing', async () => {
    stubFetch(async () => jsonResponse({}, 500))

    render(<ReportViewer />)

    expect(await screen.findByText(/the report could not be read/i)).toBeDefined()
    expect(screen.getByText(/HTTP 500/)).toBeDefined()
  })

  it('explains the cross-origin failure, because that is what a browser actually reports', async () => {
    // A blocked cross-origin fetch is deliberately opaque: all JavaScript receives is
    // "Failed to fetch". The most likely cause is named so the reader is not left guessing.
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    render(<ReportViewer />)

    expect(await screen.findByText(/the report could not be read/i)).toBeDefined()
    expect(
      screen.getByText(/access-control-allow-origin header, including on a redirect/i),
    ).toBeDefined()
  })

  it('refuses a document that is not a conformance report, and says why', async () => {
    stubFetch(async () => jsonResponse({ hello: 'world' }))

    render(<ReportViewer />)

    expect(await screen.findByText(/this is not a conformance report/i)).toBeDefined()
    expect(screen.getByText(/no status, exit_code, results/i)).toBeDefined()
  })

  it('refuses a document whose status is not one this format defines', async () => {
    stubFetch(async () => jsonResponse(consistentReport({ status: 'PROBABLY_FINE' })))

    render(<ReportViewer />)

    expect(await screen.findByText(/"PROBABLY_FINE" is not a conformance status/)).toBeDefined()
  })

  it('refuses a body that is not JSON at all without crashing the page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'text/html' },
        text: async () => '<!DOCTYPE html><html>a 404 page</html>',
        json: async () => JSON.parse('<!DOCTYPE html>'),
      })) as unknown as typeof fetch,
    )

    render(<ReportViewer />)

    expect(await screen.findByText(/the report could not be read/i)).toBeDefined()
  })
})

describe('the reader can point it somewhere else', () => {
  it('loads a report from an entered url, and says so on the button', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(consistentReport()))
    const user = userEvent.setup()
    render(<ReportViewer />)
    await screen.findByText('Inconclusive')

    const field = screen.getByLabelText(/report url/i)
    await user.clear(field)
    await user.type(field, 'https://example.test/report.json')
    await user.click(screen.getByRole('button', { name: /^load report$/i }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]) === 'https://example.test/report.json'),
      ).toBe(true)
    })
  })

  it('loads on Enter, so a pasted url does not need a second action', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(consistentReport()))
    const user = userEvent.setup()
    render(<ReportViewer />)
    await screen.findByText('Inconclusive')

    const field = screen.getByLabelText(/report url/i)
    await user.clear(field)
    await user.type(field, 'https://example.test/other.json{Enter}')

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]) === 'https://example.test/other.json'),
      ).toBe(true)
    })
  })

  it('returns to the committed example on request', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(consistentReport()))
    const user = userEvent.setup()
    render(<ReportViewer />)
    await screen.findByText('Inconclusive')

    await user.click(screen.getByRole('button', { name: /committed example/i }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter((call) => String(call[0]) === COMMITTED_REPORT_URL).length,
      ).toBeGreaterThan(1)
    })
  })

  it('shows which schema the check will use, rather than leaving it implied', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    expect(screen.getByText(REPORT_SCHEMA_URL)).toBeDefined()
  })

  it('points at the committed document itself, for a reader who wants the bytes', async () => {
    stubFetch(async () => jsonResponse(consistentReport()))

    render(<ReportViewer />)

    expect(
      screen
        .getByRole('link', { name: /view the committed example on github/i })
        .getAttribute('href'),
    ).toContain('github.com/Estamora-Soroban-Layers/estamora-conformance-runner/blob/main')
  })
})
