/**
 * @file cms-main-auth-fail-tails.test.js
 * @description Coverage tails for cms/main.ts — the boot catch arm: when
 * the auth wiring itself rejects (firebase chunk failed, init threw) the
 * entry still mounts the login view so the sign-in surface can show the
 * real error inline instead of leaving a blank shell.
 */
import { describe, test, expect, jest } from '@jest/globals'
import { CMS_TAGS } from '@cms/tokens.js'
import { CMS_IDS } from '@core/tokens/ids/cms.js'
import { HTML_TAGS } from '@core/tokens/elements/html.js'

jest.unstable_mockModule('@core/firebase.js', () => ({
  onAuthChange: jest.fn(async () => {
    throw new Error('auth chunk died')
  }),
  signInWithGoogle: jest.fn(async () => ({ user: { uid: 'u1' } })),
  logoutUser: jest.fn(async () => {}),
  getDbInstance: jest.fn(async () => ({ db: true })),
}))

jest.unstable_mockModule('@core/utils/service-worker.js', () => ({
  dropStaleServiceWorkers: jest.fn(),
}))

const root = document.createElement(HTML_TAGS.DIV)

root.id = CMS_IDS.CMS_ROOT
document.body.appendChild(root)

await import('@cms/main.js')

describe('cms main — auth-fail tails', () => {
  test('a rejecting auth wire mounts the login view via the catch arm', async () => {
    await Promise.resolve()
    await Promise.resolve()

    expect(root.firstElementChild?.tagName.toLowerCase()).toBe(CMS_TAGS.VIEW_ADMIN_LOGIN)
  })
})
