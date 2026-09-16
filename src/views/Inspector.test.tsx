/**
 * The live-contract view.
 *
 * `readContract` is the only thing mocked, and it is the network boundary: everything else —
 * the identifier validation that gates the buttons, the sequential ordering of the three reads,
 * the decimal scaling of a balance and the wording of a failure — is the real component doing
 * real work. The mocked module keeps its real `looksLikeContractId` and `looksLikeAccountId`,
 * because those are what decide whether a button is clickable at all.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EXAMPLE_CONTRACT, SIMULATION_SOURCE, TESTNET_RPC_URL } from '../constants'
import { ContractReadError } from '../lib/rpc'

const readContract = vi.fn()

vi.mock('../lib/rpc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/rpc')>()
  return {
    ...actual,
    readContract: (...args: unknown[]) => readContract(...args),
  }
})

import { Inspector } from './Inspector'

/** The three reads the interface button performs, in the order the component performs them. */
const INTERFACE_READINGS: Record<string, { value: unknown; latestLedger: number }> = {
  symbol: { value: 'MST', latestLedger: 1234567 },
  name: { value: 'Measurable Token', latestLedger: 1234567 },
  decimals: { value: 7n, latestLedger: 1234567 },
  balance: { value: 123450000000n, latestLedger: 1234568 },
}

beforeEach(() => {
  readContract.mockReset()
  readContract.mockImplementation(
    async (_id: string, method: string) =>
      INTERFACE_READINGS[method] ?? Promise.reject(new Error(`unexpected method ${method}`)),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the seeded state is a real, readable contract', () => {
  it('starts on the deployed example and says which endpoint it will use', () => {
    render(<Inspector />)

    expect((screen.getByLabelText(/contract identifier/i) as HTMLInputElement).value).toBe(
      EXAMPLE_CONTRACT.id,
    )
    expect(screen.getByText(TESTNET_RPC_URL)).toBeDefined()
  })

  it('leaves the read enabled, because a valid identifier is already present', () => {
    render(<Inspector />)

    expect(screen.getByRole('button', { name: /read interface/i })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('states that the calls are simulations, since the claim is load-bearing', () => {
    render(<Inspector />)

    expect(screen.getByText(/every call here is a/i)).toBeDefined()
    expect(screen.getByText(/nothing is signed and nothing is submitted/i)).toBeDefined()
  })

  it('warns that an interface read is not evidence of behaviour', () => {
    render(<Inspector />)

    expect(screen.getByText(/an interface is not evidence of behaviour/i)).toBeDefined()
  })
})

describe('reading the interface', () => {
  it('shows the three readings and the ledger they were read at', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read interface/i }))

    expect(await screen.findByText('Measurable Token')).toBeDefined()
    expect(screen.getByText('MST')).toBeDefined()
    expect(screen.getByText('7')).toBeDefined()
    // Grouped, because an ungrouped ledger sequence is unreadable at a glance.
    expect(screen.getByText(/1,234,567/)).toBeDefined()
  })

  it('asks for the three members in order, so a failure names one method', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read interface/i }))
    await screen.findByText('Measurable Token')

    expect(readContract.mock.calls.map((call) => call[1])).toEqual(['symbol', 'name', 'decimals'])
    expect(readContract.mock.calls[0]?.[0]).toBe(EXAMPLE_CONTRACT.id)
  })

  it('reads on Enter, because the identifier field is where a paste lands', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByLabelText(/contract identifier/i))
    await user.keyboard('{Enter}')

    expect(await screen.findByText('MST')).toBeDefined()
  })

  it('reports a failure as an environment failure rather than a contract defect', async () => {
    readContract.mockRejectedValue(
      new ContractReadError('symbol', 'the RPC endpoint could not be reached: connection refused'),
    )
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read interface/i }))

    expect(await screen.findByText(/the read could not be completed/i)).toBeDefined()
    expect(screen.getByText(/connection refused/)).toBeDefined()
    expect(
      screen.getByText(/this is an environment failure, not a statement about the contract/i),
    ).toBeDefined()
  })

  it('recovers when the endpoint comes back, without a reload', async () => {
    readContract.mockRejectedValueOnce(new ContractReadError('symbol', 'timeout'))
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read interface/i }))
    await screen.findByText(/the read could not be completed/i)

    readContract.mockImplementation(
      async (_id: string, method: string) => INTERFACE_READINGS[method]!,
    )
    await user.click(screen.getByRole('button', { name: /read interface/i }))

    expect(await screen.findByText('Measurable Token')).toBeDefined()
    expect(screen.queryByText(/the read could not be completed/i)).toBeNull()
  })
})

describe('an identifier is checked before a request is built', () => {
  it('disables the read and explains the shape when the identifier is not one', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    const field = screen.getByLabelText(/contract identifier/i)
    await user.clear(field)
    await user.type(field, 'not-a-contract')

    expect(screen.getByRole('button', { name: /read interface/i })).toHaveProperty('disabled', true)
    expect(screen.getByText(/56 characters beginning/i)).toBeDefined()
    expect(readContract).not.toHaveBeenCalled()
  })

  it('stays quiet while the field is empty, since an empty field is not an error yet', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.clear(screen.getByLabelText(/contract identifier/i))

    expect(screen.queryByText(/56 characters beginning/i)).toBeNull()
    expect(screen.getByRole('button', { name: /read interface/i })).toHaveProperty('disabled', true)
  })

  it('re-enables the read once a valid identifier is entered', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    const field = screen.getByLabelText(/contract identifier/i)
    await user.clear(field)
    await user.type(field, 'nope')
    await user.clear(field)
    await user.type(field, `  ${EXAMPLE_CONTRACT.id}  `)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /read interface/i })).toHaveProperty(
        'disabled',
        false,
      )
    })
  })
})

describe('reading a balance', () => {
  it('shows the raw integer beside the scaled form', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read balance/i }))

    expect(await screen.findByText('123450000000')).toBeDefined()
    expect(screen.getByText(/scaled by 7 decimals/i)).toBeDefined()
    expect(screen.getByText(/1,234,568/)).toBeDefined()
  })

  it('passes the account as an encoded argument, not as a string', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read balance/i }))
    await screen.findByText('123450000000')

    const balanceCall = readContract.mock.calls.find((call) => call[1] === 'balance')
    expect(balanceCall).toBeDefined()
    expect(balanceCall?.[2]).toHaveLength(1)
  })

  it('refuses to scale by a guess when decimals cannot be read', async () => {
    readContract.mockImplementation(async (_id: string, method: string) => {
      if (method === 'decimals') throw new ContractReadError('decimals', 'node unavailable')
      return INTERFACE_READINGS[method]!
    })
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByRole('button', { name: /read balance/i }))

    expect(await screen.findByText(/node unavailable/)).toBeDefined()
    // No reading is shown, because showing one scaled by an unknown exponent would be a lie.
    expect(screen.queryByText(/scaled by/)).toBeNull()
  })

  it('disables the read for an address that is not an account', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    const field = screen.getByLabelText(/account address/i)
    await user.clear(field)
    await user.type(field, EXAMPLE_CONTRACT.id)

    expect(screen.getByRole('button', { name: /read balance/i })).toHaveProperty('disabled', true)
  })

  it('accepts the seeded testnet account', () => {
    render(<Inspector />)

    expect((screen.getByLabelText(/account address/i) as HTMLInputElement).value).toBe(
      SIMULATION_SOURCE,
    )
    expect(screen.getByRole('button', { name: /read balance/i })).toHaveProperty('disabled', false)
  })

  it('reads a balance on Enter from the address field', async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.click(screen.getByLabelText(/account address/i))
    await user.keyboard('{Enter}')

    expect(await screen.findByText('123450000000')).toBeDefined()
  })
})

describe('why this cannot be a verdict', () => {
  it('explains the boundary and links the CI guide', () => {
    render(<Inspector />)

    expect(screen.getByText(/why this cannot be a verdict/i)).toBeDefined()
    expect(screen.getByRole('link', { name: /the CI guide/i }).getAttribute('href')).toMatch(
      /\/runner\/ci-integration\/$/,
    )
  })
})
