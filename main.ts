/**
 * @file main.js (cms)
 * @description CMS bundle entry — completely separate from the public site
 * entry. Mounts <admin-login> or <cms-dashboard> into #cms-root based on the
 * Firebase auth session, and re-swaps on the auth-changed event.
 * This bundle is only served under the /cms build output and is excluded
 * from indexing (robots + X-Robots-Tag).
 */

import { CMS_EVENTS, CMS_TAGS } from '@cms/tokens.js'
import { CMS_IDS } from '@core/tokens/ids/cms.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import { TYPE_STRINGS } from '@core/tokens/strings/types.js'
import { onAuthChange } from '@core/firebase.js'
import { dropStaleServiceWorkers } from '@core/utils/service-worker.js'
// Document-level copy of the CMS stylesheet — publishes :root tokens and the
// html/body base that per-component `?inline` shadow copies cannot cover.
import '@cms/sass/cms.scss'
import '@cms/routes/AdminLogin.js'
import '@cms/routes/CmsDashboard.js'

/* A production-preview service worker left on this origin keeps
   intercepting /cms requests and replaying stale precached chunks — the
   CMS bundle never ran the website's cleanup, so a dev server on a
   previously-prod port would boot a dead shell. Drop it on dev boot. */
const env: { PROD?: boolean } =
  (typeof import.meta !== TYPE_STRINGS.UNDEFINED && import.meta.env) || {}

if (!env.PROD) dropStaleServiceWorkers()

/** Boot grace window — auth-listener silence past this mounts the login. */
const _BOOT_GRACE_MS = 4000

const root = document.getElementById(CMS_IDS.CMS_ROOT)

let currentTag: string = CHAR_STRINGS.EMPTY

/** Swaps the CMS root's child for the given element tag (idempotent). */
function mountView(tag: string): void {
  if (!root || currentTag === tag) return

  currentTag = tag

  root.replaceChildren(document.createElement(tag))
}

/** Boots the CMS: first auth callback decides the initial view. */
async function boot() {
  try {
    await onAuthChange((user) => {
      mountView(user ? CMS_TAGS.VIEW_CMS_DASHBOARD : CMS_TAGS.VIEW_ADMIN_LOGIN)
    })
  } catch {
    // Auth wiring failed (firebase chunk rejected, init threw) — the login
    // view is still the correct surface: its sign-in path re-touches the
    // same imports and shows the real error inline instead of a blank page.
    mountView(CMS_TAGS.VIEW_ADMIN_LOGIN)
  }
}

/* Watchdog — if the auth listener never fires (dead chunk, blocked script)
   the page would sit on an empty #cms forever. After the grace window,
   mount the login view so the shell can never strand. */
setTimeout(() => {
  if (!currentTag) mountView(CMS_TAGS.VIEW_ADMIN_LOGIN)
}, _BOOT_GRACE_MS)

window.addEventListener(CMS_EVENTS.AUTH_CHANGED, (e) => {
  mountView((e as CustomEvent).detail ? CMS_TAGS.VIEW_CMS_DASHBOARD : CMS_TAGS.VIEW_ADMIN_LOGIN)
})

boot()
