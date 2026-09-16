/**
 * Every external fact this application depends on, in one place.
 *
 * These are not configuration knobs. Each one is a *claim about another repository* --
 * that a URL serves a document, that a contract exists on a network -- and a claim that
 * has been checked. Keeping them together is what makes checking them again possible.
 */

/** Where the normative report schema is served. Its `$id` resolves here. */
export const REPORT_SCHEMA_URL =
  'https://estamora-soroban-layers.github.io/estamora-conformance-spec/schema/report.schema.json'

/** The documentation site. */
export const DOCS_URL = 'https://estamora-docs.vercel.app'

/**
 * The product pitch, played in the page rather than linked out to.
 *
 * These point at the documentation site, deliberately, and not at the release asset. A GitHub
 * release asset is served as `content-type: application/octet-stream` with
 * `content-disposition: attachment`, so a link to one *downloads* 15 MB instead of playing it.
 * The site serves the same bytes as `video/mp4` with byte-range support, which is what makes
 * an embedded player able to start before the file has finished arriving, and to seek.
 *
 * `PITCH_VIDEO_ARCHIVE_URL` is the immutable release asset: the archival copy, linked as a
 * download for anyone who wants the file rather than the stream. Both are asserted by
 * `npm run check:browser-fetchable`.
 */
export const PITCH_VIDEO_URL = `${DOCS_URL}/assets/estamora-pitch.mp4`
export const PITCH_POSTER_URL = `${DOCS_URL}/assets/pitch-thumbnail.png`
export const PITCH_VIDEO_ARCHIVE_URL =
  'https://github.com/Estamora-Soroban-Layers/estamora-docs/releases/download/pitch-v1/estamora-pitch.mp4'

/** The organization the four repositories live under. */
export const RUNNER_REPO_URL =
  'https://github.com/Estamora-Soroban-Layers/estamora-conformance-runner'
export const SPEC_REPO_URL = 'https://github.com/Estamora-Soroban-Layers/estamora-conformance-spec'
export const ORG_URL = 'https://github.com/Estamora-Soroban-Layers'

/**
 * The worked example: a measurement the runner actually made over RPC against a contract
 * deployed to testnet, committed rather than described.
 *
 * The application displays this by default so that a reader arriving with no input sees a
 * real report. A demonstration that needed input before showing anything would be a
 * demonstration most readers never see.
 *
 * `raw.githubusercontent.com`, **not** `github.com/.../raw/...`. The latter redirects, and the
 * redirect response carries an empty `access-control-allow-origin`, which a browser rejects
 * while curl and Node follow it contentedly. That difference is why this is written with the
 * host spelled out and asserted by `npm run check:browser-fetchable`.
 */
export const COMMITTED_REPORT_URL = `https://raw.githubusercontent.com/Estamora-Soroban-Layers/estamora-conformance-runner/main/examples/testnet-contract/report.json`
export const COMMITTED_REPORT_PAGE = `${RUNNER_REPO_URL}/blob/main/examples/testnet-contract/report.json`

/** Soroban testnet RPC. Public, and it answers a browser origin with `access-control-allow-origin`. */
export const TESTNET_RPC_URL = 'https://soroban-testnet.stellar.org'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

/**
 * An address used only as the *source* of a read-only simulation.
 *
 * Simulating a contract call requires a source account to build the transaction against;
 * it does not require that account's secret, because nothing is signed and nothing is
 * submitted. This is a real testnet account, so the simulation is built the same way the
 * network would build it.
 */
export const SIMULATION_SOURCE = 'GBITS7JPWINS2T22IWQ5BZK42GZXWOFS4CTFNXML33IX75TOLCDXDA5G'

/**
 * The contract deployed for the worked example.
 *
 * Redeployed after the `burn`/`burn_from` free-mint fix; the superseded identifier is named
 * in the example's README rather than quietly replaced, because it is the fix's own
 * motivating example.
 */
export const EXAMPLE_CONTRACT = {
  id: 'CDB3EKMUGN5E7X2LMO56IB3A55EU4PPUYEF5EBVDKDV3LCLICJNSYKLW',
  network: 'testnet',
  /** Verified against the deployment, not copied from documentation. */
  reading: { symbol: 'MST', name: 'Measurable Token', decimals: 7 },
}

/** The runner repository, whose release the documentation describes. */
export const RUNNER_VERSION = '0.1.3'
