/**
 * @file projects/data.ts — Firebase load/save/delete for the projects editor.
 */

import { DB_PATHS } from '@core/tokens/routes/paths.js'
import { getDbInstance } from '@core/firebase.js'
import { ref, child, get, set, remove } from 'firebase/database'
import type { CmsProjectsList } from './CmsProjectsList.js'
import { defaultCover } from './types.js'
import { normalizeSection } from './sections.js'
import { devError } from '@core/devlog.js'

/**
 * Reads the locale's `projects/` node, sorts the key list, and auto-
 * selects the first project when none is chosen — then chains into
 * `loadProjectData` so the editor opens populated. Empty nodes clear
 * the selection and render the "no projects" state.
 * @param host — the host component holding `projectKeys`/`currentProject`
 */
export async function loadProjectKeys(host: CmsProjectsList) {
  try {
    const db = await getDbInstance()
    const snap = await get(child(ref(db), `${DB_PATHS.TRANSLATIONS}${host.selectedLang}/projects`))
    if (snap.exists()) {
      const val = snap.val()
      host.projectKeys = Object.keys(val).sort()
      if (!host.selectedProjectKey && host.projectKeys.length > 0) {
        host.selectedProjectKey = host.projectKeys[0]
      }
      await host.loadProjectData()
    } else {
      host.projectKeys = []
      host.currentProject = null
      host._updateDom()
      host._bindEvents()
    }
  } catch (err) {
    devError('Error loading project keys:', err)
  }
}

/**
 * Reads one project's full record — normalizes `sections` (array or
 * keyed map) through `normalizeSection` into the `[texts, media]` tuple
 * shape the renderer and event writers both index into. Missing
 * `cover`/`seo` nodes get token defaults so the form never reads holes.
 * @param host — the host component holding `selectedProjectKey`
 */
export async function loadProjectData(host: CmsProjectsList) {
  if (!host.selectedProjectKey) return
  try {
    const db = await getDbInstance()
    const snap = await get(
      child(
        ref(db),
        `${DB_PATHS.TRANSLATIONS}${host.selectedLang}/projects/${host.selectedProjectKey}`
      )
    )
    if (snap.exists()) {
      const val = snap.val()
      const rawSections = Array.isArray(val.sections)
        ? val.sections
        : Object.values(val.sections || {})

      host.currentProject = {
        title: val.title || '',
        folder: val.folder || '',
        seo: val.seo || { noIndex: false },
        cover: val.cover || defaultCover(),
        sections: rawSections.map((s: unknown) => normalizeSection(s)),
        // Publication stamps ride the record through the editor so a
        // save never erases the git-derived `date`; absent on legacy
        // nodes — consumers gate on presence.
        ...(val.date ? { date: val.date } : {}),
        ...(val.modified ? { modified: val.modified } : {}),
      }
    } else {
      host.currentProject = null
    }
    host._updateDom()
    host._bindEvents()
  } catch (err) {
    devError('Error loading project data:', err)
  }
}

/**
 * Creates a new project locally (not yet persisted) — prompts for the
 * slug, sanitizes it to `[a-z0-9_-]`, seeds the model with a title,
 * folder prefix, default cover, and empty sections, then selects it.
 * The record lands in Firebase only on Save.
 * @param host — the host component holding `projectKeys`/`currentProject`
 */
export function createProjectPrompt(host: CmsProjectsList) {
  const key = prompt('Enter project identifier slug (e.g. "metcha", "melissa"):')
  if (!key) return
  const cleanKey = key
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '')
  if (host.projectKeys.includes(cleanKey)) {
    alert('Project already exists!')
    return
  }
  host.projectKeys.push(cleanKey)
  host.selectedProjectKey = cleanKey
  host.currentProject = {
    title: cleanKey.toUpperCase(),
    folder: `${cleanKey}/`,
    seo: { noIndex: false },
    cover: defaultCover(`${cleanKey.toUpperCase()} Cover`),
    sections: [],
  }
  host._updateDom()
  host._bindEvents()
}

/**
 * Deletes the selected project across every locale — loops languages
 * removing `projects/<key>` nodes (the slug is structural, so a partial
 * delete would orphan other languages' copies), then reloads the key
 * list so the selector lands on a valid entry.
 * @param host — the host component holding `selectedProjectKey`
 */
export async function deleteProject(host: CmsProjectsList) {
  if (!host.selectedProjectKey) return
  if (!confirm(`Delete project "${host.selectedProjectKey}" across ALL languages?`)) return
  host.saving = true
  try {
    const db = await getDbInstance()
    for (const lang of host.languages) {
      await remove(ref(db, `${DB_PATHS.TRANSLATIONS}${lang}/projects/${host.selectedProjectKey}`))
    }
    host.selectedProjectKey = ''
    host.currentProject = null
    await host.loadProjectKeys()
    host._notify('Project deleted across all languages.')
  } catch (err) {
    alert('Failed to delete project: ' + ((err as Error).message || err))
  } finally {
    host.saving = false
    host._updateDom()
    host._bindEvents()
  }
}

/**
 * Writes the current project back to its locale node — the whole record
 * (title/folder/seo/cover/sections + the publication stamps) is replaced
 * atomically since the editor owns the complete shape. `date` passes
 * through untouched (it is the git-derived publication stamp, not an
 * editable field) — a record that lacks one (CMS-created project, never
 * committed to git) gets its first save stamped as the publication
 * moment; `modified` is stamped fresh on every save so
 * dateModified/<lastmod> consumers always see the last real edit.
 * @param host — the host component holding `currentProject`
 */
export async function saveProjectData(host: CmsProjectsList) {
  if (!host.selectedProjectKey || !host.currentProject) return

  const stamp = new Date().toISOString()

  if (!host.currentProject.date) host.currentProject.date = stamp
  host.currentProject.modified = stamp
  host.saving = true
  host._updateDom()
  try {
    const db = await getDbInstance()
    await set(
      ref(db, `${DB_PATHS.TRANSLATIONS}${host.selectedLang}/projects/${host.selectedProjectKey}`),
      host.currentProject
    )
    host._notify(`Project [${host.selectedProjectKey.toUpperCase()}] saved!`)
  } catch (err) {
    alert('Failed to save project: ' + ((err as Error).message || err))
  } finally {
    host.saving = false
    host._updateDom()
    host._bindEvents()
  }
}
