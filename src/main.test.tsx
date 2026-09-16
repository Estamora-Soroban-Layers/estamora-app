/**
 * The entry point, which is three lines of mounting and one check that matters.
 *
 * That check is why this file exists: if `index.html` and `main.tsx` ever disagree about the
 * container id, the failure otherwise presents as a blank page with nothing in the console.
 * Throwing names the disagreement instead.
 */

import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('mounting', () => {
  it('renders the application into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')

    await waitFor(() => {
      expect(document.getElementById('root')?.childElementCount ?? 0).toBeGreaterThan(0)
    })
  })

  it('renders the shell, not just something', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')

    await waitFor(() => {
      expect(document.querySelector('.shell')).not.toBeNull()
    })
    // The disclaimer has to survive being mounted by StrictMode, which runs effects twice.
    expect(document.body.textContent).toMatch(/cannot produce a verdict/i)
  })
})

describe('a missing container is an error, not a blank page', () => {
  it('names the disagreement between index.html and the entry point', async () => {
    document.body.innerHTML = ''

    await expect(import('./main')).rejects.toThrow(/#root element is absent/)
  })
})
