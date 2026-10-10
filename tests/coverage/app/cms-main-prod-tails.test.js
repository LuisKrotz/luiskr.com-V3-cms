/**
 * @file cms-main-prod-tails.test.js
 * @description Coverage tails for cms/main.ts — the `env.PROD` arm: a
 * production boot must NOT evict service workers (the dev-only stale-SW
 * cleanup would tear down the real precache in prod). Also exercises the
 * `!root` mountView arm — the entry is imported with no #cms element in
 * the DOM so every mountView call hits the early return.
 */
import { describe, test, expect, jest } from '@jest/globals'

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

globalThis.__VITE_ENV__ = { PROD: true }

await import('@cms/main.js')

describe('cms main — prod env tails', () => {
  test('a production boot keeps the service worker alive', () => {
    expect(dropStaleServiceWorkers).not.toHaveBeenCalled()
  })
})
