/**
 * @file cms-components-cmsdeployinfo.test.js
 * @description Split from cms-components.test.js — covers the "CmsDeployInfo" describe.
 */
import { describe, test, expect, jest } from '@jest/globals'
import { LOCALES, ROUTE_PREFIXES } from '@core/constants.js'
import { CMS_TAGS } from '@cms/tokens.js'
import { TEST_PROJECTS } from '@tests/fixtures/test-constants.js'
import { NAV_TEXT } from '@core/tokens/strings/text.js'
import { ROUTE_PATHS } from '@core/tokens/routes/paths.js'
import { APP_IDS } from '@core/tokens/ids/app.js'

// Path-keyed DB fixture — `get(child(ref(db), path))` resolves from here.
const DB = {
  [`translations/${LOCALES.EN}/projects`]: {
    [TEST_PROJECTS.METCHA]: { title: TEST_PROJECTS.METCHA_TITLE },
    [TEST_PROJECTS.CICB]: { title: 'CICB' },
  },
  [`translations/${LOCALES.EN}/projects/${TEST_PROJECTS.METCHA}`]: {
    title: TEST_PROJECTS.METCHA_TITLE,
    folder: 'metcha/',
    seo: { noIndex: false },
    cover: { src: 'cover', label: 'Metcha Cover', size: [1920, 1080], isVideo: false },
    sections: [{ type: 'media-text', title: 'Intro' }],
  },
  [`translations/${LOCALES.EN}/projects/${TEST_PROJECTS.CICB}`]: {
    title: 'CICB',
    folder: 'cicb/',
    cover: { src: 'cover', label: 'CICB Cover', size: [1920, 1080] },
    sections: [],
  },
  [`translations/${LOCALES.EN}/pages/about`]: {
    title: NAV_TEXT.ABOUT_ME,
    col1: ['Line one'],
    col2: ['Line two'],
    mentions: NAV_TEXT.SOME_MENTIONS,
    mention_items: [{ text: 'FWA', sub: '2024' }],
    profilePicture: 'https://cdn/avatar.png?s=200',
  },
  [`translations/${LOCALES.EN}/pages/portfolio`]: {
    title: 'Portfolio',
    portfoliolist: [
      {
        title: TEST_PROJECTS.METCHA_TITLE,
        link: `${ROUTE_PATHS.PORTFOLIO}${TEST_PROJECTS.METCHA}`,
      },
    ],
  },
  [`translations/${LOCALES.EN}/components/contact`]: {
    title: NAV_TEXT.CONTACT,
    line1: [{ link: 'mailto:x@x.com', description: 'Email' }],
    line2: [],
  },
  [`translations/${LOCALES.EN}/components/legal-footer`]: {
    links: [{ page: ROUTE_PREFIXES.PRIVACY, link: ROUTE_PATHS.PRIVACY_POLICY }],
  },
  [`translations/${LOCALES.EN}/components/related`]: {
    title: NAV_TEXT.RELATED,
    note: 'note',
    socials: [],
  },
}

const setCalls = []
const removeCalls = []
const getCalls = []

jest.unstable_mockModule('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ marker: APP_IDS.APP })),
}))

jest.unstable_mockModule('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ marker: 'auth' })),
}))

jest.unstable_mockModule('firebase/database', () => ({
  getDatabase: jest.fn(() => ({ marker: 'db' })),
  ref: jest.fn((_db, p) => ({ path: p || '' })),
  child: jest.fn((r, p) => ({ path: `${r.path || ''}${r.path ? '/' : ''}${p}` })),
  get: jest.fn(async (r) => {
    getCalls.push(r.path)
    const val = DB[r.path]
    return {
      exists: () => val !== undefined && val !== null,
      val: () => val,
    }
  }),
  set: jest.fn(async (r, data) => {
    setCalls.push({ path: r.path, data })
  }),
  remove: jest.fn(async (r) => {
    removeCalls.push(r.path)
  }),
}))

// Side-effect imports: each module registers its custom element on import.
await import('@cms/projects/CmsProjectsList.js')
await import('@cms/about/CmsAboutEditor.js')
await import('@cms/footer/CmsFooterEditor.js')
await import('@cms/portfolio/CmsPortfolioList.js')
await import('@cms/media-convert/CmsMediaConverter.js')
await import('@cms/deploy-info/CmsDeployInfo.js')

const mount = async (El) => {
  const el = document.createElement(El)
  document.body.appendChild(el)
  await new Promise((r) => setTimeout(r, 60))
  return el
}

describe('CmsDeployInfo', () => {
  test('renders missing state when no deploy-info bundle exists', async () => {
    document.body.innerHTML = ''
    const orig = globalThis.fetch
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => null }))

    const el = await mount(CMS_TAGS.CMS_DEPLOY_INFO)
    expect(el._fetchState).toBe('missing')

    globalThis.fetch = orig
  })

  test('renders the full report when the bundle exists', async () => {
    document.body.innerHTML = ''
    const index = {
      generatedAt: 'now',
      commit: 'abc123',
      files: {
        lighthouse: 'lighthouse-summary.json',
        coverage: 'coverage-summary.json',
        bundle: 'bundle-stats.json',
        axe: 'axe-report.json',
        a11y: 'a11y-summary.json',
        snyk: 'snyk-report.json',
        consoleScan: 'console-scan.json',
      },
    }
    const payloads = {
      'lighthouse-summary.json': { urls: [{ url: '/', scores: { performance: 0.95 } }] },
      'coverage-summary.json': {
        total: { lines: { covered: 9, total: 10, pct: 90 } },
        modules: {
          website: { lines: { covered: 9, total: 10, pct: 90 } },
          core: {},
        },
      },
      'bundle-stats.json': {
        generatedAt: 'now',
        totals: {
          js: { files: 213, bytes: 12833358, unminified: 17613678, gzip: 3212416, brotli: 2671006 },
          css: { files: 4, bytes: 67263, unminified: 101158, gzip: 15066, brotli: 13305 },
          html: { files: 17926, bytes: 1023193074, gzip: 179413429, brotli: 146712747 },
          wasm: { files: 42, bytes: 580051 },
          assets: { files: 7793, bytes: 262611919 },
        },
        tiers: [
          {
            name: 'es2026',
            js: {
              files: 213,
              bytes: 12833358,
              unminified: 17613678,
              gzip: 3212416,
              brotli: 2671006,
            },
            css: { files: 4, bytes: 67263, unminified: 101158, gzip: 15066, brotli: 13305 },
            misc: { files: 0, bytes: 0 },
            largest: [{ file: 'v/es2026/assets/js/elk-x.js', bytes: 1497225 }],
          },
        ],
        wasm: [{ crate: 'burn', files: 4, wasmBytes: 53891, jsBytes: 34847, jsFiles: 1 }],
        html: {
          files: 17926,
          bytes: 1023193074,
          byDir: [{ dir: 'docs', files: 6922, bytes: 303395746 }],
        },
        largest: [{ file: 'v/ie/assets/js/index-x.js', bytes: 9755412 }],
      },
      'axe-report.json': { totals: { violations: 0 }, surfaces: [] },
      'a11y-summary.json': {
        engine: 'accessibility-checker (IBM Equal Access)',
        pages: 3,
        totals: {
          violation: 1,
          potentialviolation: 4,
          recommendation: 2,
          manual: 1,
          gated: 3,
          errors: 1,
        },
        rules: [
          {
            level: 'violation',
            ruleId: 'text_contrast_sufficient',
            count: 1,
            pages: 1,
            message: 'contrast',
          },
          { level: 'potentialviolation', ruleId: 'style_focus_visible', count: 4, pages: 2 },
          { level: 'recommendation', ruleId: 'aria_role_redundant', count: 2, pages: 2 },
        ],
        routes: [
          { route: '/about/', violation: 1, gated: 3 },
          { route: '/contact/', potentialviolation: 4, error: 'boom' },
          { route: '/docs/', recommendation: 2 },
        ],
      },
      'snyk-report.json': { scanner: 'snyk', totals: { total: 0 }, vulnerabilities: [] },
      'console-scan.json': { totals: { callsites: 5 }, violations: [] },
    }
    const orig = globalThis.fetch
    globalThis.fetch = jest.fn(async (url) => {
      const key = url.split('/').pop()
      if (key === 'index.json') return { ok: true, json: async () => index }
      return { ok: true, json: async () => payloads[key] || null }
    })

    const el = await mount(CMS_TAGS.CMS_DEPLOY_INFO)
    expect(el._fetchState).toBe('ready')
    expect(el.axe).not.toBeNull()
    expect(el.a11y).not.toBeNull()
    expect(el.bundle).not.toBeNull()
    expect(el.snyk).not.toBeNull()
    expect(el.consoleScan).not.toBeNull()
    expect(el.shadowRoot.innerHTML).toContain('Last build')
    expect(el.shadowRoot.innerHTML).toContain('lighthouse-summary.json')
    expect(el.shadowRoot.innerHTML).toContain('Per module')
    expect(el.shadowRoot.innerHTML).toContain('Accessibility Scan')
    expect(el.shadowRoot.innerHTML).toContain('IBM Equal Access')
    expect(el.shadowRoot.innerHTML).toContain('text_contrast_sufficient')
    expect(el.shadowRoot.innerHTML).toContain('gate FAILED')
    expect(el.shadowRoot.innerHTML).toContain('Bundle')
    expect(el.shadowRoot.innerHTML).toContain('Dependency Scan')
    expect(el.shadowRoot.innerHTML).toContain('Console Usage Scan')

    globalThis.fetch = orig
  })

  test('renders the a11y hints when the scan is absent or fully clean', async () => {
    document.body.innerHTML = ''
    const index = {
      generatedAt: 'now',
      files: {},
    }
    const orig = globalThis.fetch
    globalThis.fetch = jest.fn(async (url) => {
      const key = url.split('/').pop()
      if (key === 'index.json') return { ok: true, json: async () => index }
      return { ok: true, json: async () => null }
    })

    const el = await mount(CMS_TAGS.CMS_DEPLOY_INFO)
    expect(el._fetchState).toBe('ready')
    expect(el.a11y).toBeNull()
    expect(el.shadowRoot.innerHTML).toContain('No IBM accessibility scan')

    globalThis.fetch = jest.fn(async (url) => {
      const key = url.split('/').pop()
      if (key === 'index.json')
        return { ok: true, json: async () => ({ files: { a11y: 'a11y-summary.json' } }) }
      if (key === 'a11y-summary.json')
        return {
          ok: true,
          json: async () => ({ engine: 'e', pages: 2, totals: {}, rules: [], routes: [] }),
        }
      return { ok: true, json: async () => null }
    })

    const clean = await mount(CMS_TAGS.CMS_DEPLOY_INFO)
    expect(clean.shadowRoot.innerHTML).toContain('Zero findings on all scanned routes')
    expect(clean.shadowRoot.innerHTML).toContain('Every scanned route is clean')
    expect(clean.shadowRoot.innerHTML).toContain('gate passed')

    globalThis.fetch = orig
  })
})
