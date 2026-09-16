/**
 * Unmount whatever a test rendered before the next one starts.
 *
 * `@testing-library/react` registers this automatically only when the runner injects globals,
 * and this suite imports `describe`/`it` explicitly instead. Without it every render stays in the
 * document, so the second test in a file sees two copies of everything the first one rendered —
 * which presents as "found multiple elements" and looks like a query bug rather than a leak.
 */

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
