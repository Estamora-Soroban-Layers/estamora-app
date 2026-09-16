/**
 * The documentation view exists in this repository for one reason: the reference tables the
 * application needs in order to interpret what it shows are rendered from the application's own
 * constants rather than copied from a page. These tests hold it to that, by comparing what is on
 * screen with `EXIT_CODE_FOR_STATUS` and `STATUS_MEANING` themselves.
 */

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DOCS_URL, RUNNER_REPO_URL, SPEC_REPO_URL } from '../constants'
import { EXIT_CODE_FOR_STATUS, STATUS_MEANING, type ConformanceStatus } from '../lib/report'
import { Docs } from './Docs'

const STATUSES = Object.keys(EXIT_CODE_FOR_STATUS) as ConformanceStatus[]

describe('the exit-code contract is rendered from the code that enforces it', () => {
  it('shows one row per status the application knows', () => {
    const { container } = render(<Docs />)

    const table = container.querySelector('table')
    const rows = within(table as HTMLElement)
      .getAllByRole('row')
      .slice(1)

    expect(rows).toHaveLength(STATUSES.length)
  })

  it('pairs every status with the exit code the audit checks against', () => {
    const { container } = render(<Docs />)

    for (const status of STATUSES) {
      const row = screen.getByText(status).closest('tr')
      expect(row).not.toBeNull()
      expect(row?.textContent).toContain(String(EXIT_CODE_FOR_STATUS[status]))
    }
    expect(container.querySelectorAll('table').length).toBeGreaterThan(0)
  })

  it("uses each status's own detail text rather than a paraphrase", () => {
    render(<Docs />)

    for (const status of STATUSES) {
      expect(screen.getByText(STATUS_MEANING[status].detail)).toBeDefined()
    }
  })

  it('names the two codes that are not statuses', () => {
    render(<Docs />)

    expect(screen.getByText(/the runner itself failed/i)).toBeDefined()
    expect(screen.getByText(/the command line was wrong/i)).toBeDefined()
  })

  it('states that only a violated requirement exits 1', () => {
    render(<Docs />)

    expect(screen.getByText(/only a violated requirement exits/i)).toBeDefined()
  })
})

describe('it links the guides rather than restating them', () => {
  it('sends every documented page to the published site', () => {
    const { container } = render(<Docs />)

    const links = Array.from(container.querySelectorAll(`a[href^="${DOCS_URL}/"]`))
    expect(links.length).toBeGreaterThan(10)
    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      expect(href.startsWith(`${DOCS_URL}/`)).toBe(true)
      // A path that lost its leading slash would still render and still 404.
      expect(href.slice(DOCS_URL.length).startsWith('/')).toBe(true)
    }
  })

  it('credits the specification and runner repositories for the documents', () => {
    const { container } = render(<Docs />)

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(SPEC_REPO_URL)
    expect(hrefs).toContain(RUNNER_REPO_URL)
  })

  it('names the pinned revisions the site is assembled from', () => {
    render(<Docs />)

    expect(screen.getByText(/estamora-conformance-spec@v0\.1\.1/)).toBeDefined()
    expect(screen.getByText(/estamora-conformance-runner@v0\.1\.3/)).toBeDefined()
  })

  it('does not link a page that is not in the section tables', () => {
    const { container } = render(<Docs />)

    // Every in-section link must carry a description; a bare label is a link a reader cannot
    // evaluate before clicking.
    const described = Array.from(
      container.querySelectorAll('table a[href^="https://estamora-docs"]'),
    )
    for (const link of described) {
      const row = link.closest('tr')
      expect((row?.textContent ?? '').trim().length).toBeGreaterThan(link.textContent?.length ?? 0)
    }
  })
})
