/**
 * The constants are claims about other repositories, so they are asserted rather than assumed.
 *
 * Two of these tests exist because their failure is invisible in a browser and obvious here.
 * `COMMITTED_REPORT_URL` must use `raw.githubusercontent.com` and not `github.com/.../raw/`:
 * the latter redirects, and the redirect carries an empty `access-control-allow-origin`, which
 * a browser rejects while `curl` follows it happily. That exact defect shipped once. And the
 * pitch video must be served from the documentation site rather than the release asset, because
 * a release asset is served `content-disposition: attachment` and so downloads instead of plays.
 */

import { describe, expect, it } from 'vitest'

import {
  COMMITTED_REPORT_PAGE,
  COMMITTED_REPORT_URL,
  DOCS_URL,
  EXAMPLE_CONTRACT,
  ORG_URL,
  PITCH_POSTER_URL,
  PITCH_VIDEO_ARCHIVE_URL,
  PITCH_VIDEO_URL,
  REPORT_SCHEMA_URL,
  RUNNER_REPO_URL,
  RUNNER_VERSION,
  SIMULATION_SOURCE,
  SPEC_REPO_URL,
  TESTNET_PASSPHRASE,
  TESTNET_RPC_URL,
} from './constants'

const ALL_URLS: [string, string][] = [
  ['REPORT_SCHEMA_URL', REPORT_SCHEMA_URL],
  ['DOCS_URL', DOCS_URL],
  ['PITCH_VIDEO_URL', PITCH_VIDEO_URL],
  ['PITCH_POSTER_URL', PITCH_POSTER_URL],
  ['PITCH_VIDEO_ARCHIVE_URL', PITCH_VIDEO_ARCHIVE_URL],
  ['RUNNER_REPO_URL', RUNNER_REPO_URL],
  ['SPEC_REPO_URL', SPEC_REPO_URL],
  ['ORG_URL', ORG_URL],
  ['COMMITTED_REPORT_URL', COMMITTED_REPORT_URL],
  ['COMMITTED_REPORT_PAGE', COMMITTED_REPORT_PAGE],
  ['TESTNET_RPC_URL', TESTNET_RPC_URL],
]

describe('every external claim is a usable URL', () => {
  it.each(ALL_URLS)('%s parses, is absolute https, and has no trailing slash', (_name, url) => {
    const parsed = new URL(url)
    expect(parsed.protocol).toBe('https:')
    // A trailing slash is not wrong so much as a sign the value was typed rather than derived,
    // and `DOCS_URL` in particular is concatenated with paths that already begin with one.
    expect(url.endsWith('/')).toBe(false)
  })

  it.each(ALL_URLS)('%s contains no unexpanded template or whitespace', (_name, url) => {
    expect(url).not.toMatch(/[${}\s]/)
  })
})

describe('the report is fetched from a host a browser will accept', () => {
  it('uses the raw host rather than the redirecting html host', () => {
    // The regression this pins: `github.com/<org>/<repo>/raw/<ref>/<path>` 302s with an empty
    // `access-control-allow-origin`, so the browser blocks a response that curl reads fine.
    expect(COMMITTED_REPORT_URL).toContain('raw.githubusercontent.com/')
    expect(COMMITTED_REPORT_URL).not.toContain(
      'github.com/Estamora-Soroban-Layers/estamora-conformance-runner/raw/',
    )
  })

  it('points at the committed example in the runner repository', () => {
    expect(COMMITTED_REPORT_URL).toBe(
      'https://raw.githubusercontent.com/Estamora-Soroban-Layers/estamora-conformance-runner/main/examples/testnet-contract/report.json',
    )
  })

  it('has a browsable counterpart on the html host, for a human to read', () => {
    expect(COMMITTED_REPORT_PAGE).toBe(
      `${RUNNER_REPO_URL}/blob/main/examples/testnet-contract/report.json`,
    )
  })
})

describe('the pitch is streamed, and archived', () => {
  it('plays from the documentation site, so it is served as video/mp4', () => {
    expect(PITCH_VIDEO_URL).toBe(`${DOCS_URL}/assets/estamora-pitch.mp4`)
  })

  it('shows a poster hosted by the same site', () => {
    expect(PITCH_POSTER_URL).toBe(`${DOCS_URL}/assets/pitch-thumbnail.png`)
  })

  it('archives the download on an immutable release tag, not a moving one', () => {
    expect(PITCH_VIDEO_ARCHIVE_URL).toBe(
      'https://github.com/Estamora-Soroban-Layers/estamora-docs/releases/download/pitch-v1/estamora-pitch.mp4',
    )
    // `latest` would silently repoint at a future release; a tag cannot move.
    expect(PITCH_VIDEO_ARCHIVE_URL).not.toContain('/latest/')
  })

  it('and the archived copy is the same file as the streamed one, by name', () => {
    expect(PITCH_VIDEO_ARCHIVE_URL.endsWith('/estamora-pitch.mp4')).toBe(true)
    expect(PITCH_VIDEO_URL.endsWith('/estamora-pitch.mp4')).toBe(true)
  })
})

describe('the schema is fetched from the url its $id declares', () => {
  it('is the specification site path, ending in the schema name', () => {
    expect(REPORT_SCHEMA_URL).toBe(
      'https://estamora-soroban-layers.github.io/estamora-conformance-spec/schema/report.schema.json',
    )
  })
})

describe('the worked example is a real deployment, described consistently', () => {
  it('names a contract identifier of the right shape and network', () => {
    expect(EXAMPLE_CONTRACT.id).toMatch(/^C[A-Z2-7]{55}$/)
    expect(EXAMPLE_CONTRACT.id).toHaveLength(56)
    expect(EXAMPLE_CONTRACT.network).toBe('testnet')
  })

  it('records the reading that was verified against the deployment', () => {
    expect(EXAMPLE_CONTRACT.reading).toEqual({
      symbol: 'MST',
      name: 'Measurable Token',
      decimals: 7,
    })
  })

  it('simulates from a source account with a valid testnet identity', () => {
    // A simulation needs a source to build against, and it must be a real account for the
    // node to build the same transaction the network would. It needs no secret, and none is here.
    expect(SIMULATION_SOURCE).toMatch(/^G[A-Z2-7]{55}$/)
    expect(SIMULATION_SOURCE).toHaveLength(56)
    expect(SIMULATION_SOURCE).not.toMatch(/^S/)
  })

  it('reads testnet, not mainnet', () => {
    // Mainnet is deliberately absent from this repository. A reader poking at the live network
    // from a page that cannot sign anything would learn nothing and risk confusing the two.
    expect(TESTNET_RPC_URL).toBe('https://soroban-testnet.stellar.org')
    expect(TESTNET_PASSPHRASE).toBe('Test SDF Network ; September 2015')
  })

  it('pins the runner version as a release triple', () => {
    expect(RUNNER_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe("the repositories named are the organization's own", () => {
  it.each([
    ['runner', RUNNER_REPO_URL],
    ['spec', SPEC_REPO_URL],
    ['org', ORG_URL],
  ])('%s lives under the organization', (_name, url) => {
    expect(url.startsWith('https://github.com/Estamora-Soroban-Layers')).toBe(true)
  })
})
