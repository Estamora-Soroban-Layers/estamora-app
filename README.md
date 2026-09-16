# estamora-app

**The Estamora web application: conformance evidence for a Soroban contract you did not write.**

[![CI](https://github.com/Estamora-Soroban-Layers/estamora-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Estamora-Soroban-Layers/estamora-app/actions/workflows/ci.yml)
[![Deployed on Vercel](https://img.shields.io/badge/vercel-estamora--app.vercel.app-black?logo=vercel)](https://estamora-app.vercel.app)
[![Documentation](https://img.shields.io/badge/docs-estamora--docs.vercel.app-blue)](https://estamora-docs.vercel.app)
[![Product pitch](https://img.shields.io/badge/watch-5--minute%20pitch-blueviolet)](https://github.com/Estamora-Soroban-Layers/estamora-docs/releases/download/pitch-v1/estamora-pitch.mp4)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Open it: <https://estamora-app.vercel.app>**

<a href="https://github.com/Estamora-Soroban-Layers/estamora-docs/releases/download/pitch-v1/estamora-pitch.mp4">
  <img src="https://raw.githubusercontent.com/Estamora-Soroban-Layers/estamora-docs/main/docs/assets/pitch-thumbnail.png" alt="Watch the five-minute Estamora product pitch" width="720">
</a>

**[Watch the five-minute pitch](https://github.com/Estamora-Soroban-Layers/estamora-docs/releases/download/pitch-v1/estamora-pitch.mp4)**
— this application appears in it, and every frame of it was captured from the deployed sites and the
release binary rather than mocked up.

## It reads results. It cannot produce a verdict.

That sentence is the design, and it is enforced rather than merely stated.

A conformance verdict is produced by executing a profile's vectors against a contract over RPC, and
it names a profile revision and a corpus of vectors. Only
[`estamora-conformance-runner`](https://github.com/Estamora-Soroban-Layers/estamora-conformance-runner)
does that. This application presents the evidence it produces. An interface read here is not
evidence of behaviour, and a page that made it look like one would be worse than no page.

Concretely, that means **this repository contains no code that submits a transaction.** Every
contract call here is a simulation: a transaction is built, offered to a node, and discarded. There
is nothing to sign and no key to leak, because there is no signing path — not disabled, absent.

## What it does

| View                   | What it answers                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Overview**           | What Estamora is, and what this application is not                                  |
| **Conformance report** | Loads a report, validates it against the published schema, then audits it           |
| **Live contract**      | Reads a deployed testnet contract over Soroban RPC: symbol, name, decimals, balance |
| **Documentation**      | The guides and the reference, integrated rather than linked away                    |

## The audit, which is the interesting part

Rendering a report beautifully is only useful if the report is trustworthy, and a document that
contradicts itself has already told two different stories. So the application checks a report
against the claims the format makes about itself **before** presenting it, and shows what it found
above the report rather than behind a details tag.

A **defect** means the document contradicts itself:

| Rule                                  | Why it matters                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `exit-code-disagrees-with-status`     | A CI system reads the exit code and a reader reads the status. They must agree.                                                            |
| `vector-count-disagrees-with-results` | `vectors.count` and `results.length` are two statements about the same thing.                                                              |
| `dimension-missing-from-summary`      | A dimension with no checks is reported as a zero, never omitted, so absence means the summary is incomplete.                               |
| `dimension-total-inconsistent`        | `total` must equal `passed + failed`.                                                                                                      |
| `undecided-vector-without-diagnostic` | "This was not exercised" and "this held" are different claims, and conflating them is the failure mode this whole project exists to catch. |
| `conformant-with-failed-vectors`      | A conformant verdict over a failed vector.                                                                                                 |
| `non-conformant-without-a-failure`    | The verdict names the contract, but nothing says which requirement it violated.                                                            |
| `digest-not-a-digest`                 | Without a digest, the verdict cannot be tied to a revision of the requirements.                                                            |
| `profile-version-absent`              | `sep-41` is incomplete; `sep-41@1.0` is a claim.                                                                                           |

A **note** means the report is telling the reader something they must not skim past —
`dimensions-not-exercised`, or `vectors-skipped`. These exist because _"0 failed"_ reads as
_"everything was checked"_, and usually that is not what happened.

## Why the worked example is not conformant

The default report is a real measurement the runner made over RPC against a contract deployed to
Soroban testnet, committed to the runner rather than described in prose. It reports **63 checks
across all seven dimensions, 0 failed** — and it is `INCONCLUSIVE`, not `CONFORMANT`, because 19 of
its 20 vectors need seeded state that a read-only measurement of a deployed contract cannot arrange.

That is the single most misreadable thing about a conformance report, so this application leads with
it: the two notes above are produced by the audit and displayed for exactly this document.

## The specification is fetched, not copied

`report.schema.json` is **not** vendored here. It is fetched from the URL its `$id` declares —
<https://estamora-soroban-layers.github.io/estamora-conformance-spec/schema/report.schema.json> —
together with `profile.schema.json`, which it references. A copy would be a second answer to "what
is a valid report", and it would go stale exactly when it mattered.

Fetching both is also what demonstrates that both `$id`s resolve on the published site, which is the
property a consumer's validator depends on.

If the schema cannot be fetched, the application says so and labels the report **unvalidated**
rather than silently skipping the check — an unchecked report presented with the same confidence as
a checked one is worse than showing nothing.

## Running it

Requires Node.js 22.12 or later.

```bash
npm ci
npm run dev          # http://localhost:5173
```

| Script                  | Does                                           |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Development server                             |
| `npm run build`         | Type-check and build to `dist/`                |
| `npm run typecheck`     | `tsc --noEmit`                                 |
| `npm run format:check`  | Prettier, checked not applied                  |
| `npm test`              | Vitest, offline                                |
| `npm run verify:report` | The cross-repository check (needs the network) |
| `npm run ci`            | Everything CI runs, in CI order                |

No unit test reaches the network. Every one is a pure function of its input, so a red build always
means the code changed. The single network-dependent check is `verify:report`, which runs as its own
CI job where its failure is unambiguous.

## Checks

| Job             | Enforces                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`        | Formatting, types, tests, build — and that the **initial bundle stays under 400 kB** and is free of `stellar-sdk` and `ajv`, because code-splitting is a claim about the build output |
| `normative`     | The runner's committed report still validates against the specification's published schema, and still reports the 63/0/`INCONCLUSIVE` figures this application states                 |
| `links`         | Every documentation URL this application sends a reader to resolves                                                                                                                   |
| `deploy-vercel` | Publishes the artefact CI built, then asserts the shell, the entry chunk, and **CORS from the deployed origin** to all three cross-origin sources                                     |

The CORS check exists because those three fetches happen in a browser. A missing
`access-control-allow-origin` would present as "the application is broken" with no useful clue;
asserting it after every deploy turns that into a named failure.

## Architecture

```mermaid
flowchart LR
    subgraph browser["In this browser"]
        OE["Overview (eager)"] --> RV[Report viewer]
        OE --> IN[Inspector]
        RV --> AJ["ajv + report.schema.json"]
        IN --> SD["@stellar/stellar-sdk"]
    end
    RV -->|"fetch report"| RUN["runner@main<br/>examples/testnet-contract"]
    RV -->|"fetch schema"| SPEC["spec published schema"]
    IN -->|"simulate (read-only)"| RPC["soroban-testnet RPC"]
```

Static site, no server, no environment variables, no secrets at runtime. `stellar-sdk` and `ajv` are
loaded on demand: initial load is **243 kB** (77 kB gzipped) instead of 946 kB (232 kB), because
somebody who opens this site to read what a verdict _means_ should not have to download a Stellar
client to find out.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). The rule that shapes most changes: everything this
application _states_ about the format lives in `src/lib/report.ts` as a checkable rule, not as prose
in a template.

## Security

See [`SECURITY.md`](SECURITY.md).

## License

Apache-2.0. See [`LICENSE`](LICENSE).
