#!/usr/bin/env bash
#
# Vercel's build step for this project.
#
# The bundle is not built on Vercel. It is built by GitHub Actions, which has the pinned Node
# version and the pinned dependency tree, so what is published is what CI type-checked,
# tested and built -- not a second build that nobody validated.
#
# That makes this step a check rather than a build. It asserts the bundle exists, so a
# misconfigured workflow fails here with a clear message instead of publishing an empty
# directory over the working application.

set -euo pipefail

if [ ! -f dist/index.html ]; then
  printf '%s\n' "vercel-build: dist/index.html is absent." >&2
  printf '%s\n' "vercel-build: run 'npm run build' before deploying; Vercel serves the artefact CI built and must not be handed an unbuilt directory." >&2
  exit 1
fi

# An index.html with no script tag is the failure that looks like success: the page loads,
# and the application never does.
if ! grep -q 'type="module"' dist/index.html; then
  printf '%s\n' "vercel-build: dist/index.html has no module script; the application would never start." >&2
  exit 1
fi

assets="$(find dist/assets -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
if [ "$assets" -lt 3 ]; then
  printf '%s\n' "vercel-build: only $assets javascript asset(s) in dist/; expected the split chunks." >&2
  exit 1
fi

printf '%s\n' "vercel-build: $assets javascript asset(s) present; packaging the artefact GitHub Actions built."
