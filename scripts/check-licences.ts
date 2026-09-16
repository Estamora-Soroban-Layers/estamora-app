/**
 * Assert that every runtime dependency is under a licence this project can ship.
 *
 * The application is Apache-2.0 and is deployed as a public site, so a copyleft dependency is
 * not a hypothetical problem: it would change what the deployed artefact can be licensed under.
 * The check reads the lockfile rather than `node_modules`, because the lockfile is the thing
 * that is reviewed and the thing that CI actually installs.
 *
 * Dev dependencies are deliberately out of scope. They are not distributed, and enforcing a
 * licence policy on a test runner's transitive tree buys nothing but noise.
 *
 * Written with no dependencies, so it cannot fail because a checker failed to install.
 */

import { readFileSync } from 'node:fs'

/** Licences that impose no distribution obligation beyond attribution. */
const ALLOWED = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
])

interface LockPackage {
  version?: string
  license?: string
  licenses?: string | string[]
  dev?: boolean
}

interface Lockfile {
  packages?: Record<string, LockPackage>
}

/** A licence string as declared, e.g. `MIT`, `(MIT OR Apache-2.0)`, `SEE LICENSE IN X`. */
function declaredLicence(entry: LockPackage): string {
  if (typeof entry.license === 'string') return entry.license
  const value = entry.licenses
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((item) => item).join(' OR ')
  return ''
}

/**
 * Whether every alternative in a licence expression is allowed.
 *
 * `(MIT OR GPL-3.0)` is acceptable, because the choice belongs to us and MIT is one of the
 * options. `(MIT AND GPL-3.0)` is not, because both obligations apply.
 */
function isAllowed(expression: string): boolean {
  const parts = expression
    .replace(/[()]/g, ' ')
    .split(/\s+OR\s+|,/)
    .map((part) => part.replace(/\s+AND\s+.*$/, '').trim())
    .filter((part) => part.length > 0)

  if (parts.length === 0) return false
  return parts.some((part) => ALLOWED.has(part))
}

const lock = JSON.parse(
  readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
) as Lockfile

const unlicensed: string[] = []
const disallowed: string[] = []
let examined = 0

for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  // The root entry is this repository, and `dev: true` marks a tree that is not distributed.
  if (path === '' || entry.dev === true) continue

  examined += 1
  const name = path.replace(/^node_modules\//, '')
  const licence = declaredLicence(entry)

  if (licence.length === 0) {
    unlicensed.push(name)
  } else if (!isAllowed(licence)) {
    disallowed.push(`${name} (${licence})`)
  }
}

if (unlicensed.length > 0) {
  console.error(
    '::error::these runtime dependencies declare no licence, so their terms are unknown:',
  )
  for (const name of unlicensed) console.error(`  ${name}`)
}

if (disallowed.length > 0) {
  console.error(
    '::error::these runtime dependencies are not under a licence this project can ship:',
  )
  for (const name of disallowed) console.error(`  ${name}`)
}

if (unlicensed.length > 0 || disallowed.length > 0) {
  process.exit(1)
}

console.log(`${examined} runtime packages examined; every one is under a permissive licence`)
