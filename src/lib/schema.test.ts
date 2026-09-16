/**
 * The validator builder, tested without the network.
 *
 * `loadReportValidator` takes its `fetch` as a parameter precisely so this is possible: the
 * tests supply documents and assert the behaviour that matters, which is that every external
 * `$ref` is discovered and registered before compilation. A registered schema that is never
 * fetched, or a `$ref` that is fetched but never registered, produces the same symptom --
 * "can't resolve reference" at validation time -- and that symptom is what these cases pin down.
 */

import { describe, expect, it, vi } from 'vitest'

import { REPORT_SCHEMA_URL } from '../constants'
import { loadReportValidator } from './schema'

const BASE = REPORT_SCHEMA_URL.slice(0, REPORT_SCHEMA_URL.lastIndexOf('/') + 1)
const PROFILE_URL = `${BASE}profile.schema.json`

/** The shape the published schema has: a self `$id`, and refs into the profile document. */
const REPORT_SCHEMA = {
  $id: REPORT_SCHEMA_URL,
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string' },
    // A bare relative ref: needs its document registered.
    profile: { $ref: 'profile.schema.json' },
    target: {
      // A ref with a fragment, nested inside an array, which is how the real schema uses it.
      oneOf: [{ $ref: 'profile.schema.json#/$defs/digest' }, { type: 'null' }],
    },
    // A local ref, which must not be fetched.
    vectors: { $ref: '#/$defs/vectors' },
  },
  $defs: { vectors: { type: 'object', properties: { count: { type: 'number' } } } },
}

const PROFILE_SCHEMA = {
  $id: PROFILE_URL,
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
  $defs: { digest: { type: 'string', pattern: '^sha256:' } },
}

function responder(documents: Record<string, unknown>, failing: string[] = []) {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (failing.includes(url)) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: () => 'text/plain' },
        json: async () => ({}),
        text: async () => 'Not Found',
      } as unknown as Response
    }
    const document = documents[url]
    if (document === undefined) {
      throw new Error(`the test made an unexpected request for ${url}`)
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => document,
      text: async () => JSON.stringify(document),
    } as unknown as Response
  })
}

describe('loadReportValidator fetches what the schema references', () => {
  it('fetches the report schema and the profile document it refs, exactly once each', async () => {
    const fetchImpl = responder({
      [REPORT_SCHEMA_URL]: REPORT_SCHEMA,
      [PROFILE_URL]: PROFILE_SCHEMA,
    })

    const validate = await loadReportValidator(fetchImpl)

    const requested = fetchImpl.mock.calls.map((call) => String(call[0]))
    expect(requested).toEqual([REPORT_SCHEMA_URL, PROFILE_URL])
    // Three refs point at the profile document; fetching it three times would be waste, and
    // registering it three times would be a duplicate-schema error.
    expect(requested.filter((url) => url === PROFILE_URL)).toHaveLength(1)

    const outcome = validate({ status: 'CONFORMANT', profile: { id: 'sep-41' } })
    expect(outcome.valid).toBe(true)
    expect(outcome.errors).toEqual([])
  })

  it('does not fetch a document for a local ref', async () => {
    const fetchImpl = responder({
      [REPORT_SCHEMA_URL]: REPORT_SCHEMA,
      [PROFILE_URL]: PROFILE_SCHEMA,
    })

    await loadReportValidator(fetchImpl)

    const requested = fetchImpl.mock.calls.map((call) => String(call[0]))
    expect(requested.some((url) => url.includes('#/'))).toBe(false)
  })

  it('reports which documents were read, so the claim can be audited later', async () => {
    const validate = await loadReportValidator(
      responder({ [REPORT_SCHEMA_URL]: REPORT_SCHEMA, [PROFILE_URL]: PROFILE_SCHEMA }),
    )

    expect(validate({ status: 'CONFORMANT' }).documents).toEqual([REPORT_SCHEMA_URL, PROFILE_URL])
  })

  it('sends an accept header, because the host serves more than json at that path', async () => {
    const fetchImpl = responder({
      [REPORT_SCHEMA_URL]: REPORT_SCHEMA,
      [PROFILE_URL]: PROFILE_SCHEMA,
    })

    await loadReportValidator(fetchImpl)

    const init = fetchImpl.mock.calls[0]?.[1]
    expect(init?.headers).toEqual({ accept: 'application/json' })
  })
})

describe("an invalid document produces the schema's own words, path first", () => {
  it('reports a missing required member against the root', async () => {
    const validate = await loadReportValidator(
      responder({ [REPORT_SCHEMA_URL]: REPORT_SCHEMA, [PROFILE_URL]: PROFILE_SCHEMA }),
    )

    const outcome = validate({})

    expect(outcome.valid).toBe(false)
    expect(outcome.errors).toHaveLength(1)
    expect(outcome.errors[0]).toMatch(/^\(root\): /)
    expect(outcome.errors[0]).toContain('status')
  })

  it('names the path of a nested violation rather than only the root', async () => {
    const validate = await loadReportValidator(
      responder({ [REPORT_SCHEMA_URL]: REPORT_SCHEMA, [PROFILE_URL]: PROFILE_SCHEMA }),
    )

    const outcome = validate({ status: 'CONFORMANT', profile: { id: 42 } })

    expect(outcome.valid).toBe(false)
    expect(outcome.errors.join(' ')).toContain('/profile/id')
  })

  it('accepts a value that satisfies the referenced profile definition', async () => {
    // This is the case that only passes if the profile document was actually registered:
    // the fragment refs into it, and ajv cannot resolve it otherwise.
    const validate = await loadReportValidator(
      responder({ [REPORT_SCHEMA_URL]: REPORT_SCHEMA, [PROFILE_URL]: PROFILE_SCHEMA }),
    )

    expect(validate({ status: 'CONFORMANT', target: 'sha256:abc' }).valid).toBe(true)
    expect(validate({ status: 'CONFORMANT', target: 'not-a-digest' }).valid).toBe(false)
    expect(validate({ status: 'CONFORMANT', target: null }).valid).toBe(true)
  })
})

describe('a schema that cannot be read fails loudly', () => {
  it('refuses to build a validator rather than degrading to "unvalidated"', async () => {
    // An application that silently skipped validation would present an unchecked report with
    // the same confidence as a checked one. Showing nothing is the better failure.
    await expect(loadReportValidator(responder({}, [REPORT_SCHEMA_URL]))).rejects.toThrow(
      `could not fetch ${REPORT_SCHEMA_URL}: HTTP 404`,
    )
  })

  it('fails when a referenced document is missing, not only when the root is', async () => {
    await expect(
      loadReportValidator(responder({ [REPORT_SCHEMA_URL]: REPORT_SCHEMA }, [PROFILE_URL])),
    ).rejects.toThrow(`could not fetch ${PROFILE_URL}: HTTP 404`)
  })

  it('surfaces a transport failure rather than treating it as an absent schema', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })

    await expect(loadReportValidator(fetchImpl)).rejects.toThrow(/Failed to fetch/)
  })
})
