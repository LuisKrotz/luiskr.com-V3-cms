/**
 * @file portfolio/model.ts — portfolio list model mutations.
 */

import { DB_PATHS } from '@core/tokens/routes/paths.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import type { CmsPortfolioList } from './CmsPortfolioList.js'
import type { PortfolioItem } from './types.js'
import { CDN_URLS } from '@core/tokens/media/urls.js'
import { COVER_DIMENSIONS, MOSAIC_DIMENSIONS } from '@core/tokens/media/dimensions.js'
import { encodeMediaUrl } from '@core/utils/media.js'

/**
 * Resolves a portfolio item's `image` field to a previewable URL —
 * absolute URLs pass through (already-hosted assets), bare filenames
 * compose against the CDN covers prefix + `.jpg` and run through
 * `encodeMediaUrl` for the media worker's token format.
 * @param imgName — stored filename or absolute URL, may be undefined
 * @returns preview URL, or empty string when nothing is set
 */
export function getImagePreview(imgName: string | undefined): string {
  if (!imgName) return CHAR_STRINGS.EMPTY
  if (imgName.startsWith('http')) return imgName
  return encodeMediaUrl(`${CDN_URLS.CDN_BASE}${DB_PATHS.COVERS}${imgName}.jpg`)
}

/**
 * Writes one dimension cell into an item's `[desktop, mobile]` pair —
 * legacy items missing the array get it created with the sibling slot
 * defaulted to the matching token (mobile width or desktop width).
 * @param item — the portfolio item to mutate
 * @param prop — `'width'` or `'height'`
 * @param idx — 0 = desktop slot, 1 = mobile slot
 * @param val — the input's raw string value
 */
export function updateDim(item: PortfolioItem, prop: string, idx: number, val: string): void {
  if (!Array.isArray(item[prop])) {
    item[prop] =
      idx === 0
        ? [val, MOSAIC_DIMENSIONS.MOSAIC_MOBILE_WIDTH_STR]
        : [COVER_DIMENSIONS.FHD_WIDTH_STR, val]
  } else {
    item[prop][idx] = val
  }
}

/**
 * Appends a placeholder portfolio item with sensible defaults —
 * `featured: false`, the token default dimension pairs, and a
 * `default-cover` image the editor can replace in place.
 * @param host — the host component holding `items`
 */
export function addNewItem(host: CmsPortfolioList) {
  host.items.push({
    label: 'New Project',
    link: 'new-project',
    image: 'default-cover',
    description: 'New project description.',
    featured: false,
    width: [COVER_DIMENSIONS.FHD_WIDTH_STR, MOSAIC_DIMENSIONS.MOSAIC_MOBILE_WIDTH_STR],
    height: [
      MOSAIC_DIMENSIONS.MOSAIC_DESKTOP_HEIGHT_STR,
      MOSAIC_DIMENSIONS.MOSAIC_MOBILE_HEIGHT_STR,
    ],
  })
  host._updateDom()
  host._bindEvents()
}

/**
 * Deletes the item at `idx` after a label-named confirm — the splice
 * rewrites indices, so the render+rebind pair refreshes every row's
 * `data-idx` bindings.
 * @param host — the host component holding `items`
 * @param idx — zero-based list index
 */
export function removeItem(host: CmsPortfolioList, idx: number): void {
  if (confirm(`Delete "${host.items[idx]?.label || 'Item'}"?`)) {
    host.items.splice(idx, 1)
    host._updateDom()
    host._bindEvents()
  }
}

/**
 * Moves an item one slot earlier — splice-remove + splice-insert keeps
 * identity so the re-render lands on the same object in a new position.
 * @param host — the host component holding `items`
 * @param idx — current index; 0 returns early (already first)
 */
export function moveUp(host: CmsPortfolioList, idx: number): void {
  if (idx <= 0) return
  const item = host.items.splice(idx, 1)[0]
  host.items.splice(idx - 1, 0, item)
  host._updateDom()
  host._bindEvents()
}

/**
 * Moves an item one slot later — splice-remove + splice-insert at
 * `idx + 1`; last-position index returns early.
 * @param host — the host component holding `items`
 * @param idx — current index
 */
export function moveDown(host: CmsPortfolioList, idx: number): void {
  if (idx >= host.items.length - 1) return
  const item = host.items.splice(idx, 1)[0]
  host.items.splice(idx + 1, 0, item)
  host._updateDom()
  host._bindEvents()
}
