/**
 * Validate a report against the specification's own schema — fetched, not copied.
 *
 * This application deliberately does not ship a copy of `report.schema.json`. A copied
 * schema is a second answer to "what is a valid report", and it goes stale exactly when it
 * matters: the day the specification changes. So the normative schema is fetched from the
 * URL its `$id` declares, which is the same URL the specification repository's own CI job
 * fetches it from to assert that the document served there is the document that claims it.
 *
 * The schema is not self-contained. It references `profile.schema.json` by relative URL, so
 * resolving it means fetching that too. That is a feature rather than an inconvenience:
 * fetching both is what demonstrates that both `$id`s resolve on the published site, which
 * is the property a consumer's validator depends on.
 */

import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import { REPORT_SCHEMA_URL } from '../constants'

export interface ValidationOutcome {
  valid: boolean
  /** One line per error, `path: message`, in the schema's own words. */
  errors: string[]
  /** Which documents were fetched to perform the check. */
  documents: string[]
}

export type ReportValidator = (value: unknown) => ValidationOutcome

interface JsonObject {
  [key: string]: unknown
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<JsonObject> {
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`could not fetch ${url}: HTTP ${response.status}`)
  }
  return (await response.json()) as JsonObject
}

/** Every `$ref` in a document, at any depth. */
function collectRefs(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, found)
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string') found.add(item)
      else collectRefs(item, found)
    }
  }
  return found
}

/**
 * Build a validator from the published schema.
 *
 * Throws when the schema or a document it references cannot be fetched. Failing loudly is
 * the point: an application that silently degrades to "unvalidated" would present an
 * unchecked report with the same confidence as a checked one, which is worse than showing
 * nothing.
 */
export async function loadReportValidator(
  fetchImpl: typeof fetch = fetch,
): Promise<ReportValidator> {
  const schema = await fetchJson(REPORT_SCHEMA_URL, fetchImpl)
  const documents = [REPORT_SCHEMA_URL]

  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)

  // A `$ref` without a fragment still needs its document registered; one with a fragment
  // needs the document it points into. Either way the target is the same document, so it
  // is fetched once.
  const external = new Set<string>()
  for (const ref of collectRefs(schema)) {
    if (ref.startsWith('#')) continue
    const base = REPORT_SCHEMA_URL.slice(0, REPORT_SCHEMA_URL.lastIndexOf('/') + 1)
    external.add(new URL(ref, base).href.split('#')[0] ?? '')
  }

  for (const url of external) {
    if (!url) continue
    const document = await fetchJson(url, fetchImpl)
    ajv.addSchema(document)
    documents.push(url)
  }

  const validate = ajv.compile(schema)

  return (value: unknown): ValidationOutcome => {
    const valid = validate(value) as boolean
    const errors = (validate.errors ?? []).map((error) => {
      const path = error.instancePath || '(root)'
      return `${path}: ${error.message ?? 'is invalid'}`
    })
    return { valid, errors, documents }
  }
}
