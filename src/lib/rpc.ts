/**
 * Read-only contract reads over Soroban RPC.
 *
 * This application cannot produce a verdict, and the boundary is enforced here rather than
 * merely stated. Everything in this module *simulates*: a simulation is built, sent to the
 * node, and discarded. Nothing is signed and nothing is submitted, so no state can change
 * and no secret exists to leak. There is deliberately no code path in this repository that
 * submits a transaction, which is what makes the claim on the landing page true rather than
 * aspirational.
 *
 * A simulation still needs a source account, because a transaction has to be built against
 * one. It does not need that account's key. `SIMULATION_SOURCE` is a real testnet account so
 * the transaction is built the way the network would build it.
 */

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk'

import { SIMULATION_SOURCE, TESTNET_PASSPHRASE, TESTNET_RPC_URL } from '../constants'

/** A read that could not be performed, with the node's own words where there were any. */
export class ContractReadError extends Error {
  readonly method: string

  constructor(method: string, message: string) {
    super(message)
    this.name = 'ContractReadError'
    this.method = method
  }
}

export interface ReadOutcome<T> {
  value: T
  /** The ledger sequence the simulation ran against, so a reading can be dated. */
  latestLedger: number
}

function server(): rpc.Server {
  return new rpc.Server(TESTNET_RPC_URL, { allowHttp: false })
}

/**
 * Simulate a read-only call and decode its result.
 *
 * `args` are `xdr.ScVal`s, built by the `arg*` helpers below so that call sites do not each
 * invent their own encoding. An incorrectly encoded argument is the kind of mistake that
 * returns a plausible-looking wrong answer, which is worse than an error.
 */
export async function readContract<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<ReadOutcome<T>> {
  const node = server()
  const contract = new Contract(contractId)

  const transaction = new TransactionBuilder(new Account(SIMULATION_SOURCE, '0'), {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  let simulated: Awaited<ReturnType<typeof node.simulateTransaction>>
  try {
    simulated = await node.simulateTransaction(transaction)
  } catch (problem) {
    // A refused connection or a timeout says nothing about the contract. It is reported as
    // an environment failure for the same reason the runner exits 4 for one: a network
    // fault must never look like a result.
    const detail = problem instanceof Error ? problem.message : String(problem)
    throw new ContractReadError(method, `the RPC endpoint could not be reached: ${detail}`)
  }

  if (rpc.Api.isSimulationError(simulated)) {
    throw new ContractReadError(method, simulated.error)
  }

  const retval = simulated.result?.retval
  if (!retval) {
    throw new ContractReadError(method, 'the simulation returned no value')
  }

  return {
    value: scValToNative(retval) as T,
    latestLedger: simulated.latestLedger,
  }
}

/** An address argument. */
export function argAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal()
}

/** Whether a string looks like a contract identifier this application can read. */
export function looksLikeContractId(value: string): boolean {
  const trimmed = value.trim()
  // A Soroban contract identifier is a 56-character strkey beginning `C`.
  return /^C[A-Z2-7]{55}$/.test(trimmed)
}

/** Whether a string looks like a Stellar account address. */
export function looksLikeAccountId(value: string): boolean {
  const trimmed = value.trim()
  return /^G[A-Z2-7]{55}$/.test(trimmed)
}
