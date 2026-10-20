/**
 * @file cmsdeployinfo-tails.test.js
 * @description Split from coverage-tails-3.test.js — covers the "CmsDeployInfo tails" describe.
 */
import _router from '@core/router/router.js'
import { TEST_TEXT } from '@tests/fixtures/test-constants.js'
import { CMS_TAGS } from '@cms/tokens.js'
import '@website/components/feedback/StatsHud.js'
import '@website/components/home/AwardsMentions.js'
import '@website/components/legal/Footer.js'

import '@website/components/home/HomeMosaic.js'
import '@website/components/dialogs/LangDialog.js'
import '@website/components/dialogs/PreferencesModal.js'
import '@website/components/carousel/AwardsCarousel.js'
import '@website/views/home/Home.js'
import '@website/views/legal/Legal.js'

const flush = (ms = 80) => new Promise((r) => setTimeout(r, ms))

describe('CmsDeployInfo tails', () => {
  test('renders empty and populated lighthouse tables', async () => {
    await import('@cms/deploy-info/CmsDeployInfo.js')

    const el = document.createElement(CMS_TAGS.CMS_DEPLOY_INFO)

    document.body.appendChild(el)
    await flush()

    el.lighthouse = { urls: [] }

    expect(el._renderLighthouse().className).toBeTruthy()

    el.lighthouse = {
      urls: [
        { url: TEST_TEXT.HEADING, scores: null },
        {
          url: TEST_TEXT.SECOND,
          scores: { performance: 0.99, accessibility: 1, 'best-practices': 0.5, seo: 0.1 },
        },
      ],
    }

    const rows = el._renderScores({
      performance: 0.99,
      accessibility: 1,
      'best-practices': 0.5,
      seo: 0.1,
    })

    expect(rows.length).toBe(4)
    expect(el._renderScores(null)).toBeNull()
    expect(el._renderLighthouse()).toBeTruthy()

    el.remove()
  })

  test('renders bundle stats — empty, populated, and byte formatting', async () => {
    await import('@cms/deploy-info/CmsDeployInfo.js')

    const el = document.createElement(CMS_TAGS.CMS_DEPLOY_INFO)

    document.body.appendChild(el)
    await flush()

    const { fmtBytes } = await import('@cms/deploy-info/render.js')

    // fmtBytes — every unit boundary plus the non-number em-dash arm.
    expect(fmtBytes('x')).toBe('—')
    expect(fmtBytes(512)).toBe('512 B')
    expect(fmtBytes(2048)).toBe('2.0 KB')
    expect(fmtBytes(12833358)).toBe('12.2 MB')
    expect(fmtBytes(2626119190)).toBe('2.4 GB')

    // Missing bundle → the "no data" hint arm.
    el.bundle = null
    expect(el._renderBundle()).toBeTruthy()

    // Empty totals — the "no data" arm again (totals missing).
    el.bundle = {}
    expect(el._renderBundle()).toBeTruthy()

    // Populated bundle — totals + tier + crate + byDir + largest arms.
    el.bundle = {
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
          js: { files: 213, bytes: 12833358, unminified: 17613678, gzip: 3212416, brotli: 2671006 },
          css: { files: 4, bytes: 67263, unminified: 101158, gzip: 15066, brotli: 13305 },
          misc: {},
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
    }

    expect(el._renderBundle()).toBeTruthy()

    // Sparse bundle — missing optional arrays takes the `||` fallbacks
    // (no tiers/crates/byDir/largest sections render).
    el.bundle = { totals: { js: { files: 1, bytes: 10 } } }
    expect(el._renderBundle()).toBeTruthy()

    el.remove()
  })
})
