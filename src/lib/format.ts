/**
 * Formatting, kept pure so it can be tested without a DOM or a network.
 *
 * The rule these follow: never make a value look more precise or more complete than it is.
 * A digest shown in full is unreadable and a digest shown too short collides; a contract
 * identifier truncated in the middle still looks like an identifier. Each helper picks the
 * form that keeps the value recognisable and honest.
 */

/** `sha256:63d1905d…0418ef` — recognisable at both ends, with the length stated. */
export function shortenDigest(digest: string | undefined): string {
  if (!digest) return '—'
  const [algorithm, ...rest] = digest.split(':')
  const body = rest.join(':')
  if (!body || body.length <= 20) return digest
  return `${algorithm}:${body.slice(0, 8)}…${body.slice(-6)}`
}

/** A contract identifier, truncated in the middle: both ends are what people compare. */
export function shortenIdentifier(id: string | undefined, keep = 6): string {
  if (!id) return '—'
  if (id.length <= keep * 2 + 1) return id
  return `${id.slice(0, keep)}…${id.slice(-keep)}`
}

/** An RFC 3339 instant, as a reader would say it. Falls back to the raw value. */
export function formatTimestamp(value: string | undefined): string {
  if (!value) return '—'
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return value

  // `toISOString` always emits milliseconds, so a whole-second instant would render as
  // `08:43:15.000` -- three digits of precision the report never claimed. A report's
  // `generated_at` is second-precision, and showing more digits than the source has is the
  // same class of overstatement as showing fewer. The fraction is dropped rather than
  // rounded: less precise is honest, falsely precise is not.
  const [datePart, timePart = ''] = instant.toISOString().split('T')
  return `${datePart} ${timePart.slice(0, 8)} UTC`
}

/**
 * Scale a fixed-point integer by its declared decimals.
 *
 * `decimals` is not decoration: an amount of `1000` in a token with 7 decimals is
 * `0.0001`, and showing the raw integer beside a symbol is how a dashboard overstates a
 * balance by seven orders of magnitude. The output is a string because a JavaScript number
 * cannot hold an i128, and rounding one silently is the same error in a smaller font.
 */
export function formatUnits(value: bigint | number | string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) return String(value)

  let raw: bigint
  try {
    raw = typeof value === 'bigint' ? value : BigInt(value)
  } catch {
    return String(value)
  }

  const negative = raw < 0n
  const magnitude = negative ? -raw : raw
  const padded = magnitude.toString().padStart(decimals + 1, '0')
  const whole = padded.slice(0, padded.length - decimals)
  const fraction = decimals === 0 ? '' : padded.slice(padded.length - decimals)
  const trimmed = decimals === 0 ? '' : fraction.replace(/0+$/, '')

  const sign = negative ? '-' : ''
  return trimmed.length > 0 ? `${sign}${whole}.${trimmed}` : `${sign}${whole}`
}

/** Group an integer string for reading, without parsing it into a float. */
export function groupDigits(value: string): string {
  const [whole, fraction] = value.split('.')
  const grouped = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction ? `${grouped}.${fraction}` : grouped
}

/** A percentage of a total, to one decimal place, or `—` when there is no total. */
export function percent(part: number, total: number): string {
  if (total <= 0) return '—'
  return `${((part / total) * 100).toFixed(1)}%`
}

/** `pending-vector` / `PROFILE_ERROR` as a sentence-starting label. */
export function humanise(token: string): string {
  const spaced = token.replace(/[_-]+/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
