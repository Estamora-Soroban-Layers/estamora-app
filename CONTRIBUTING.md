# Contributing

## Rule 1 — a claim about the format is a rule, not a sentence

Everything this application states about the conformance format is expressed as a check in
`src/lib/report.ts`, not as prose in a template. The audit findings, the exit-code mapping and what
each status means all live there.

That is why the Documentation view renders its tables from those constants rather than containing a
copy of them: a table in a template drifts from the behaviour it describes, and nobody notices until
a reader is misled.

If you want the application to say something new about the format, add the rule that makes it
checkable, then display what the rule found. A statement with no rule behind it is a claim nobody
can test.

## Rule 2 — never make a value look more complete than it is

The recurring failure in a dashboard is a value that looks authoritative and is not: a balance shown
unscaled, a timestamp with invented precision, a count omitting what was skipped.

So:

- a fixed-point integer is always scaled by its declared decimals before display;
- absence renders as `—`, never as an empty string, because an empty string reads as "blank" rather
  than "there is nothing";
- a fraction is dropped rather than rounded, because less precise is honest and falsely precise is
  not;
- an undecided vector always shows its diagnostic.

## Rule 3 — no code path signs or submits

This application cannot produce a verdict, and that is enforced structurally: `src/lib/rpc.ts`
simulates, and there is no submission path anywhere in the repository. A pull request that adds one
would make the landing page false, so it would need to change the claim everywhere it is made —
including in three other repositories' READMEs.

## Working on it

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run format      # apply
npm run typecheck
npm test
npm run build
npm run verify:report   # needs the network; the cross-repository check
```

`npm run ci` runs all of it in CI order.

## Tests

Unit tests are pure functions of their input and **must not reach the network**. If a test needs a
remote document, it belongs in `verify:report` or in the `links` job — tests that hit the network
fail for reasons unrelated to the change, and a check people learn to rerun is a check people stop
reading.

The audit rules are the highest-value place to add tests. Each rule has a test that breaks exactly
one thing about a consistent fixture, so a failure names the rule rather than the fixture.

`src/lib/report.test.ts` also pins the committed worked example against its real numbers — 63
checks, 0 failed, `INCONCLUSIVE`, exit `2`. Those values were read from the runner's report and from
live reads of the deployment, not invented. If a re-measurement moves them, that test and the
`normative` CI job fail together, which is the point: the application describes those numbers, so
either the description or the measurement has to change.

## Style

Strict TypeScript, and the strictness is deliberate — `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` are why several helpers return `—` explicitly rather than relying on a
falsy check. Prettier decides formatting; do not argue with it in review.

Comments explain **why**, and the ones that matter state the failure they prevent. "This exists
because somebody will otherwise do X and not notice" is a good comment. "This function formats a
digest" is not.

## Proposing a change that touches another repository

Three repositories have to agree for this application to be correct: the spec's schema, the runner's
report, and this application's reading of both. `npm run verify:report` is the only thing that can
see all three at once. If your change moves what the application depends on, change the pin or the
constant **and** the check in the same pull request.

## Conduct

[`CODE_OF_CONDUCT.md`](https://github.com/Estamora-Soroban-Layers/estamora-conformance-spec/blob/main/CODE_OF_CONDUCT.md)
applies across the organization.
