import { describe, expect, it } from 'vitest'

import {
  formatTimestamp,
  formatUnits,
  groupDigits,
  humanise,
  percent,
  shortenDigest,
  shortenIdentifier,
} from './format'

describe('shortenDigest', () => {
  it('keeps the algorithm and both ends recognisable', () => {
    const digest = 'sha256:63d1905d8f4795d42df487baaa086acd26713e24c118663396ca72d68b0418ef'
    expect(shortenDigest(digest)).toBe('sha256:63d1905d…0418ef')
  })

  it('leaves a short digest alone rather than faking a truncation', () => {
    expect(shortenDigest('sha256:abc123')).toBe('sha256:abc123')
  })

  it('renders an absent digest as absence, not as an empty string', () => {
    // An empty string reads as "the value is blank"; an em dash reads as "there is no
    // value", which is the true statement and the one that prompts a question.
    expect(shortenDigest(undefined)).toBe('—')
  })
})

describe('shortenIdentifier', () => {
  it('truncates a contract identifier in the middle', () => {
    // Both ends are what people compare, so both are kept.
    expect(shortenIdentifier('CDB3EKMUGN5E7X2LMO56IB3A55EU4PPUYEF5EBVDKDV3LCLICJNSYKLW')).toBe(
      'CDB3EK…NSYKLW',
    )
  })

  it('leaves a value shorter than the budget untouched', () => {
    expect(shortenIdentifier('abc')).toBe('abc')
  })

  it('renders absence as absence', () => {
    expect(shortenIdentifier(undefined)).toBe('—')
  })
})

describe('formatUnits', () => {
  it('scales a seven-decimal token correctly, which is where dashboards go wrong', () => {
    // 1000 raw units of a 7-decimal token is 0.0001, not 1000.
    expect(formatUnits(1000n, 7)).toBe('0.0001')
  })

  it('handles whole amounts', () => {
    expect(formatUnits(10_000_000n, 7)).toBe('1')
  })

  it('trims trailing zeros without dropping significant digits', () => {
    expect(formatUnits(15_000_000n, 7)).toBe('1.5')
  })

  it('keeps the sign', () => {
    expect(formatUnits(-1000n, 7)).toBe('-0.0001')
  })

  it('handles zero', () => {
    expect(formatUnits(0n, 7)).toBe('0')
  })

  it('handles a zero-decimal token', () => {
    expect(formatUnits(123n, 0)).toBe('123')
  })

  it('accepts the string form an RPC result arrives in', () => {
    // scValToNative returns a bigint for i128, but a report or a JSON path may carry the
    // value as a string, and a string is what a bigint cannot silently round.
    expect(formatUnits('123', 2)).toBe('1.23')
  })

  it('does not throw on a value it cannot parse', () => {
    expect(formatUnits('not-a-number', 2)).toBe('not-a-number')
  })

  it('does not throw on a nonsense decimal count', () => {
    expect(formatUnits(10, -1)).toBe('10')
  })
})

describe('groupDigits', () => {
  it('groups the integer part', () => {
    expect(groupDigits('1234567')).toBe('1,234,567')
  })

  it('leaves the fraction alone', () => {
    expect(groupDigits('1234567.0001')).toBe('1,234,567.0001')
  })
})

describe('percent', () => {
  it('reports one decimal place', () => {
    expect(percent(49, 63)).toBe('77.8%')
  })

  it('refuses to divide by nothing', () => {
    // 0/0 has no answer, and "0.0%" would be a wrong one.
    expect(percent(0, 0)).toBe('—')
  })
})

describe('formatTimestamp', () => {
  it('renders an RFC 3339 instant the way a reader says it', () => {
    expect(formatTimestamp('2026-09-16T08:43:15Z')).toBe('2026-09-16 08:43:15 UTC')
  })

  it('falls back to the raw value rather than to "Invalid Date"', () => {
    expect(formatTimestamp('not a date')).toBe('not a date')
  })

  it('renders absence as absence', () => {
    expect(formatTimestamp(undefined)).toBe('—')
  })
})

describe('humanise', () => {
  it('turns an identifier into a label', () => {
    expect(humanise('pending-vector')).toBe('Pending vector')
    expect(humanise('PROFILE_ERROR')).toBe('Profile error')
  })
})
