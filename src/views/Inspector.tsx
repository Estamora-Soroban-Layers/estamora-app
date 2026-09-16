import { useState } from 'react'

import { DOCS_URL, EXAMPLE_CONTRACT, SIMULATION_SOURCE, TESTNET_RPC_URL } from '../constants'
import { formatUnits, groupDigits, shortenIdentifier } from '../lib/format'
import {
  ContractReadError,
  argAddress,
  looksLikeAccountId,
  looksLikeContractId,
  readContract,
} from '../lib/rpc'

interface Reading {
  symbol: string
  name: string
  decimals: number
  latestLedger: number
}

interface BalanceReading {
  address: string
  raw: string
  formatted: string
  decimals: number
  latestLedger: number
}

type State =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'read'; reading: Reading }
  | { kind: 'failed'; message: string }

export function Inspector() {
  const [contractId, setContractId] = useState(EXAMPLE_CONTRACT.id)
  const [state, setState] = useState<State>({ kind: 'idle' })

  const [address, setAddress] = useState(SIMULATION_SOURCE)
  const [balance, setBalance] = useState<BalanceReading | null>(null)
  const [balanceProblem, setBalanceProblem] = useState<string | null>(null)
  const [balanceBusy, setBalanceBusy] = useState(false)

  const contractValid = looksLikeContractId(contractId)
  const addressValid = looksLikeAccountId(address)

  async function readInterface() {
    setState({ kind: 'reading' })
    try {
      // Sequential rather than concurrent: these are three small reads, and running them in
      // order means a failure names the method that failed instead of whichever of three
      // raced to reject first.
      const symbol = await readContract<string>(contractId.trim(), 'symbol')
      const name = await readContract<string>(contractId.trim(), 'name')
      const decimals = await readContract<number>(contractId.trim(), 'decimals')
      setState({
        kind: 'read',
        reading: {
          symbol: symbol.value,
          name: name.value,
          decimals: Number(decimals.value),
          latestLedger: decimals.latestLedger,
        },
      })
    } catch (problem) {
      setState({
        kind: 'failed',
        message: problem instanceof Error ? problem.message : String(problem),
      })
    }
  }

  async function readBalance() {
    setBalanceBusy(true)
    setBalanceProblem(null)
    setBalance(null)
    try {
      const decimals = await readContract<number>(contractId.trim(), 'decimals')
      const result = await readContract<bigint | string>(contractId.trim(), 'balance', [
        argAddress(address.trim()),
      ])
      const declaration = Number(decimals.value)
      setBalance({
        address: address.trim(),
        raw: String(result.value),
        formatted: formatUnits(result.value, declaration),
        decimals: declaration,
        latestLedger: result.latestLedger,
      })
    } catch (problem) {
      const message =
        problem instanceof ContractReadError
          ? problem.message
          : problem instanceof Error
            ? problem.message
            : String(problem)
      setBalanceProblem(message)
    } finally {
      setBalanceBusy(false)
    }
  }

  return (
    <article>
      <h1>Live contract</h1>
      <p className="lede">
        Read a deployed Soroban testnet contract over RPC. Every call here is a{' '}
        <strong>simulation</strong>: a transaction is built, offered to the node, and discarded.
        Nothing is signed and nothing is submitted.
      </p>

      <div className="callout">
        <strong>An interface is not evidence of behaviour.</strong> Reading <code>symbol</code>,{' '}
        <code>name</code> and <code>decimals</code> tells you a contract exists and answers to those
        names. It says nothing about whether it checks authorization, emits the right events, or
        refuses an overdraft. That is what <a href="#/report">a conformance report</a> is for.
      </div>

      <div className="card">
        <div className="row">
          <div className="grow">
            <label htmlFor="contract-id">Contract identifier</label>
            <input
              id="contract-id"
              type="text"
              value={contractId}
              spellCheck={false}
              onChange={(event) => setContractId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && contractValid) void readInterface()
              }}
            />
          </div>
          <button
            className="button-primary"
            onClick={() => void readInterface()}
            disabled={!contractValid || state.kind === 'reading'}
          >
            {state.kind === 'reading' ? 'Reading…' : 'Read interface'}
          </button>
        </div>
        {!contractValid && contractId.trim().length > 0 && (
          <p className="faint" style={{ margin: '8px 0 0', fontSize: 12 }}>
            A Soroban contract identifier is 56 characters beginning <code>C</code>.
          </p>
        )}
        <p className="faint" style={{ margin: '8px 0 0', fontSize: 12 }}>
          RPC: <code>{TESTNET_RPC_URL}</code>
        </p>
      </div>

      {state.kind === 'failed' && (
        <div className="finding finding-defect">
          <span className="tag tag-defect">Failed</span>
          <p className="finding-body">
            <strong>The read could not be completed.</strong> {state.message}
            <br />
            <span className="faint">
              This is an environment failure, not a statement about the contract. It is the same
              distinction the runner draws when it exits 4 rather than 1.
            </span>
          </p>
        </div>
      )}

      {state.kind === 'read' && (
        <section className="card">
          <div className="grid">
            <div>
              <h3>name</h3>
              <p className="reading">{state.reading.name}</p>
            </div>
            <div>
              <h3>symbol</h3>
              <p className="reading">{state.reading.symbol}</p>
            </div>
            <div>
              <h3>decimals</h3>
              <p className="reading">{state.reading.decimals}</p>
            </div>
          </div>
          <p className="faint" style={{ marginBottom: 0 }}>
            Read from <span className="mono">{shortenIdentifier(contractId.trim())}</span> at ledger{' '}
            {groupDigits(String(state.reading.latestLedger))}. These values are the contract&rsquo;s
            answer right now, not a cached copy.
          </p>
        </section>
      )}

      <h2>Balance</h2>
      <div className="card">
        <div className="row">
          <div className="grow">
            <label htmlFor="address">Account address</label>
            <input
              id="address"
              type="text"
              value={address}
              spellCheck={false}
              onChange={(event) => setAddress(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && addressValid) void readBalance()
              }}
            />
          </div>
          <button onClick={() => void readBalance()} disabled={!addressValid || balanceBusy}>
            {balanceBusy ? 'Reading…' : 'Read balance'}
          </button>
        </div>
      </div>

      {balanceProblem && (
        <div className="finding finding-defect">
          <span className="tag tag-defect">Failed</span>
          <p className="finding-body">{balanceProblem}</p>
        </div>
      )}

      {balance && (
        <section className="card">
          <h3>balance</h3>
          <p className="reading">
            {groupDigits(balance.formatted)}{' '}
            <span className="muted">{state.kind === 'read' ? state.reading.symbol : ''}</span>
          </p>
          <p className="muted" style={{ marginTop: 0 }}>
            Raw integer <code>{balance.raw}</code> scaled by {balance.decimals} decimals. The scaled
            form is shown because the raw value beside a symbol is how a dashboard overstates a
            balance by orders of magnitude.
          </p>
          <p className="faint" style={{ marginBottom: 0 }}>
            Read at ledger {groupDigits(String(balance.latestLedger))}.
          </p>
        </section>
      )}

      <h2>Why this cannot be a verdict</h2>
      <p className="lede">
        A verdict requires executing a profile&rsquo;s vectors: staging opening balances and
        allowances, presenting and withholding authorization, capturing emitted events and comparing
        them against the state they describe. A read-only simulation cannot arrange any of that, and
        it cannot write to the ledger it reads from — which is precisely why the worked example is{' '}
        <em>inconclusive</em> rather than conformant. Read{' '}
        <a href={`${DOCS_URL}/runner/ci-integration/`}>the CI guide</a> for what that means for a
        pipeline.
      </p>
    </article>
  )
}
