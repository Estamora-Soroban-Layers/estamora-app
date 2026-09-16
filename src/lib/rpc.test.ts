// @vitest-environment node
/**
 * The read path, exercised against the real Stellar SDK with only the network stubbed.
 *
 * Stubbing `fetch` rather than the SDK is the point: the encoding of arguments, the building of
 * the transaction, the decoding of the returned `ScVal` and the classification of a node's
 * error are all real code doing real work. A test that mocked `readContract` would prove only
 * that the mock was called.
 *
 * Pinned to the `node` environment deliberately, and this is the one file in the suite that is.
 * The SDK's XDR layer validates its inputs with `value instanceof Uint8Array`, and jsdom supplies
 * its own realm's `Uint8Array` while the SDK is loaded as an external Node module. Across those
 * two realms that check is false for a value that is a perfectly good `Uint8Array`, so every
 * serialisation fails with `functionName: expected Uint8Array`. A browser has one realm, which is
 * why the deployed application performs the same read successfully. `rpc.ts` touches no DOM, so
 * running it in `node` tests the code that ships rather than a realm artefact.
 */

import { Address, SorobanDataBuilder, nativeToScVal, xdr } from '@stellar/stellar-sdk'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXAMPLE_CONTRACT, SIMULATION_SOURCE, TESTNET_RPC_URL } from '../constants'
import {
  ContractReadError,
  argAddress,
  looksLikeAccountId,
  looksLikeContractId,
  readContract,
} from './rpc'

/** A `Response`-shaped object, because jsdom does not provide one. */
function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Internal Server Error',
    headers: { get: () => 'application/json' },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response
}

/**
 * A JSON-RPC success envelope, in the shape a current node returns.
 *
 * The return value is `results[0].xdr`, and that detail is worth stating: the older single
 * `result.retval` field is not read by this SDK version at all, so a stub written that way
 * produces a simulation with no value and the test passes for the wrong reason.
 */
function simulation(value: string | number | bigint, latestLedger = 4242): unknown {
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      latestLedger,
      events: [],
      minResourceFee: '100',
      transactionData: new SorobanDataBuilder().build().toXDR('base64'),
      results: [{ auth: [], xdr: nativeToScVal(value).toXDR('base64') }],
    },
  }
}

/** The same envelope with no result rows, which is how a node answers a read it cannot settle. */
function simulationWithoutValue(latestLedger = 4242): unknown {
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      latestLedger,
      events: [],
      minResourceFee: '100',
      transactionData: new SorobanDataBuilder().build().toXDR('base64'),
      results: [],
    },
  }
}

function stubFetch(implementation: (url: string, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(implementation)
  vi.stubGlobal('fetch', mock)
  return mock
}

/**
 * Await a read that is expected to fail, and hand back the failure.
 *
 * `.catch()` would widen the result to a union of the outcome and the error, which then has to
 * be narrowed at every assertion. A helper that rejects when the call unexpectedly succeeds is
 * both narrower and a stronger assertion: a test that says "this fails" now fails if it does not.
 */
async function failureOf(promise: Promise<unknown>): Promise<ContractReadError> {
  try {
    await promise
  } catch (problem) {
    return problem as ContractReadError
  }
  throw new Error('expected the read to fail, but it resolved')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('readContract decodes what the node returned', () => {
  it('returns a string reading and the ledger it was read at', async () => {
    stubFetch(async () => jsonResponse(simulation('MST', 123456)))

    const outcome = await readContract<string>(EXAMPLE_CONTRACT.id, 'symbol')

    expect(outcome.value).toBe('MST')
    expect(outcome.latestLedger).toBe(123456)
  })

  it('returns an integer reading as a bigint, which the caller narrows', async () => {
    // Worth pinning because it is not what the type parameter suggests: an integer arm decodes
    // to a `bigint`, always, even for `decimals`. That is why `Inspector.tsx` writes
    // `Number(decimals.value)` rather than passing the reading straight through.
    stubFetch(async () => jsonResponse(simulation(7)))

    const outcome = await readContract<number>(EXAMPLE_CONTRACT.id, 'decimals')

    expect(outcome.value).toBe(7n)
    expect(Number(outcome.value)).toBe(7)
    expect(typeof outcome.value).toBe('bigint')
  })

  it('decodes an i128 without losing precision, which a float would', async () => {
    // Balances are i128. A decoder that went through `Number` would silently corrupt any
    // balance above 2^53, which is most of them once decimals are applied.
    const large = 123456789012345678901234567890n
    stubFetch(async () => jsonResponse(simulation(large)))

    const outcome = await readContract<bigint>(EXAMPLE_CONTRACT.id, 'balance', [
      argAddress(SIMULATION_SOURCE),
    ])

    expect(outcome.value).toBe(large)
  })

  it('sends a simulateTransaction request to the testnet endpoint, not a submit', async () => {
    const mock = stubFetch(async () => jsonResponse(simulation('MST')))

    await readContract<string>(EXAMPLE_CONTRACT.id, 'name')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    // The SDK normalises the endpoint to a directory, so the request goes to the same host
    // with a trailing slash rather than to the constant verbatim.
    expect(url).toBe(`${TESTNET_RPC_URL}/`)
    expect(init.method).toBe('POST')

    const body = JSON.parse(String(init.body)) as {
      method: string
      params: { transaction: string; resourceConfig?: unknown }
    }
    // Only `simulateTransaction` is ever called from this repository: the module's central claim
    // is that nothing here can change state, and this is where that claim is enforced.
    expect(body.method).toBe('simulateTransaction')
    expect(body.method).not.toBe('sendTransaction')
    expect(typeof body.params.transaction).toBe('string')
  })
})

describe('a failure is classified, not reported as a result', () => {
  it('reports an unreachable endpoint as an environment failure', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    const problem = await failureOf(readContract<string>(EXAMPLE_CONTRACT.id, 'symbol'))

    expect(problem).toBeInstanceOf(ContractReadError)
    expect(problem.method).toBe('symbol')
    expect(problem.name).toBe('ContractReadError')
    expect(problem.message).toContain('the RPC endpoint could not be reached')
    expect(problem.message).toContain('Failed to fetch')
  })

  it('still classifies a rejection that carried no message at all', async () => {
    // The SDK re-wraps a thrown non-Error, so what arrives here can be an error with nothing
    // in it. The classification must not depend on the message being useful.
    stubFetch(async () => {
      throw 'a rejection with no .message'
    })

    const problem = await failureOf(readContract<string>(EXAMPLE_CONTRACT.id, 'symbol'))

    expect(problem).toBeInstanceOf(ContractReadError)
    expect(problem.method).toBe('symbol')
    expect(problem.message.startsWith('the RPC endpoint could not be reached')).toBe(true)
  })

  it("repeats the node's own words when the simulation is refused", async () => {
    stubFetch(async () =>
      jsonResponse({
        jsonrpc: '2.0',
        id: 1,
        result: { latestLedger: 9, events: [], error: 'HostError: Error(Contract, #1)' },
      }),
    )

    const problem = await failureOf(readContract<string>(EXAMPLE_CONTRACT.id, 'symbol'))

    expect(problem).toBeInstanceOf(ContractReadError)
    expect(problem.message).toBe('HostError: Error(Contract, #1)')
  })

  it('refuses to invent a value when the simulation returns none', async () => {
    stubFetch(async () => jsonResponse(simulationWithoutValue()))

    await expect(readContract<string>(EXAMPLE_CONTRACT.id, 'symbol')).rejects.toThrow(
      /the simulation returned no value/,
    )
  })

  it('propagates an http failure rather than decoding a body that is not a result', async () => {
    stubFetch(async () => jsonResponse({ message: 'nope' }, 503))

    await expect(readContract<string>(EXAMPLE_CONTRACT.id, 'symbol')).rejects.toBeInstanceOf(
      ContractReadError,
    )
  })
})

describe('identifiers are checked before a request is built', () => {
  it('accepts the deployed contract identifier', () => {
    expect(looksLikeContractId(EXAMPLE_CONTRACT.id)).toBe(true)
  })

  it('tolerates surrounding whitespace, because a paste usually has some', () => {
    expect(looksLikeContractId(`  ${EXAMPLE_CONTRACT.id}\n`)).toBe(true)
  })

  it.each([
    ['a lowercase identifier', EXAMPLE_CONTRACT.id.toLowerCase()],
    ['one character short', EXAMPLE_CONTRACT.id.slice(0, 55)],
    ['one character long', `${EXAMPLE_CONTRACT.id}X`],
    ['an account address', SIMULATION_SOURCE],
    ['an empty string', ''],
    ['prose', 'my contract'],
  ])('rejects %s', (_case, value) => {
    expect(looksLikeContractId(value)).toBe(false)
  })

  it('rejects a strkey with a character outside the base32 alphabet', () => {
    expect(looksLikeContractId(`C${'0'.repeat(55)}`)).toBe(false)
  })

  it('distinguishes an account address from a contract, since a call needs the right one', () => {
    expect(looksLikeAccountId(SIMULATION_SOURCE)).toBe(true)
    expect(looksLikeAccountId(EXAMPLE_CONTRACT.id)).toBe(false)
    expect(looksLikeAccountId(`  ${SIMULATION_SOURCE} `)).toBe(true)
    expect(looksLikeAccountId('G')).toBe(false)
  })
})

describe('argument encoding', () => {
  it('encodes an address as an ScVal the contract can read', () => {
    const encoded = argAddress(SIMULATION_SOURCE)

    // The round trip is the assertion that matters: the value that reaches the contract is the
    // address that was asked for. An address passed through unchanged would be a string ScVal,
    // and a contract expecting an `Address` would reject it.
    expect(encoded).toBeInstanceOf(xdr.ScVal)
    expect(Address.fromScVal(encoded).toString()).toBe(SIMULATION_SOURCE)
  })

  it('is not a plain string ScVal, which a contract would refuse', () => {
    const encoded = argAddress(SIMULATION_SOURCE)

    expect(encoded).not.toEqual(nativeToScVal(SIMULATION_SOURCE))
  })
})
