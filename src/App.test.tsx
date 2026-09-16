/**
 * Routing, and the two things about this shell that carry meaning: that the current section is
 * announced to a screen reader as the current page, and that the disclaimer is present on every
 * route rather than only on the page that happens to be visited first.
 */

import { render, screen, waitFor, act, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DOCS_URL, ORG_URL, RUNNER_REPO_URL, SPEC_REPO_URL } from './constants'
import { App } from './App'

beforeEach(() => {
  // jsdom does not implement scrolling and logs a "not implemented" error for it.
  window.scrollTo = vi.fn()
})

afterEach(() => {
  window.location.hash = ''
})

describe('the shell', () => {
  it('opens on the overview when the hash names nothing', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveProperty(
      'textContent',
      expect.stringMatching(/conformance evidence/i),
    )
  })

  it('lists every section with its description, so a reader can choose', () => {
    render(<App />)

    // Scoped to the nav on purpose: "Documentation" is also a footer link, and an unscoped query
    // cannot tell the section link from the one at the bottom of every page.
    const nav = screen.getByRole('navigation', { name: /sections/i })
    expect(nav.querySelectorAll('a')).toHaveLength(4)
    for (const label of ['Overview', 'Conformance report', 'Live contract', 'Documentation']) {
      expect(within(nav).getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('marks the current section as the current page for assistive technology', () => {
    render(<App />)

    const nav = screen.getByRole('navigation', { name: /sections/i })
    const current = within(nav).getByRole('link', { name: 'Overview' })
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(current.className).toContain('is-current')
    expect(
      within(nav).getByRole('link', { name: 'Documentation' }).getAttribute('aria-current'),
    ).toBe(null)
  })
})

describe('the hash decides the route', () => {
  it('renders the named section on a first visit to a deep link', () => {
    window.location.hash = '#/docs'

    render(<App />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Documentation')
    const nav = screen.getByRole('navigation', { name: /sections/i })
    expect(
      within(nav).getByRole('link', { name: 'Documentation' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('follows a hash change after the application is running', async () => {
    render(<App />)

    await act(async () => {
      window.location.hash = '#/docs'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Documentation')
    })
  })

  it('falls back to the overview for a hash that names no section', () => {
    window.location.hash = '#/not-a-section'

    render(<App />)

    const nav = screen.getByRole('navigation', { name: /sections/i })
    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe(
      'page',
    )
  })

  it('tolerates a hash written without the slash', () => {
    window.location.hash = '#docs'

    render(<App />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Documentation')
  })

  it('scrolls to the top when the route changes, so a new page does not open mid-scroll', async () => {
    render(<App />)
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>

    await act(async () => {
      window.location.hash = '#/docs'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    await waitFor(() => expect(scrollTo).toHaveBeenCalled())
  })
})

describe('the disclaimer is on every route', () => {
  it('says in the footer that the application cannot produce a verdict', () => {
    render(<App />)

    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toMatch(/cannot produce a verdict/i)
    expect(footer.textContent).toMatch(/conformance is not security/i)
  })

  it('links the documentation, the runner, the specification and the organization', () => {
    render(<App />)

    const footer = screen.getByRole('contentinfo')
    const hrefs = Array.from(footer.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([DOCS_URL, RUNNER_REPO_URL, SPEC_REPO_URL, ORG_URL])
  })
})
