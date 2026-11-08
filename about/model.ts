/**
 * @file about/model.ts — about model mutations (paragraphs, mentions, gravatar).
 */

import type { CmsAboutEditor } from './CmsAboutEditor.js'
import { emailToGravatarHash, type BioColumn } from './types.js'

/**
 * Applies a Gravatar size — strips any existing `?s=`/`&s=` param from
 * the stored URL (and a bare trailing `?` it would leave behind), then
 * re-appends the new size so the stored URL always carries exactly one.
 * @param host — the host component holding `aboutData.profilePicture`
 * @param size — pixel edge Gravatar should return (drives `?s=N`)
 */
export function setGravatarSize(host: CmsAboutEditor, size: number): void {
  host.gravatarSize = size
  const base = host.aboutData.profilePicture.replace(/[?&]s=\d+/, '').replace(/\?$/, '')
  host.aboutData.profilePicture = base + `?s=${size}`
  host._updateDom()
}

/**
 * Builds a Gravatar URL from the email field — SHA-256 hashes the
 * trimmed/lowercased address (Gravatar's lookup key) and composes it
 * with the current size so the preview matches what the site serves.
 * @param host — the host component holding `emailInput`/`gravatarSize`
 */
export async function generateGravatarUrl(host: CmsAboutEditor) {
  if (!host.emailInput.trim()) return
  const hash = await emailToGravatarHash(host.emailInput)
  host.aboutData.profilePicture = `https://www.gravatar.com/avatar/${hash}?s=${host.gravatarSize}`
  host._updateDom()
}

/**
 * Appends an empty paragraph to a bio column — the input rows write by
 * index, so pushing an empty string creates the new row's bound slot.
 * @param host — the host component holding `aboutData`
 * @param col — `'col1'` (left) or `'col2'` (right)
 */
export function addParagraph(host: CmsAboutEditor, col: BioColumn): void {
  host.aboutData[col] = [...(host.aboutData[col] || []), '']
  host._updateDom()
}

/**
 * Drops the paragraph at `idx` from a bio column and re-renders the list.
 * @param host — the host component holding `aboutData`
 * @param col — `'col1'` (left) or `'col2'` (right)
 * @param idx — zero-based paragraph index
 */
export function removeParagraph(host: CmsAboutEditor, col: BioColumn, idx: number): void {
  host.aboutData[col] = host.aboutData[col].filter((_, i) => i !== idx)
  host._updateDom()
}

/**
 * Swaps a paragraph with its neighbor — `dir` is -1 (up) or +1 (down);
 * out-of-bounds targets return early so the edge buttons are also safe.
 */
export function moveParagraph(
  host: CmsAboutEditor,
  col: BioColumn,
  idx: number,
  dir: number
): void {
  const arr = [...host.aboutData[col]]
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  host.aboutData[col] = arr
  host._updateDom()
}

/**
 * Appends a blank mention (description/link/icon) — the three-field row
 * renders from these keys via `data-field` binding.
 * @param host — the host component holding `aboutData.mention_items`
 */
export function addMentionItem(host: CmsAboutEditor) {
  host.aboutData.mention_items = [
    ...(host.aboutData.mention_items || []),
    { description: '', link: '', icon: '' },
  ]
  host._updateDom()
}

/**
 * Drops the mention at `idx` from the awards list and re-renders.
 * @param host — the host component holding `aboutData.mention_items`
 * @param idx — zero-based mention index
 */
export function removeMentionItem(host: CmsAboutEditor, idx: number): void {
  host.aboutData.mention_items = host.aboutData.mention_items.filter((_, i) => i !== idx)
  host._updateDom()
}

/**
 * Swaps a mention with its neighbor — `dir` is -1 (up) or +1 (down);
 * out-of-bounds targets return early.
 * @param host — the host component holding `aboutData.mention_items`
 * @param idx — zero-based mention index
 * @param dir — -1 or +1
 */
export function moveMentionItem(host: CmsAboutEditor, idx: number, dir: number): void {
  const arr = [...(host.aboutData.mention_items || [])]
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  host.aboutData.mention_items = arr
  host._updateDom()
}
