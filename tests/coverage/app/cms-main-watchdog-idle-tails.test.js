/**
 * @file cms-main-watchdog-idle-tails.test.js
 * @description Coverage tails for cms/main.ts — the boot watchdog's armed
 * arm: when the auth listener never fires, the grace-window timer mounts
 * the login view instead of leaving an empty shell. Also exercises the
 * mountView idempotence arm via a second AUTH_CHANGED dispatch to the
 * same tag. The entry executes at import, so fake timers land before it.
 */
import { describe, test, expect, jest } from '@jest/globals'
import { CMS_EVENTS, CMS_TAGS } from '@cms/tokens.js'
import { CMS_IDS } from '@core/tokens/ids/cms.js'
import { HTML_TAGS } from '@core/tokens/elements/html.js'

jest.unstable_mockModule('@core/firebase.js', () => ({
  onAuthChange: jest.fn(async () => () => {}),
  signInWithGoogle: jest.fn(async () => ({ user: { uid: 'u1' } })),
  logoutUser: jest.fn(async () => {}),
  getDbInstance: jest.fn(async () => ({ db: true })),
}))

const dropStaleServiceWorkers = jest.fn()

jest.unstable_mockModule('@core/utils/service-worker.js', () => ({
  dropStaleServiceWorkers,
}))

jest.useFakeTimers()

const root = document.createElement(HTML_TAGS.DIV)

root.id = CMS_IDS.CMS_ROOT
document.body.appendChild(root)

await import('@cms/main.js')

describe('cms main — idle watchdog tails', () => {
  test('auth silence past the grace window mounts the login view', () => {
    jest.advanceTimersByTime(5000)

    expect(root.firstElementChild?.tagName.toLowerCase()).toBe(CMS_TAGS.VIEW_ADMIN_LOGIN)
  })

  test('an AUTH_CHANGED dispatch to the already-mounted tag is a no-op', () => {
    window.dispatchEvent(new CustomEvent(CMS_EVENTS.AUTH_CHANGED, { detail: null }))

    expect(root.firstElementChild?.tagName.toLowerCase()).toBe(CMS_TAGS.VIEW_ADMIN_LOGIN)
    expect(root.childElementCount).toBe(1)
  })
})
