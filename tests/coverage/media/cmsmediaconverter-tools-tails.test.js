/**
 * @file cmsmediaconverter-tools-tails.test.js
 * @description Coverage tails for the media-converter guided toolchain
 * panel — fetchTools/installTools job actions, every renderTools branch
 * (missing required vs optional, runnable vs sudo-only plans, installing
 * state, log view), and the install/re-check button bindings.
 * Localhost arm: the module loads under happy-dom's default localhost
 * origin so onMounted probes /tools.
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { CMS_EVENTS, CMS_MEDIA_CLASSES, CMS_MEDIA_IDS, CMS_TAGS } from '@cms/tokens.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import { NET_STRINGS } from '@core/tokens/strings/net.js'

const ALL_OK = {
  platform: 'linux',
  tools: { ffmpeg: true, ffprobe: true, magick: true, cjpeg: true },
  missing: { ffmpeg: false, imagemagick: false, cjpeg: false },
  manager: 'apt-get',
  plan: { manager: 'apt-get', needsRoot: false, commands: [], manual: [] },
}

const MISSING_REQUIRED = {
  platform: 'linux',
  tools: { ffmpeg: false, ffprobe: false, convert: false, cjpeg: false, magick: false },
  missing: { ffmpeg: true, imagemagick: true, cjpeg: true },
  manager: 'apt-get',
  plan: {
    manager: 'apt-get',
    needsRoot: true,
    manual: ['sudo apt-get install -y ffmpeg imagemagick libjpeg-turbo-progs'],
  },
}

const PLAN_LESS = {
  platform: 'linux',
  tools: { ffmpeg: false, ffprobe: true },
  missing: { ffmpeg: true, imagemagick: false, cjpeg: false },
  manager: null,
}

const MISSING_OPTIONAL_RUNNABLE = {
  platform: 'darwin',
  tools: { ffmpeg: true, ffprobe: true, magick: false, convert: false, cjpeg: false },
  missing: { ffmpeg: false, imagemagick: true, cjpeg: true },
  manager: 'brew',
  plan: {
    manager: 'brew',
    needsRoot: false,
    commands: [['brew', ['install', 'imagemagick', 'mozjpeg']]],
    manual: ['brew install imagemagick mozjpeg'],
  },
}

await import('@cms/media-convert/CmsMediaConverter.js')

const mount = () => {
  const el = document.createElement(CMS_TAGS.CMS_MEDIA_CONVERTER)

  document.body.appendChild(el)

  return el
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 40))

const shadow = (el, sel) => el.shadowRoot.querySelector(sel)

/** Derives the modifier class (last token) from a compound state token. */
const mod = (compound) => compound.split(' ')[1]

beforeEach(() => {
  document.body.innerHTML = CHAR_STRINGS.EMPTY
  globalThis.fetch = jest.fn(async () => ({ ok: false }))
})

describe('CmsMediaConverter tools panel — fetchTools', () => {
  test('mount probes /tools and stores the report on the host', async () => {
    globalThis.fetch = jest.fn(async (url) =>
      String(url).endsWith('/tools')
        ? { ok: true, json: async () => ALL_OK }
        : { ok: false }
    )

    const el = mount()

    await flush()

    expect(el.tools).toEqual(ALL_OK)
    // all tools present → no setup panel rendered
    expect(shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_PANEL}`)).toBeNull()
  })

  test('a failed /tools response hides the panel', async () => {
    const el = mount()

    await flush()

    expect(el.tools).toBeNull()
    expect(shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_PANEL}`)).toBeNull()
  })

  test('a throwing fetch also hides the panel', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline')
    })

    const el = mount()

    await flush()

    expect(el.tools).toBeNull()
  })

  test('_fetchTools delegate refreshes the stored report', async () => {
    const el = mount()

    await flush()
    globalThis.fetch = jest.fn(async () => ({ ok: true, json: async () => MISSING_REQUIRED }))
    await el._fetchTools()

    expect(el.tools).toEqual(MISSING_REQUIRED)
  })
})

describe('CmsMediaConverter tools panel — renderTools branches', () => {
  test('report without a tools map renders no panel', async () => {
    const el = mount()

    await flush()
    el.tools = { platform: 'linux' }
    el._updateDom()

    expect(shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_PANEL}`)).toBeNull()
  })

  test('missing required tools renders the required title and badges', async () => {
    const el = mount()

    await flush()
    el.tools = MISSING_REQUIRED
    el._updateDom()

    const panel = shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_PANEL}`)

    expect(panel).toBeTruthy()
    expect(panel.textContent).toContain('Setup required')
    // sudo-only plan → manual command shown, no Install button
    expect(panel.textContent).toContain('sudo apt-get install -y')
    expect(shadow(el, `#${CMS_MEDIA_IDS.TOOLS_INSTALL}`)).toBeNull()
    expect(shadow(el, `#${CMS_MEDIA_IDS.TOOLS_RECHECK}`)).toBeTruthy()
    // badge states: required-missing gets ✗, optional-missing gets 'optional'
    expect(panel.textContent).toContain('✗ missing')
    expect(panel.textContent).toContain('optional')
    expect(shadow(el, `.${mod(CMS_MEDIA_CLASSES.CMS_TOOLS_STATE_MISSING)}`)).toBeTruthy()
  })

  test('optional-only missing renders a runnable install plan', async () => {
    const el = mount()

    await flush()
    el.tools = MISSING_OPTIONAL_RUNNABLE
    el._updateDom()

    const panel = shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_PANEL}`)

    expect(panel.textContent).toContain('Optional tools missing')
    const install = shadow(el, `#${CMS_MEDIA_IDS.TOOLS_INSTALL}`)

    expect(install).toBeTruthy()
    expect(install.textContent).toContain('Install via brew')
    expect(install.disabled).toBe(false)
    // present tools render the ok badge
    expect(shadow(el, `.${mod(CMS_MEDIA_CLASSES.CMS_TOOLS_STATE_OK)}`)).toBeTruthy()
  })

  test('installing state disables buttons and swaps the label', async () => {
    const el = mount()

    await flush()
    el.tools = MISSING_OPTIONAL_RUNNABLE
    el.toolsInstalling = true
    el._updateDom()

    const install = shadow(el, `#${CMS_MEDIA_IDS.TOOLS_INSTALL}`)
    const recheck = shadow(el, `#${CMS_MEDIA_IDS.TOOLS_RECHECK}`)

    expect(install.textContent).toContain('Installing…')
    expect(install.disabled).toBe(true)
    expect(recheck.disabled).toBe(true)
  })

  test('a plan-less report renders the required title with no commands', async () => {
    const el = mount()

    await flush()
    el.tools = PLAN_LESS
    el._updateDom()

    const panel = shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_PANEL}`)

    expect(panel).toBeTruthy()
    expect(panel.textContent).toContain('Setup required')
    expect(shadow(el, `#${CMS_MEDIA_IDS.TOOLS_INSTALL}`)).toBeNull()
    expect(shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_CMD}`)).toBeNull()
  })

  test('install log renders the pre block when populated', async () => {
    const el = mount()

    await flush()
    el.tools = MISSING_REQUIRED
    el.installLog = 'spawn log output'
    el._updateDom()

    const log = shadow(el, `.${CMS_MEDIA_CLASSES.CMS_TOOLS_LOG}`)

    expect(log).toBeTruthy()
    expect(log.textContent).toContain('spawn log output')
  })
})

describe('CmsMediaConverter tools panel — installTools + buttons', () => {
  test('install posts the plan, stores report + log, clears the flag', async () => {
    const refreshed = { ...ALL_OK }
    globalThis.fetch = jest.fn(async (url, opts = {}) => {
      if (String(url).endsWith('/tools/install')) {
        expect(opts.method).toBe(NET_STRINGS.METHOD_POST)

        return { ok: true, json: async () => ({ log: 'done', report: refreshed }) }
      }

      return { ok: false }
    })

    const el = mount()

    await flush()
    await el._installTools()

    expect(el.tools).toEqual(refreshed)
    expect(el.installLog).toBe('done')
    expect(el.toolsInstalling).toBe(false)
  })

  test('install without report/log fields keeps prior state', async () => {
    globalThis.fetch = jest.fn(async (url) =>
      String(url).endsWith('/tools/install')
        ? { ok: true, json: async () => ({}) }
        : { ok: false }
    )

    const el = mount()

    await flush()
    el.tools = MISSING_REQUIRED
    await el._installTools()

    expect(el.tools).toEqual(MISSING_REQUIRED)
    expect(el.installLog).toBe(CHAR_STRINGS.EMPTY)
  })

  test('a rejected install notifies instead of throwing', async () => {
    globalThis.fetch = jest.fn(async (url) =>
      String(url).endsWith('/tools/install')
        ? { ok: false, status: 500, json: async () => ({ error: 'install exploded' }) }
        : { ok: false }
    )

    const el = mount()
    const notes = []

    el.addEventListener(CMS_EVENTS.NOTIFY, (e) => notes.push(String(e.detail)))
    await flush()
    await el._installTools()

    expect(notes[0]).toContain('install exploded')
    expect(el.toolsInstalling).toBe(false)
  })

  test('a throwing install fetch notifies and clears the flag', async () => {
    const el = mount()

    await flush()
    globalThis.fetch = jest.fn(async () => {
      throw new Error('gone')
    })
    const notes = []

    el.addEventListener(CMS_EVENTS.NOTIFY, (e) => notes.push(String(e.detail)))
    await el._installTools()

    expect(notes[0]).toContain('gone')
    expect(el.toolsInstalling).toBe(false)
  })

  test('a non-Error rejection notifies the raw value', async () => {
    const el = mount()

    await flush()
    globalThis.fetch = jest.fn(async () => {
      throw 'plain-string-failure'
    })
    const notes = []

    el.addEventListener(CMS_EVENTS.NOTIFY, (e) => notes.push(String(e.detail)))
    await el._installTools()

    expect(notes[0]).toContain('plain-string-failure')
  })

  test('install + re-check buttons call the delegates', async () => {
    const el = mount()

    await flush()
    el.tools = MISSING_OPTIONAL_RUNNABLE
    el._updateDom()
    el._bindEvents()

    const installSpy = jest.spyOn(el, '_installTools').mockImplementation(async () => {})
    const recheckSpy = jest.spyOn(el, '_fetchTools').mockImplementation(async () => {})

    shadow(el, `#${CMS_MEDIA_IDS.TOOLS_INSTALL}`).click()
    shadow(el, `#${CMS_MEDIA_IDS.TOOLS_RECHECK}`).click()

    expect(installSpy).toHaveBeenCalled()
    expect(recheckSpy).toHaveBeenCalled()
  })
})
