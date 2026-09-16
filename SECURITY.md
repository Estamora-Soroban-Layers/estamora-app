# Security Policy

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting**:
<https://github.com/Estamora-Soroban-Layers/estamora-app/security/advisories/new>

If you cannot use that form, email <danielwinningtalkerloba@gmail.com> with `[SECURITY]` in the
subject. **Do not open a public issue for a vulnerability.**

Include the view or file, the impact, and the smallest reproduction you can produce.

## In scope

- **Anything that makes this application misrepresent a report.** The application's whole value is
  that it questions the document it renders. If a crafted report can cause it to display a
  `NON_CONFORMANT` verdict as conformant, to hide an audit finding, or to suppress the "unvalidated"
  state, that is the most serious class of defect here and it is in scope.
- **Anything that makes the audit lie.** A rule in `src/lib/report.ts` that can be satisfied while
  the contradiction it describes is still present.
- **Script injection through report content.** Reports are documents from elsewhere. A vector
  identifier, a diagnostic message or a contract field that executes in a reader's browser is in
  scope. React escapes interpolated text by default; anything that bypasses that is a defect.
- **Exposure of the deployment credentials.** The deployment uses a Vercel token held as a GitHub
  Actions secret and the project IDs `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`.
- **Substitution of what is published.** Anything that lets content reach `estamora-app.vercel.app`
  without passing through `deploy-vercel.yml` and its CI-built artefact.
- **A dependency** in the bundle with a known vulnerability that this application exposes.

## Explicitly not in scope

**A finding in a contract is not a finding here.** This application reads contracts; it does not
audit them, and it cannot. A contract that is exploitable, or that fails conformance, is the
contract's maintainers' problem and theirs to hear about.

**A misleading report is not automatically a vulnerability here either.** If the runner produces a
report that is internally consistent but substantively wrong — a profile that misses a failure mode,
say — that is a defect in
[`estamora-conformance-spec`](https://github.com/Estamora-Soroban-Layers/estamora-conformance-spec)
or in the runner, and it belongs there. The exception is the case that _is_ in scope: if this
application renders that report in a way that makes it look more conclusive than it is.

**There is no signing path.** Every contract call is a simulation; the repository contains no code
that signs or submits a transaction, so "can this steal funds" has no surface here. If you believe
that is untrue, that is a vulnerability and we want to know.

## Conformance is not security

A `CONFORMANT` verdict means a contract behaved as a named profile version requires over a named
corpus. It is not an audit, and no page in this application is evidence that a contract is safe.
Profiles are written by people, and a profile that does not state a failure mode does not detect it.

## Response targets

| Stage                         | Target                       |
| ----------------------------- | ---------------------------- |
| Acknowledgement               | 3 working days               |
| Initial assessment            | 10 working days              |
| Fix, or a written explanation | 90 days from acknowledgement |

We will credit you unless you ask us not to.
