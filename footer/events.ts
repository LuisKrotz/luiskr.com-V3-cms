/**
 * @file cms/footer/events.ts — form wiring for the footer editor:
 * save/sync buttons, language + title/disclaimer inputs, and the four
 * convention-bound channel lists.
 */

import { CMS_LIST_PREFIXES, CMS_FIELD_KEYS } from '@cms/tokens.js'
import { FORM_EVENTS, MOUSE_EVENTS } from '@core/tokens/events/dom.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import type { CmsFooterEditor } from './CmsFooterEditor.js'

/**
 * Wires the whole footer form — header buttons (save + the two
 * cross-locale syncs), the language selector and scalar title/disclaimer
 * inputs, then the four channel lists, each bound via `_bindListEvents`
 * with the prefix + label-field convention matching its DB shape
 * (`line1` channels carry an extra caption field; legal uses `page`;
 * socials use `network`).
 * @param host — the CmsFooterEditor hosting the data slices
 */
export function bindEvents(host: CmsFooterEditor): void {
  /** Single-element scoped listener, no-op when the selector misses. */
  const on = (sel: string, ev: string, fn: EventListener) => {
    const el = host.$(sel)

    if (el) host.addScopedListener(el, ev, fn)
  }

  on('#btn-save-footer', MOUSE_EVENTS.CLICK, () => host.saveAll())
  on('#btn-sync-line1', MOUSE_EVENTS.CLICK, () => host.syncLine1ToAllLangs())
  on('#btn-sync-socials', MOUSE_EVENTS.CLICK, () => host.syncSocialsToAllLangs())

  on('#select-footer-lang', FORM_EVENTS.CHANGE, (e) => {
    host.selectedLang = (e.target as HTMLSelectElement).value
    host.loadAllData()
  })
  on('#contact-title-input', FORM_EVENTS.INPUT, (e) => {
    host.contactData.title = (e.target as HTMLInputElement).value
  })
  on('#contact-subtitle-input', FORM_EVENTS.INPUT, (e) => {
    host.contactData.subtitle = (e.target as HTMLInputElement).value
  })
  on('#related-title-input', FORM_EVENTS.INPUT, (e) => {
    host.relatedFooter.title = (e.target as HTMLInputElement).value
  })
  on('#disclaimer-textarea', FORM_EVENTS.INPUT, (e) => {
    host.relatedFooter.note = (e.target as HTMLTextAreaElement).value
  })

  // Line 1 channels
  on(`.${CMS_LIST_PREFIXES.LINE1}-add`, MOUSE_EVENTS.CLICK, () =>
    host._addItem(host.contactData.line1, {
      description: CHAR_STRINGS.EMPTY,
      link: CHAR_STRINGS.EMPTY,
    })
  )
  host._bindListEvents(
    CMS_LIST_PREFIXES.LINE1,
    host.contactData.line1,
    CMS_FIELD_KEYS.DESCRIPTION,
    CMS_FIELD_KEYS.CAPTION
  )

  // Line 2 sub-links
  on(`.${CMS_LIST_PREFIXES.LINE2}-add`, MOUSE_EVENTS.CLICK, () =>
    host._addItem(host.contactData.line2, {
      description: CHAR_STRINGS.EMPTY,
      link: CHAR_STRINGS.EMPTY,
    })
  )
  host._bindListEvents(CMS_LIST_PREFIXES.LINE2, host.contactData.line2)

  // Legal links (components/legal-footer → { link, page })
  on(`.${CMS_LIST_PREFIXES.LEGAL}-add`, MOUSE_EVENTS.CLICK, () =>
    host._addItem(host.legalLinks, { page: CHAR_STRINGS.EMPTY, link: CHAR_STRINGS.EMPTY })
  )
  host._bindListEvents(CMS_LIST_PREFIXES.LEGAL, host.legalLinks, CMS_FIELD_KEYS.PAGE)

  // Socials (components/related → { link, network })
  on(`.${CMS_LIST_PREFIXES.SOCIAL}-add`, MOUSE_EVENTS.CLICK, () =>
    host._addItem(host.relatedFooter.socials, {
      network: CHAR_STRINGS.EMPTY,
      link: CHAR_STRINGS.EMPTY,
    })
  )
  host._bindListEvents(CMS_LIST_PREFIXES.SOCIAL, host.relatedFooter.socials, CMS_FIELD_KEYS.NETWORK)
}
