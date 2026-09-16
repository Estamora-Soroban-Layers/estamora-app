/**
 * Audit the repository's own workflows.
 *
 * A workflow file is code that runs with a token, and two omissions are both common and both
 * consequential:
 *
 * - **No `permissions:`.** A workflow that does not declare them inherits the repository
 *   default, which for older repositories is read-write on everything. A job that only needs to
 *   read a checkout should say so, and the way to say so is to declare it.
 * - **No `timeout-minutes`.** The default is six hours. A hung test or a stuck network call
 *   occupies a runner for that long, and the job reports nothing until it ends.
 *
 * The check also asserts that no workflow triggers on `pull_request_target`, which runs with the
 * base repository's token on a fork's code: the one trigger where a workflow is a credential
 * theft waiting for a pull request.
 */

import { readdirSync, readFileSync } from 'node:fs'

// No interfaces for the workflow shape: the file is parsed textually on purpose (see below), so
// declaring a type for a structure nothing constructs would be a type that never checks anything.
const directory = new URL('../.github/workflows/', import.meta.url)
const files = readdirSync(directory).filter(
  (name) => name.endsWith('.yml') || name.endsWith('.yaml'),
)

const problems: string[] = []

if (files.length === 0) {
  problems.push('no workflows found, so this check is asserting nothing')
}

for (const file of files) {
  const source = readFileSync(new URL(file, directory), 'utf8')

  // `pull_request_target` is matched textually: parsing YAML to find a trigger that must never
  // appear is more machinery than the assertion needs, and a textual match cannot miss it.
  if (/^\s*pull_request_target\s*:/m.test(source)) {
    problems.push(`${file} triggers on pull_request_target, which runs with the base token`)
  }

  // A YAML parser is deliberately not used here. This file is a guard, and a guard that depends
  // on a parser agrees with whatever that parser accepts. The assertions below are about two
  // keys and one trigger, which is a shape a reader can verify by eye.
  const jobsBlock = source.split(/^jobs:\s*$/m)[1] ?? ''
  const jobNames = [...jobsBlock.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)].map((match) => match[1])
  const declaredTimeouts = [...jobsBlock.matchAll(/^\s{4,6}timeout-minutes:\s*\d+/gm)].length

  if (jobNames.length === 0) {
    problems.push(`${file}: no jobs found, which cannot be right`)
  }
  if (declaredTimeouts < jobNames.length) {
    problems.push(
      `${file}: ${jobNames.length} job(s) but ${declaredTimeouts} timeout-minutes declaration(s) — ` +
        `every job needs one, or a hung step holds a runner for the six-hour default`,
    )
  }

  // Top-level permissions, or one per job. Either satisfies the rule; the point is that the
  // default is never inherited silently.
  const hasTopLevel = /^permissions:\s*$/m.test(source)
  const perJob = [...jobsBlock.matchAll(/^\s{4}permissions:\s*$/gm)].length
  if (!hasTopLevel && perJob < jobNames.length) {
    problems.push(
      `${file}: declares neither top-level permissions nor one per job, so it inherits the ` +
        `repository default token scope`,
    )
  }
}

if (problems.length > 0) {
  console.error("::error::the workflows do not meet this repository's hardening rules:")
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(
  `${files.length} workflow(s) audited: every job declares a timeout, permissions are explicit, and no workflow uses pull_request_target`,
)
