/**
 * The overview page renders claims about other repositories, so the assertions here are the
 * claims: that the pitch is played rather than downloaded, that the worked example names the
 * contract that was actually deployed, and that the page still says what it cannot do.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  DOCS_URL,
  EXAMPLE_CONTRACT,
  PITCH_POSTER_URL,
  PITCH_VIDEO_ARCHIVE_URL,
  PITCH_VIDEO_URL,
  RUNNER_REPO_URL,
  SPEC_REPO_URL,
} from '../constants'
import { shortenIdentifier } from '../lib/format'
import { Overview } from './Overview'

describe('the pitch is played in the page', () => {
  it('embeds a player pointed at the streamable copy, with a poster', () => {
    const { container } = render(<Overview />)

    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('poster')).toBe(PITCH_POSTER_URL)
    expect(video?.hasAttribute('controls')).toBe(true)
    // `metadata` rather than `auto`: the file is 15 MB and most readers came to read the page.
    expect(video?.getAttribute('preload')).toBe('metadata')

    const source = video?.querySelector('source')
    expect(source?.getAttribute('src')).toBe(PITCH_VIDEO_URL)
    // The type must be declared, or a browser will not attempt the file before sniffing it.
    expect(source?.getAttribute('type')).toBe('video/mp4')
  })

  it('offers the archival copy as a download for anyone who wants the file', () => {
    render(<Overview />)

    const download = screen.getAllByRole('link', { name: /download it instead/i })[0]
    expect(download?.getAttribute('href')).toBe(PITCH_VIDEO_ARCHIVE_URL)
  })

  it('names an accessible label, since a bare video element is announced as nothing', () => {
    const { container } = render(<Overview />)

    expect(container.querySelector('video')?.getAttribute('aria-label')).toMatch(/pitch/i)
  })

  it('plays inline, so iOS does not take it out of the page it explains', () => {
    const { container } = render(<Overview />)

    expect(container.querySelector('video')?.hasAttribute('playsinline')).toBe(true)
  })
})

describe('the worked example is the deployed contract, not a placeholder', () => {
  it('shows the identifier, network and the reading that was verified', () => {
    render(<Overview />)

    expect(screen.getByText(EXAMPLE_CONTRACT.id)).toBeDefined()
    expect(screen.getByText(EXAMPLE_CONTRACT.network)).toBeDefined()
    expect(
      screen.getByText(
        new RegExp(
          `${EXAMPLE_CONTRACT.reading.name} \\(${EXAMPLE_CONTRACT.reading.symbol}\\), ${EXAMPLE_CONTRACT.reading.decimals} decimals`,
        ),
      ),
    ).toBeDefined()
  })

  it('states the result is inconclusive rather than conformant', () => {
    // The most misreadable fact on the page: 63 checks and 0 failures, and still not a pass.
    render(<Overview />)

    expect(screen.getByText(/63 checks across all seven dimensions, 0 failed/i)).toBeDefined()
    expect(screen.getByText(/19 of its 20 vectors need seeded state/i)).toBeDefined()
  })

  it('shortens the identifier for display without altering it', () => {
    render(<Overview />)

    const short = shortenIdentifier(EXAMPLE_CONTRACT.id)
    expect(short.length).toBeLessThan(EXAMPLE_CONTRACT.id.length)
    expect(short.startsWith('CDB3EK')).toBe(true)
    expect(short.endsWith('CJNSYKLW'.slice(-6))).toBe(true)
    expect(screen.getByText(short)).toBeDefined()
  })
})

describe('the page keeps saying what it cannot do', () => {
  it('states that it cannot produce a verdict, in the body and the callout', () => {
    render(<Overview />)

    expect(
      screen.getByText(/this application cannot produce a verdict, and this is not a limitation/i),
    ).toBeDefined()
  })

  it('separates conformance from security, so a pass is not read as safety', () => {
    render(<Overview />)

    expect(screen.getByText(/conformance is not security/i)).toBeDefined()
    expect(screen.getByText(/a conformant contract can still be exploitable/i)).toBeDefined()
  })
})

describe('the pieces are attributed to the repositories that own them', () => {
  it('links the runner, the specification and the documentation site', () => {
    const { container } = render(<Overview />)

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(RUNNER_REPO_URL)
    expect(hrefs).toContain(SPEC_REPO_URL)
    expect(hrefs).toContain(DOCS_URL)
  })

  it('describes each view in the grid, so the reader knows what to open', () => {
    render(<Overview />)

    expect(screen.getByRole('heading', { name: /conformance report/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /live contract/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /documentation/i })).toBeDefined()
  })
})
