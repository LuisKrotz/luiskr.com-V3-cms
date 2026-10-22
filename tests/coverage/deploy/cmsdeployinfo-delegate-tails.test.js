/**
 * @file cmsdeployinfo-delegate-tails.test.js
 * @description Split from coverage-tails-7.test.js — covers the "CmsDeployInfo delegate tails" describe.
 */
import { jest } from '@jest/globals'
import { CMS_TAGS } from '@cms/tokens.js'

import '@core/constants.js'

import '@cms/about/CmsAboutEditor.js'
import '@cms/portfolio/CmsPortfolioList.js'
import '@cms/projects/CmsProjectsList.js'
import '@cms/playground-editor/CmsPlaygroundEditor.js'
import '@cms/footer/CmsFooterEditor.js'
import '@cms/deploy-info/CmsDeployInfo.js'

globalThis.alert = jest.fn()

const flush = (ms = 80) => new Promise((r) => setTimeout(r, ms))

describe('CmsDeployInfo delegate tails', () => {
  test('all render delegates are callable', async () => {
    const el = document.createElement(CMS_TAGS.CMS_DEPLOY_INFO)

    document.body.appendChild(el)
    await flush()

    el.lighthouse = { urls: [{ url: 'u', scores: { performance: 0.5 } }] }
    el.coverage = { total: {} }
    el.bundle = { totals: {} }
    el.axe = { violations: [] }
    el.snyk = {}
    el.consoleScan = {}
    el.a11y = {}

    expect(typeof el._scoreClass(0.9)).toBe('string')
    expect(typeof el._pct(0.5)).toBe('string')
    expect(el._renderBuildMeta()).toBeTruthy()
    expect(el._renderLighthouse()).toBeTruthy()
    expect(el._renderScores({ performance: 0.9 })).toBeTruthy()
    expect(el._renderCoverage()).toBeTruthy()
    expect(el._renderBundle()).toBeTruthy()
    expect(el._renderAxe()).toBeTruthy()
    expect(el._renderA11y()).toBeTruthy()
    expect(el._renderSnyk()).toBeTruthy()
    expect(el._renderConsoleScan()).toBeTruthy()

    el.remove()
  })

  test('a11y report renders populated totals, rule rollup, and flagged routes', async () => {
    const el = document.createElement(CMS_TAGS.CMS_DEPLOY_INFO)

    document.body.appendChild(el)
    await flush()

    el.a11y = {
      engine: 'ibm-checker',
      pages: 12,
      totals: {
        violation: 1,
        potentialviolation: 2,
        recommendation: 3,
        manual: 4,
        gated: 2,
        errors: 1,
      },
      rules: [
        { level: 'violation', ruleId: 'r1', count: 1, pages: 1, message: 'm1' },
        { level: 'potentialviolation', ruleId: 'r2', count: 2, pages: 1, message: 'm2' },
        { level: 'recommendation', ruleId: 'r3', count: 3, pages: 2, message: 'm3' },
      ],
      routes: [
        {
          route: '/',
          violation: 1,
          potentialviolation: 1,
          recommendation: 1,
          gated: 1,
          error: 'scan failed mid-route',
        },
        { route: '/about/' },
      ],
    }

    const html = el._renderA11y()

    expect(html).toBeTruthy()

    el.remove()
  })
})
