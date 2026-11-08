/**
 * @file cms/playground-editor/events.ts
 * @description Event wiring for <cms-playground-editor>: the save button,
 * locale switch, add/remove label keys, and the per-row input listeners
 * for labels, slugs and typed control defaults (number/boolean).
 */

import { DATA_ATTRS } from '@core/tokens/attrs/data.js'
import { FORM_EVENTS, MOUSE_EVENTS } from '@core/tokens/events/dom.js'
import type { CmsPlaygroundEditor } from './CmsPlaygroundEditor.js'

/**
 * Wires the playground editor — save/locale/add-key single bindings, then
 * three delegated row groups: `.ep-value` label inputs and `.ep-del`
 * buttons (keyed by `data-field`), `.slug-value` route-slug inputs, and
 * the typed defaults (`.ep-def-num` numeric coerced, `.ep-def-bool`
 * checkboxes). Host methods stay the call path so test spies intercept.
 * @param ed — the CmsPlaygroundEditor exposing `addScopedListener` + `$`/`$$`
 */
export function bindEvents(ed: CmsPlaygroundEditor): void {
  /** Single-element scoped listener, no-op when the selector misses. */
  const on = (sel: string, ev: string, fn: EventListener) => {
    const el = ed.$(sel)

    if (el) ed.addScopedListener(el, ev, fn)
  }

  on('#btn-save-playground', MOUSE_EVENTS.CLICK, () => ed.saveAll())

  on('#select-playground-lang', FORM_EVENTS.CHANGE, (e) => {
    ed.selectedLang = (e.target as HTMLSelectElement).value

    ed.loadAllData()
  })

  on('#btn-add-ep-key', MOUSE_EVENTS.CLICK, () => ed.addEpKey())

  ed.$$<HTMLInputElement>('.ep-value').forEach((inp) => {
    const key = inp.getAttribute(DATA_ATTRS.DATA_FIELD)

    if (!key) return

    ed.addScopedListener(inp, FORM_EVENTS.INPUT, (e) => {
      ed.epData[key] = ((e as Event).target as HTMLInputElement).value
    })
  })

  ed.$$('.ep-del').forEach((btn) => {
    const key = btn.getAttribute(DATA_ATTRS.DATA_FIELD)

    ed.addScopedListener(btn, MOUSE_EVENTS.CLICK, () => ed.removeEpKey(key))
  })

  ed.$$<HTMLInputElement>('.slug-value').forEach((inp) => {
    const key = inp.getAttribute(DATA_ATTRS.DATA_FIELD)

    if (!key) return

    ed.addScopedListener(inp, FORM_EVENTS.INPUT, (e) => {
      ed.slugs[key] = ((e as Event).target as HTMLInputElement).value
    })
  })

  ed.$$<HTMLInputElement>('.ep-def-num').forEach((inp) => {
    const key = inp.getAttribute(DATA_ATTRS.DATA_FIELD)

    if (!key) return

    ed.addScopedListener(inp, FORM_EVENTS.INPUT, (e) => {
      ed.epDefaults[key] = Number(((e as Event).target as HTMLInputElement).value)
    })
  })

  ed.$$<HTMLInputElement>('.ep-def-bool').forEach((inp) => {
    const key = inp.getAttribute(DATA_ATTRS.DATA_FIELD)

    if (!key) return

    ed.addScopedListener(inp, FORM_EVENTS.CHANGE, (e) => {
      ed.epDefaults[key] = ((e as Event).target as HTMLInputElement).checked
    })
  })
}
