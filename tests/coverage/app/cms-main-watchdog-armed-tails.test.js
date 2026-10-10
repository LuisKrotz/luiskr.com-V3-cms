/**
 * @file cms-main-watchdog-armed-tails.test.js
 * @description Coverage tails for cms/main.ts — the watchdog's disarmed
 * arm: when the auth listener DID fire before the grace window ends,
 * `currentTag` is set and the timer leaves the mounted view alone. Also
 * covers the auth-callback user arm (dashboard mount) and the
 * AUTH_CHANGED detail arm (re-mount on sign-in).
 */
import { describe, test, expect, jest } from '@jest/globals'
import { CMS_EVENTS, CMS_TAGS } from '@cms/tokens.js'
import { CMS_IDS } from '@core/tokens/ids/cms.js'
import { HTML_TAGS } from '@core/tokens/elements/html.js'

jest.unstable_mockModule('@core/firebase.js', () => ({
  onAuthChange: jest.fn(async (cb) => {
    cb({ uid: 'u1' })

    return () => {}
  }),
  signInWithGoogle: jest.fn(async () => ({ user: { uid: 'u1' } })),
  logoutUser: jest.fn(async () => {}),
  getDbInstance: jest.fn(async () => ({ db: true })),
}))

jest.unstable_mockModule('@core/utils/service-worker.js', () => ({
  dropStaleServiceWorkers: jest.fn(),
}))

jest.useFakeTimers()

const root = document.createElement(HTML_TAGS.DIV)

root.id = CMS_IDS.CMS_ROOT
document.body.appendChild(root)

await import('@cms/main.js')

describe('cms main — armed watchdog tails', () => {
  test('a fired auth listener mounts the dashboard and the watchdog stays out', () => {
    jest.advanceTimersByTime(5000)

    expect(root.firstElementChild?.tagName.toLowerCase()).toBe(CMS_TAGS.VIEW_CMS_DASHBOARD)
  })

  test('an AUTH_CHANGED dispatch with detail re-mounts the dashboard tag', () => {
    window.dispatchEvent(new CustomEvent(CMS_EVENTS.AUTH_CHANGED, { detail: { uid: 'u2' } }))

    expect(root.firstElementChild?.tagName.toLowerCase()).toBe(CMS_TAGS.VIEW_CMS_DASHBOARD)
  })
})
