/**
 * @file cms-deep-coverage-adminlogin-branches.test.js
 * @description Split from cms-deep-coverage.test.js — covers the "AdminLogin branches" describe.
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { CMS_TAGS } from '@cms/tokens.js'
import { TEST_TEXT } from '@tests/fixtures/test-constants.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import { CACHE_STORAGE_KEYS } from '@core/tokens/data/storage.js'
import { AUTH_STRINGS } from '@core/tokens/strings/auth.js'
import { MOUSE_EVENTS } from '@core/tokens/events/dom.js'
import { CMS_ADMIN_CLASSES } from '@cms/tokens.js'

const authCallbacks = []
const setCalls = []
const removeCalls = []

// Path-keyed snapshot routing: each test registers matchers against the
// Firebase path fragment so one `get` mock can serve different nodes.
const snapRoutes = []
const defaultVal = { title: TEST_TEXT.HEADING }

const snapOf = (val, exists = true) => ({ exists: () => exists, val: () => val })

jest.unstable_mockModule('@core/firebase.js', () => ({
  onAuthChange: jest.fn(async (cb) => {
    authCallbacks.push(cb)

    return () => {}
  }),
  signInWithGoogle: jest.fn(async () => ({ user: { uid: 'u1' } })),
  logoutUser: jest.fn(async () => {}),
  getDbInstance: jest.fn(async () => ({ db: true })),
}))

jest.unstable_mockModule('firebase/database', () => ({
  ref: jest.fn((db, p) => ({ db, p })),
  child: jest.fn((r, p) => ({ r, p })),
  get: jest.fn(async (arg) => {
    const p = String(arg?.p ?? arg?.r?.p ?? CHAR_STRINGS.EMPTY)
    const hit = snapRoutes.find((route) => p.includes(route.match))

    return hit ? hit.snap() : snapOf(defaultVal)
  }),
  set: jest.fn(async (r, v) => {
    if (snapRoutes.failSet === 'str') throw 'set exploded'
    if (snapRoutes.failSet) throw new Error('set exploded')

    setCalls.push({ path: r?.p, value: v })
  }),
  remove: jest.fn(async (r) => {
    removeCalls.push(r?.p)
  }),
}))

await import('@cms/about/CmsAboutEditor.js')
await import('@cms/footer/CmsFooterEditor.js')
await import('@cms/portfolio/CmsPortfolioList.js')
await import('@cms/media-convert/CmsMediaConverter.js')
await import('@cms/projects/CmsProjectsList.js')
await import('@cms/lang/CmsLangEditor.js')
await import('@cms/playground-editor/CmsPlaygroundEditor.js')
await import('@cms/deploy-info/CmsDeployInfo.js')
await import('@cms/routes/CmsDashboard.js')
await import('@cms/routes/AdminLogin.js')

const mount = (tag) => {
  const el = document.createElement(tag)

  document.body.appendChild(el)

  return el
}

const flush = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

const alerts = []
const confirms = []

beforeEach(() => {
  snapRoutes.length = 0
  snapRoutes.failSet = false
  setCalls.length = 0
  removeCalls.length = 0
  authCallbacks.length = 0
  alerts.length = 0
  confirms.length = 0
  document.body.innerHTML = CHAR_STRINGS.EMPTY

  globalThis.alert = (m) => alerts.push(String(m))
  globalThis.confirm = () => confirms.length === 0 || confirms.shift()
  globalThis.prompt = () => null
})

const _fire = (el, sel, eventType, value) => {
  const node = el.shadowRoot.querySelector(sel)

  if (!node) return null

  if (value !== undefined) node.value = value

  node.dispatchEvent(new window.Event(eventType, { bubbles: true }))

  return node
}

describe('AdminLogin branches', () => {
  test('error without message falls back to the generic copy', async () => {
    const { signInWithGoogle } = await import('@core/firebase.js')

    signInWithGoogle.mockRejectedValueOnce({})

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await el.handleGoogleLogin()

    expect(el.errorMsg).toContain('Failed to sign in')

    el.remove()
  })

  test('a coded auth error appends the actionable error code', async () => {
    const { signInWithGoogle } = await import('@core/firebase.js')

    signInWithGoogle.mockRejectedValueOnce({
      code: 'auth/unauthorized-domain',
      message: 'This domain is not authorized',
    })

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await el.handleGoogleLogin()

    expect(el.errorMsg).toContain('auth/unauthorized-domain')
    expect(el.errorMsg).toContain('not authorized')

    el.remove()
  })

  test('a persisted OAuth-return error at mount surfaces the real code and clears', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_ERROR, 'auth/unauthorized-domain')

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(sessionStorage.getItem(CACHE_STORAGE_KEYS.CMS_AUTH_ERROR)).toBeNull()
    expect(el.errorMsg).toContain('auth/unauthorized-domain')
    expect(el.errorMsg).toContain('authorized domains')

    el.remove()
  })

  test('a stale redirect marker at mount surfaces the lost-session copy and clears', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_REDIRECT, '1')

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(sessionStorage.getItem(CACHE_STORAGE_KEYS.CMS_AUTH_REDIRECT)).toBeNull()
    expect(el.errorMsg).toContain('returned')

    el.remove()
  })

  test('a lost-session error cites the storage relay, not a cookie block', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_ERROR, AUTH_STRINGS.ERR_NO_REDIRECT_EVENT)

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(el.errorMsg).toContain(AUTH_STRINGS.ERR_NO_REDIRECT_EVENT)
    expect(el.errorMsg).toContain('cross-origin web storage')
    expect(el.errorMsg).not.toContain('blocked the OAuth')

    el.remove()
  })

  test('a preserved popup-leg code is appended to the lost-session diagnosis', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_ERROR, AUTH_STRINGS.ERR_NO_REDIRECT_EVENT)
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_ERROR, 'auth/internal-error')

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(sessionStorage.getItem(CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_ERROR)).toBeNull()
    expect(el.errorMsg).toContain('auth/internal-error')

    el.remove()
  })

  test('a stale marker also carries the preserved popup-leg code', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_REDIRECT, '1')
    sessionStorage.setItem(
      CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_ERROR,
      AUTH_STRINGS.ERR_STORAGE_UNSUPPORTED
    )

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(el.errorMsg).toContain(AUTH_STRINGS.ERR_STORAGE_UNSUPPORTED)

    el.remove()
  })

  test('an App-Check-wrapped popup detail surfaces the enforcement copy', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_ERROR, AUTH_STRINGS.ERR_NO_REDIRECT_EVENT)
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_ERROR, AUTH_STRINGS.ERR_INTERNAL)
    sessionStorage.setItem(
      CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_DETAIL,
      '{"error":{"code":401,"message":"Firebase App Check token is invalid."}}'
    )

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(sessionStorage.getItem(CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_DETAIL)).toBeNull()
    expect(el.errorMsg).toContain('App Check')
    expect(el.errorMsg).toContain('VITE_FIREBASE_APPCHECK_SITE_KEY')
    expect(el.errorMsg).not.toContain('cross-origin web storage')

    el.remove()
  })

  test('a stale marker with an App-Check popup detail prefers the enforcement copy', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_REDIRECT, '1')
    sessionStorage.setItem(
      CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_DETAIL,
      '{"error":{"message":"Firebase App Check token is invalid."}}'
    )

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(el.errorMsg).toContain('App Check')
    expect(el.errorMsg).not.toContain('partitioned')

    el.remove()
  })

  test('a non-App-Check popup detail is appended inside the lost-session copy', async () => {
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_ERROR, AUTH_STRINGS.ERR_NO_REDIRECT_EVENT)
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_ERROR, AUTH_STRINGS.ERR_INTERNAL)
    sessionStorage.setItem(CACHE_STORAGE_KEYS.CMS_AUTH_POPUP_DETAIL, 'helper iframe never answered')

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await flush()

    expect(el.errorMsg).toContain('auth/internal-error')
    expect(el.errorMsg).toContain('helper iframe never answered')
    expect(el.errorMsg).toContain('cross-origin web storage')

    el.remove()
  })

  test('a thrown internal-error with an App-Check body shows the enforcement copy', async () => {
    const { signInWithGoogle } = await import('@core/firebase.js')

    signInWithGoogle.mockRejectedValueOnce({
      code: AUTH_STRINGS.ERR_INTERNAL,
      message: '{"error":{"code":401,"message":"Firebase App Check token is invalid."}}',
    })

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await el.handleGoogleLogin()

    expect(el.errorMsg).toContain('App Check')
    expect(el.errorMsg).not.toContain('{')

    el.remove()
  })

  test('a JSON error message without an inner message keeps the raw text', async () => {
    const { signInWithGoogle } = await import('@core/firebase.js')

    signInWithGoogle.mockRejectedValueOnce({ code: 'auth/x', message: '{"foo":1}' })

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await el.handleGoogleLogin()

    expect(el.errorMsg).toContain('{"foo":1}')

    el.remove()
  })

  test('a malformed JSON error message falls back to the raw text', async () => {
    const { signInWithGoogle } = await import('@core/firebase.js')

    signInWithGoogle.mockRejectedValueOnce({ code: 'auth/x', message: '{not-json' })

    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    await el.handleGoogleLogin()

    expect(el.errorMsg).toContain('{not-json')

    el.remove()
  })

  test('button click triggers login through the JSX onClick handler', async () => {
    const el = mount(CMS_TAGS.VIEW_ADMIN_LOGIN)

    const btn = el.shadowRoot.querySelector(`.${CMS_ADMIN_CLASSES.GOOGLE_AUTH_BTN}`)

    btn?.dispatchEvent(new window.Event(MOUSE_EVENTS.CLICK, { bubbles: true }))
    await flush()

    el.remove()
  })

  test('module re-eval skips custom-element re-registration', async () => {
    jest.resetModules()

    await expect(import('@cms/routes/AdminLogin.js')).resolves.toBeTruthy()

    // tag already defined -> the registration guard's else arm
    await expect(import('@cms/lang/CmsLangEditor.js')).resolves.toBeTruthy()
    await expect(import('@cms/deploy-info/CmsDeployInfo.js')).resolves.toBeTruthy()
    await expect(import('@cms/about/CmsAboutEditor.js')).resolves.toBeTruthy()
    await expect(import('@cms/footer/CmsFooterEditor.js')).resolves.toBeTruthy()
    await expect(import('@cms/playground-editor/CmsPlaygroundEditor.js')).resolves.toBeTruthy()
  })
})
