# Changelog

All notable changes to the Estamora web application are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versioning is
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), with one qualification that matters
here more than it would in most web applications.

## How versioning works for this application

This application holds no state and produces no verdict. A version here therefore identifies a
**published rendering** of results that other repositories produced and own, which makes the
question "what is breaking?" mean something narrower than usual:

| Change | Effect |
| --- | --- |
| What the audit asserts about a report | **major** |
| The status, exit-code or report vocabulary this application displays | **major** |
| A view, a route, a presentation of a fact | minor |
| Copy, styling, a screenshot, a capture | patch |

The middle row is the one worth stating. `src/lib/report.ts` holds this application's reading of
the runner's exit-code contract and status vocabulary, and `src/views/Docs.tsx` renders the
reference tables **from those same constants** rather than restating them. That is deliberate:
a documentation table that agrees with the code by coincidence is a table that will stop
agreeing. But it also means a wrong constant here is a wrong published specification of somebody
else's contract, so it is a major change to correct it.

No version of this application can claim a contract conforms. Conformance is measured by
[`estamora-conformance-runner`](https://github.com/Estamora-Soroban-Layers/estamora-conformance-runner)
against profiles owned by
[`estamora-conformance-spec`](https://github.com/Estamora-Soroban-Layers/estamora-conformance-spec),
and this application reads one of their reports.

## [Unreleased]

### Fixed

- **The deploy gate no longer reports a slow edge as a broken deployment.** `vercel deploy --prod`
  returning means the deployment is *published*, not that the production alias has *switched*: for
  a few seconds the alias can serve the new shell while the entry chunk that shell names is not
  reachable yet. A run of the job failed on exactly that — `assets/index-<hash>.js -> 404` — for a
  deployment that was serving correctly seconds later. The step now retries, for up to three
  minutes, and distinguishes a response that is not this application at all (no entry chunk,
  which fails at once rather than being retried) from an edge that has not caught up. Every
  assertion is unchanged; what changed is that a correct deployment is no longer reported as a
  defective one. `estamora-docs` waits the same way, and did already — this repository did not,
  which is the whole of the bug.

## [0.1.0] - 2026-09-16

First release: the application, the audit, the live contract view and the embedded pitch.

### Added

- **The report view, which validates before it renders.** A conformance report is fetched,
  validated against the specification's published JSON schema, and only then audited: does the
  recorded exit code match the status, does the vector count match the results, is every
  undecided vector explained. The schema's `$ref`s are resolved from the published `$id`s, so
  the check fails if the normative schema is not served where it claims to be — the property
  that made the specification's `0.1.1` release necessary.
- **A live contract view, read-only by construction.** Symbol, name, decimals and a balance,
  read from a deployed testnet contract over Soroban RPC by simulation. This repository contains
  no code that submits a transaction, which is a structural guarantee rather than a promise.
- **The documentation, integrated rather than duplicated.** Reference tables rendered from this
  application's own constants, and links to the site assembled from the other repositories'
  documents at pinned revisions.
- **The product pitch, embedded on the landing page**, with whatever remains of the page
  rendered behind it. Its source is the documentation site, which serves the file as `video/mp4`
  with byte ranges; see *Fixed* for why it does not point at the release asset.
- **`npm run check:browser-fetchable`**, which reads every cross-origin URL out of
  `src/constants.ts` and asserts the property a browser requires rather than the property curl
  reports — following each redirect by hand, and additionally asserting that embedded media is
  served as media with range support, since a reachable video that downloads is not a video.
- **`npm run verify:report`**, which fetches the published schema *and* the document it
  references, then validates the runner's committed report against both, so the worked example
  this application states on its landing page cannot drift from the report it describes.

### Fixed

- **The default report could not be read by a browser, though every check passed.** The
  application fetched its report from `github.com/.../raw/...`, which answers `302` with an
  **empty** `access-control-allow-origin` header before redirecting to `raw.githubusercontent.com`.
  CORS is enforced on every hop, and empty is not a valid value, so the browser blocked the
  fetch while `curl` and Node — which follow the redirect and read the good header at the end —
  both reported success. The report view showed "the report could not be read" on a deployment
  every pipeline called green.
  The URL now names `raw.githubusercontent.com` directly. The lesson was not "check CORS"; it was
  that every check had been pointed at a *different URL* than the code used, which is why the
  replacement reads the URLs out of the constants the application fetches.
- **The initial bundle carried a Stellar client and a JSON validator to render a landing page.**
  Both are now loaded only by the views that use them. The initial load is **251,735 bytes**
  uncompressed - 244,750 of JavaScript and 6,985 of CSS - and the chunk that does carry the
  SDK and the validator is 536 kB, fetched when a reader opens the live contract view. CI asserts
  the entry chunk stays under 400 kB and that neither library is referenced by it, because the
  claim is about the build output and a claim about the build output belongs in a check of the
  build output.
- **A whole-second timestamp was rendered with fake millisecond precision.** `toISOString()`
  always emits three fractional digits, so a report whose measurement time was a whole second
  displayed as `.000`, implying a precision the document did not have. This surfaced as a
  failing unit test written from a real value in the committed report; the implementation was
  changed rather than the expectation.
- **The pitch linked at a URL that downloaded instead of playing.** A GitHub release asset is
  served as `content-type: application/octet-stream` with `content-disposition: attachment`, so
  clicking "watch the pitch" downloaded 15 MB. The player is now embedded and its source is the
  documentation site, which serves the same bytes as playable media.

### Known limitations

- **It cannot produce a verdict, and that is the design.** A verdict is produced by executing a
  profile's vectors against a contract over RPC, naming a profile revision and a corpus. An
  interface read is not evidence of behaviour, and a page that made it look like one would be
  worse than no page.
- **The live view reads four things, and no more.** `symbol`, `name`, `decimals` and one balance.
  Nothing about authorization, events, state transitions or invariants.
- **Nothing here is a security claim.** Conformance is behavioural compatibility with a named
  profile over a named corpus. A conformant contract can still be exploitable.

[Unreleased]: https://github.com/Estamora-Soroban-Layers/estamora-app/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Estamora-Soroban-Layers/estamora-app/releases/tag/v0.1.0
