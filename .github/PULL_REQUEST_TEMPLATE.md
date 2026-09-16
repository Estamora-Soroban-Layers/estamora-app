## What this changes

<!-- One or two sentences. Name the view, the audit rule or the constant — not the file. -->

## Why

<!--
The reasoning, not the diff. For a view, what a reader could not find out before; for an audit
rule, the class of self-contradictory report it makes impossible; for a constant, the report or
the deployment it was read from.
-->

## Which of these applies

<!-- Tick every one that applies, then answer the question underneath it. -->

- [ ] **A displayed figure changed.** It was read from a report, a schema or RPC. Which one, and can
      you show it comes from there rather than from this repository's own copy?
- [ ] **An audit rule was added or tightened.** Say what it now rejects that it accepted, and why
      accepting it was a defect.
- [ ] **An audit rule was relaxed.** Say what it no longer rejects, and why that is safe rather than
      convenient.
- [ ] **A constant in `src/constants.ts` changed.** Several documentation tables are rendered from
      these. Which pages restated it, and were they updated from the constant or by hand?
- [ ] **The example contract changed.** Then the live contract view, its test, the committed report
      and the screenshots all refer to it. Name everything that was updated.
- [ ] **A dependency was added or removed.** Say what it replaces, and why it does not belong in the
      runner or the specification instead.
- [ ] **Build, checks or process only.** Nothing a reader sees changed.

## Does this change a claim the repository makes about itself?

<!--
The `claims` and `readme` jobs search the shipped source and the README for the things this
repository asserts — that nothing signs or submits, that mainnet is absent, that no credential is
committed, that the initial bundle is under 400 kB — and fail when one stops holding. If this
change touches one of those, say which, and paste the job's output below. If it adds a new claim,
say which check keeps it true.
-->

## Validation

<!--
Run these and paste the result. `npm run verify` validates the committed report against the
published schema and checks the cross-origin URLs the application actually fetches — the second
is the check that once passed while the deployed application could not read its own report, so it
is worth running even for a change that looks unrelated.
-->

```
npm ci
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
npm run verify
```

## Does any of this imply a security guarantee?

- [ ] No. Conformance is not a security property, and nothing in this change presents it as one.

<!--
If you cannot tick that, say why in the box below. This application verifies that defined
behavioural checks passed against a stated profile. It does not audit, and a passing result must
never be described as making a contract safe.
-->
