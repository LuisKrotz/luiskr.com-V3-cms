/* istanbul ignore file -- dev-only offline stub; never aliased in production builds */
import { devInfo } from '@core/devlog.js'
/**
 * @file dev/firebase-mock.js (cms)
 * @description Dev-only offline stub for Firebase Auth + RTDB. Enabled by
 * running the dev server with `CMS_MOCK=1 yarn dev` — vite.config.js
 * aliases `firebase/database` and `../firebase.js` to this module.
 * Reads the committed `database.json` so every CMS editor can be exercised
 * without credentials; all writes are logged instead of persisted.
 * NEVER aliased in production builds — `snyk`/verify scans ignore this file
 * because it cannot be reached from the shipped bundle.
 */

/** Session cache for the merged snapshot — fetched once, reused. */
let _dbCache: Record<string, unknown> | null = null

/**
 * Fetches and caches the merged database view once per session — the
 * dev server merges the committed `database.json` with the gitignored
 * `cms/dev/mock-db.json` overlay behind `/__cms-db`, so CMS edits
 * persist across reloads. Falls back to the plain snapshot when the
 * middleware isn't mounted (e.g. a stale server without CMS_MOCK).
 * @returns The parsed database object.
 */
async function loadDb(): Promise<Record<string, unknown>> {
  if (!_dbCache) {
    const res = await fetch('/__cms-db')

    if (res.ok) {
      _dbCache = (await res.json()) as Record<string, unknown>
    } else {
      const fallback = await fetch('/database.json')

      _dbCache = (await fallback.json()) as Record<string, unknown>
    }
  }

  return _dbCache
}

/**
 * Persists one write through the dev middleware — POSTs the RTDB-style
 * op (`set`/`update`/`remove`) to `/__cms-db`, then drops the cached
 * snapshot so the next read re-merges base + overlay. Silent no-op when
 * the middleware isn't mounted.
 * @param op RTDB operation name.
 * @param path Slash-separated DB path.
 * @param value Written payload (unused for remove).
 */
async function persist(op: string, path: string, value?: unknown): Promise<void> {
  const res = await fetch('/__cms-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, value, op }),
  }).catch(() => null)

  if (res?.ok) _dbCache = null
}

/**
 * Walks a `a/b/c` path down the snapshot; returns the node or undefined.
 * Empty segments are filtered so trailing slashes can't produce misses.
 * @param path Slash-separated RTDB-style path.
 * @returns The node at the path, or undefined when absent.
 */
async function getNode(path: string): Promise<unknown> {
  const db = await loadDb()

  let node: unknown = db

  for (const key of path.split('/').filter(Boolean)) {
    node = (node as Record<string, unknown> | undefined)?.[key]
  }

  return node
}

/** Minimal ref stand-in — just the path the SDK would encapsulate. */
interface MockRef {
  __path: string
}

// ─── firebase/database surface ──────────────────────────────────────────────
/**
 * Mock of firebase/database `ref()` — wraps a path so `child()`/`get()`
 * can compose it like the real SDK.
 * @param _db Unused database handle (kept for signature parity).
 * @param path Root path for the ref.
 * @returns A {__path} ref stand-in.
 */
export const ref = (_db: unknown, path = ''): MockRef => ({ __path: path })

/**
 * Mock of firebase/database `child()` — appends a segment to a ref's path.
 * @param r Parent ref.
 * @param path Child segment.
 * @returns A ref for the joined path.
 */
export const child = (r: MockRef, path: string): MockRef => ({ __path: `${r.__path}/${path}` })

/**
 * Mock of firebase/database `get()` — resolves the ref's path in the
 * snapshot and returns the SDK-shaped {exists, val} result.
 * @param r The ref to read.
 * @returns A snapshot-shaped promise.
 */
export const get = async (r: MockRef) => {
  const node = await getNode(r.__path)

  return { exists: () => node !== undefined && node !== null, val: () => node }
}

/**
 * Mock of firebase/database `set()` — persists the write to the local
 * overlay via the dev middleware, so CMS edits survive reloads.
 * @param r Target ref.
 * @param v Value that would be written.
 */
export const set = async (r: MockRef, v: unknown) => {
  devInfo('[CMS-MOCK] set', r.__path)

  await persist('set', r.__path, v)
}

/** Mock of firebase/database `remove()` — tombstones the key in the overlay. */
export const remove = async (r: MockRef) => {
  devInfo('[CMS-MOCK] remove', r.__path)

  await persist('remove', r.__path)
}

/** Mock of firebase/database `update()` — shallow-merges the patch into the overlay. */
export const update = async (r: MockRef, v: unknown) => {
  devInfo('[CMS-MOCK] update', r.__path)

  await persist('update', r.__path, v)
}

/** Mock of firebase/database `getDatabase()` — returns a marker handle. */
export const getDatabase = () => ({ __mock: true })

// ─── firebase.js surface ────────────────────────────────────────────────────
/** Fixed stand-in user so CMS screens render authenticated without OAuth. */
const MOCK_USER = Object.freeze({
  email: 'cms-dev@localhost',
  displayName: 'CMS Dev',
  uid: 'cms-mock',
})

/** The MOCK_USER shape. */
type MockUser = typeof MOCK_USER

/**
 * Mock onAuthChange — immediately reports the signed-in mock user and
 * returns a no-op unsubscribe.
 * @param cb The auth-state callback.
 */
export const onAuthChange = async (cb: (_user: MockUser | null) => void) => {
  cb(MOCK_USER)

  return () => {}
}

/** Mock getDbInstance — returns the marker handle (no SDK). */
export const getDbInstance = async () => ({ __mock: true })

/** Mock signInWithGoogle — resolves the mock user with no popup. */
export const signInWithGoogle = async () => MOCK_USER

/** Mock logoutUser — logs; the next onAuthChange still reports MOCK_USER. */
export const logoutUser = async () => devInfo('[CMS-MOCK] logout')

/**
 * Mock fetchFirebaseDb — reads straight from the committed snapshot.
 * @param path Slash-separated DB path.
 */
export const fetchFirebaseDb = async (path: string) => getNode(path)
