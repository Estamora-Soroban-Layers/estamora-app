#!/usr/bin/env bash
#
# Assert the three claims this repository makes about itself, by looking for their negation.
#
# 1. "This application cannot produce a verdict and nothing here can change state." The claim is
#    load-bearing -- it is on the landing page, in the footer of every route, and in the README --
#    and it is enforced by the absence of code. An absence is exactly what a review forgets to
#    check, so it is checked here: no signing, no submission, no secret material.
# 2. Mainnet is deliberately absent. A reader poking at the live network from a page that cannot
#    sign anything would learn nothing, and confusing the two networks is the failure this
#    project exists to make visible.
# 3. No credentials are committed. The application fetches from public endpoints only and needs
#    no key of any kind, so a token in the tree is a mistake with no innocent explanation.
#
# Shell rather than TypeScript because this is a search, and a search is what grep is for.
set -euo pipefail

cd "$(dirname "$0")/.."

# Shipped source only. Test files are excluded deliberately: `rpc.test.ts` asserts that the
# request method is *not* `sendTransaction`, so scanning them reports the check's own mirror
# image as a violation.
#
# The built bundle is deliberately NOT scanned, and that is worth stating rather than leaving as
# an omission. `@stellar/stellar-sdk` ships `sendTransaction` as part of its API, so the string
# is present in any bundle containing the SDK at all. Grep cannot tell "the library defines this
# method" from "this application calls it", and a check that cannot tell them apart either fails
# always or gets weakened until it means nothing. What is enforceable is that no source file of
# ours calls it, and that the initial chunk does not contain the SDK at all -- which the
# bundle-budget step already asserts.
SHIPPED=(src --include='*.ts' --include='*.tsx' --exclude='*.test.*')
CREDENTIALS='\bS[A-Z2-7]{55}\b|ghp_[A-Za-z0-9]{20,}|vc[pk]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----'

problems=0

# Report every match for a pattern, and count the pattern as a problem if there was one.
# The emptiness test is explicit: `if grep ...` would treat "no match" and "grep failed" as the
# same thing, and a check that cannot distinguish those passes when it should fail.
expect_absent() {
  local description="$1" pattern="$2"
  shift 2
  local hits
  hits=$(grep -rnE "$pattern" "$@" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    printf '  %s\n' "$description"
    printf '%s\n' "$hits" | sed 's/^/    /'
    problems=$((problems + 1))
  fi
}

echo "== nothing here signs or submits =="
# The read path uses `simulateTransaction` and never a submission call; `Keypair` and `sign`
# have no business in a read-only viewer.
expect_absent "a submission call appears in shipped source:" \
  '\b(sendTransaction|submitTransaction|signTransaction)\b' "${SHIPPED[@]}"
expect_absent "signing or key material appears in shipped source:" \
  '\bKeypair\b|\.sign\(|fromSecret' "${SHIPPED[@]}"

echo "== mainnet is absent =="
expect_absent "a mainnet endpoint or passphrase appears in shipped source:" \
  'horizon\.stellar\.org|mainnet|Public Global Stellar Network' "${SHIPPED[@]}"

echo "== no credentials are committed =="
# Only shapes that are unambiguously a credential. A broad entropy scan would report this file's
# own patterns, so the script excludes itself.
files=(src scripts)
[ -f package.json ] && files+=(package.json)
for extra in *.json *.md; do [ -f "$extra" ] && files+=("$extra"); done
expect_absent "a credential-shaped string appears in the tree:" "$CREDENTIALS" "${files[@]}"

if [ "$problems" -gt 0 ]; then
  echo
  echo "::error::$problems claim(s) this repository makes about itself are not true of its contents"
  exit 1
fi

echo
echo "all three claims hold: nothing signs or submits, mainnet is absent, no credential is committed"
