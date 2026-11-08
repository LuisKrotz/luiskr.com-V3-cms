/**
 * @file about/data.ts — Firebase load/save/multi-locale sync for the about node.
 */

import { getDbInstance } from '@core/firebase.js'
import { ref, child, get, set } from 'firebase/database'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import { DB_PATHS } from '@core/tokens/routes/paths.js'
import { NAV_TEXT } from '@core/tokens/strings/text.js'
import type { CmsAboutEditor } from './CmsAboutEditor.js'
import { devError } from '@core/devlog.js'

/**
 * Reads the locale's `pages/about` node into `aboutData` — the Gravatar
 * `?s=` size param is reverse-parsed out of the stored URL so the
 * preset buttons highlight the saved size instead of the default.
 * @param host — the host component holding `aboutData`/`gravatarSize`
 */
export async function loadAboutData(host: CmsAboutEditor) {
  try {
    const db = await getDbInstance()
    const snap = await get(
      child(ref(db), `${DB_PATHS.TRANSLATIONS}${host.selectedLang}/pages/about`)
    )
    if (snap.exists()) {
      const val = snap.val()
      const rawUrl = val.profilePicture || CHAR_STRINGS.EMPTY
      // Reverse the ?s= param out of the stored URL so the preset
      // selector shows the saved size instead of the 512 default.
      const sizeMatch = rawUrl.match(/[?&]s=(\d+)/)
      if (sizeMatch) host.gravatarSize = parseInt(sizeMatch[1], 10)
      host.aboutData = {
        title: val.title || NAV_TEXT.ABOUT,
        profilePicture: rawUrl,
        col1: Array.isArray(val.col1) ? [...val.col1] : [],
        col2: Array.isArray(val.col2) ? [...val.col2] : [],
        mentions: val.mentions || NAV_TEXT.SOME_MENTIONS,
        mention_items: Array.isArray(val.mention_items) ? [...val.mention_items] : [],
      }
    }
    host._updateDom()
  } catch (err) {
    devError('Error loading about data:', err)
  }
}

/**
 * Writes the whole `aboutData` model back to `pages/about` — the editor
 * owns the complete node shape so a single `set` replaces it atomically.
 * @param host — the host component holding `aboutData`/`selectedLang`
 */
export async function saveAboutData(host: CmsAboutEditor) {
  host.saving = true
  host._updateDom()
  try {
    const db = await getDbInstance()
    await set(ref(db, `${DB_PATHS.TRANSLATIONS}${host.selectedLang}/pages/about`), host.aboutData)
    host._notify(`About section [${host.selectedLang.toUpperCase()}] saved!`)
  } catch (err) {
    alert('Failed to save: ' + ((err as Error).message || err))
  } finally {
    host.saving = false
    host._updateDom()
  }
}

/**
 * Propagates just the `profilePicture` URL (already carrying the chosen
 * `?s=` size) to every other locale's about node — the narrow sync for
 * "same face everywhere" without touching localized bio text.
 * @param host — the host component holding `aboutData.profilePicture`
 */
export async function applyPictureToAllLangs(host: CmsAboutEditor) {
  if (
    !confirm(
      `Apply current profile picture URL and size (${host.gravatarSize}px) to ALL ${host.languages.length} languages?`
    )
  )
    return
  host.syncingAll = true
  host._updateDom()
  try {
    const db = await getDbInstance()
    for (const lang of host.languages) {
      if (lang === host.selectedLang) continue
      await set(
        ref(db, `${DB_PATHS.TRANSLATIONS}${lang}/pages/about/profilePicture`),
        host.aboutData.profilePicture
      )
    }
    host._notify(`Profile picture synced to all ${host.languages.length} languages!`)
  } catch (err) {
    alert('Sync failed: ' + ((err as Error).message || err))
  } finally {
    host.syncingAll = false
    host._updateDom()
  }
}

/**
 * Propagates the non-localized fields (profile picture, mentions title,
 * mention items) to every other locale — each target's node is read
 * first so localized `title`/`col1`/`col2` survive the merge.
 * @param host — the host component holding the source `aboutData`
 */
export async function syncNonLocalizedToAllLangs(host: CmsAboutEditor) {
  if (
    !confirm(
      `Sync profile picture and awards items to ALL ${host.languages.length} languages? Localized text (bio, title) will be preserved.`
    )
  )
    return
  host.syncingAll = true
  host._updateDom()
  try {
    const db = await getDbInstance()
    for (const lang of host.languages) {
      if (lang === host.selectedLang) continue
      const snap = await get(child(ref(db), `${DB_PATHS.TRANSLATIONS}${lang}/pages/about`))
      const existing = snap.exists() ? snap.val() : {}
      await set(ref(db, `${DB_PATHS.TRANSLATIONS}${lang}/pages/about`), {
        ...existing,
        profilePicture: host.aboutData.profilePicture,
        mentions: host.aboutData.mentions,
        mention_items: host.aboutData.mention_items,
      })
    }
    host._notify('Non-localized fields (picture + awards) synced across all languages!')
  } catch (err) {
    alert('Sync failed: ' + ((err as Error).message || err))
  } finally {
    host.syncingAll = false
    host._updateDom()
  }
}
