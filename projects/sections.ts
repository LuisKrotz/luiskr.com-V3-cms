/**
 * @file projects/sections.ts — section model normalization + CRUD helpers.
 */

import type { CmsProjectsList } from './CmsProjectsList.js'
import { newMediaSlot, type CmsMediaItem, type CmsSection } from './types.js'

/**
 * Coerces a stored section into the canonical `[texts, media]` tuple —
 * accepts the tuple form directly, the legacy object form
 * (`{texts, media}`), and anything else as an empty pair. The renderer
 * and event writers index `[0]`/`[1]`, so every read path funnels
 * through here before touching the model.
 * @param s — raw DB value (tuple, object, or garbage)
 * @returns `[paragraphs, mediaItems]` — never null, always arrays
 */
export function normalizeSection(s: unknown): CmsSection {
  if (Array.isArray(s)) {
    const texts = (Array.isArray(s[0]) ? s[0] : []) as string[]
    const media = (Array.isArray(s[1]) ? s[1] : []) as CmsMediaItem[]
    return [texts, media]
  }
  if (s && typeof s === 'object') {
    const obj = s as { texts?: unknown; media?: unknown }
    const texts = (Array.isArray(obj.texts) ? obj.texts : []) as string[]
    const media = (Array.isArray(obj.media) ? obj.media : []) as CmsMediaItem[]
    return [texts, media]
  }
  return [[], []]
}

/**
 * In-place normalize for a section the event handlers are about to
 * index into — guarantees `sections[sIdx]` is the `[texts, media]`
 * tuple before a `data-tidx`/`data-midx` write lands on it.
 * @param host — the host component holding `currentProject`
 * @param sIdx — section index to normalize
 */
export function ensureSectionShape(host: CmsProjectsList, sIdx: number) {
  if (!host.currentProject) return
  host.currentProject.sections[sIdx] = normalizeSection(host.currentProject.sections[sIdx])
}

/**
 * Appends a fresh section — `[[''], []]` seeds one empty paragraph so
 * the card opens with an editable row instead of blank space.
 * @param host — the host component holding `currentProject`
 */
export function addSection(host: CmsProjectsList) {
  if (!host.currentProject) return
  if (!Array.isArray(host.currentProject.sections)) host.currentProject.sections = []
  host.currentProject.sections.push([[''], []])
  host._updateDom()
  host._bindEvents()
}

/**
 * Deletes a section after a numbered confirm — the splice reindexes
 * later sections, so the render+rebind refreshes every `data-idx`.
 * @param host — the host component holding `currentProject`
 * @param sIdx — zero-based section index
 */
export function removeSection(host: CmsProjectsList, sIdx: number) {
  if (!host.currentProject) return
  if (!confirm(`Delete Section #${sIdx + 1}?`)) return
  host.currentProject.sections.splice(sIdx, 1)
  host._updateDom()
  host._bindEvents()
}

/**
 * Swaps a section with its neighbor — `dir` is -1 (up) or +1 (down);
 * out-of-bounds targets return early so the edge buttons are safe.
 * @param host — the host component holding `currentProject`
 * @param sIdx — zero-based section index
 * @param dir — -1 or +1
 */
export function moveSection(host: CmsProjectsList, sIdx: number, dir: number) {
  if (!host.currentProject) return
  const secs = host.currentProject.sections
  const target = sIdx + dir
  if (target < 0 || target >= secs.length) return
  ;[secs[sIdx], secs[target]] = [secs[target], secs[sIdx]]
  host._updateDom()
  host._bindEvents()
}

/**
 * Pushes an empty paragraph into the text half (`[0]`) of a section —
 * `ensureSectionShape` first normalizes any legacy object form.
 * @param host — the host component holding `currentProject`
 * @param sIdx — zero-based section index
 */
export function addSectionText(host: CmsProjectsList, sIdx: number) {
  if (!host.currentProject) return
  host._ensureSectionShape(sIdx)
  host.currentProject.sections[sIdx][0].push('')
  host._updateDom()
  host._bindEvents()
}

/**
 * Drops paragraph `tIdx` from a section's text half and re-renders.
 * @param host — the host component holding `currentProject`
 * @param sIdx — zero-based section index
 * @param tIdx — zero-based text index inside the section
 */
export function removeSectionText(host: CmsProjectsList, sIdx: number, tIdx: number) {
  if (!host.currentProject) return
  host.currentProject.sections[sIdx][0].splice(tIdx, 1)
  host._updateDom()
  host._bindEvents()
}

/**
 * Pushes a fresh media slot (`newMediaSlot` — empty src/label, default
 * dimensions, image type) into the media half (`[1]`) of a section.
 * @param host — the host component holding `currentProject`
 * @param sIdx — zero-based section index
 */
export function addSectionMedia(host: CmsProjectsList, sIdx: number) {
  if (!host.currentProject) return
  host._ensureSectionShape(sIdx)
  host.currentProject.sections[sIdx][1].push(newMediaSlot())
  host._updateDom()
  host._bindEvents()
}

/**
 * Drops media item `mIdx` from a section's media half and re-renders.
 * @param host — the host component holding `currentProject`
 * @param sIdx — zero-based section index
 * @param mIdx — zero-based media index inside the section
 */
export function removeSectionMedia(host: CmsProjectsList, sIdx: number, mIdx: number) {
  if (!host.currentProject) return
  host.currentProject.sections[sIdx][1].splice(mIdx, 1)
  host._updateDom()
  host._bindEvents()
}
