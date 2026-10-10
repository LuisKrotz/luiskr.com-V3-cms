/**
 * @file cmsmediaconverter-offhost-tails.test.js
 * @description Coverage tails for the non-localhost arm — the module is
 * imported while window.location.hostname is patched off localhost, so
 * IS_LOCALHOST evaluates false for the whole file: onMounted must skip
 * the /tools probe and render must show the dev-server notice instead
 * of the converter card.
 */
import { describe, test, expect, jest, afterAll } from '@jest/globals'
import { CMS_TAGS } from '@cms/tokens.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'

const hostname = Object.getOwnPropertyDescriptor(window.location, 'hostname')

Object.defineProperty(window.location, 'hostname', {
  value: 'example.com',
  configurable: true,
})

const { IS_LOCALHOST } = await import('@cms/media-convert/CmsMediaConverter.js')

afterAll(() => {
  if (hostname) Object.defineProperty(window.location, 'hostname', hostname)
})

describe('CmsMediaConverter off-localhost', () => {
  test('module evaluates IS_LOCALHOST false under a foreign hostname', () => {
    expect(IS_LOCALHOST).toBe(false)
  })

  test('mount renders the notice and never probes /tools', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false }))

    const el = document.createElement(CMS_TAGS.CMS_MEDIA_CONVERTER)

    document.body.appendChild(el)
    await new Promise((resolve) => setTimeout(resolve, 40))

    // onMounted skipped the probe entirely — zero fetch calls
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(el.tools).toBeNull()
    expect(el.shadowRoot.textContent).toContain('local dev server')

    document.body.innerHTML = CHAR_STRINGS.EMPTY
  })
})
