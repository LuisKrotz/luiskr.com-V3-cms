/**
 * @file cms/deploy-info/types.ts — report shapes for the Deploy Info tab.
 * Mirrors the JSON written into dist/deploy-info/ by deploy-info.mjs.
 */
/* istanbul ignore file */

/**
 * Manifest index of the deploy-info bundle — `files` maps report names
 * to their JSON paths inside dist/deploy-info/, `generatedAt`/`commit` stamp
 * which build produced them.
 */
export interface DeployIndex {
  files?: Record<string, string>
  generatedAt?: string
  commit?: string
}

/**
 * Shape of the Lighthouse JSON summary — `urls` pairs each audited
 * URL with its category scores (performance, a11y, best-practices, SEO).
 */
export interface LighthouseReport {
  urls?: Array<{ url: string; scores: Record<string, number> }>
}

/**
 * Shape of the Jest coverage summary consumed by the Deploy Info tab —
 * `total` holds per-metric {covered,total,pct} aggregates (statements, branches,
 * functions, lines).
 */
export interface CoverageReport {
  total?: Record<string, { covered?: number; total?: number; pct?: number }>
}

/**
 * Shape of the axe-scan report — `engine` names the axe-core version and
 * `surfaces` lists each mounted DOM surface with its violations (id, impact, help)
 * so the CMS tab can render them grouped by page area.
 */
export interface AxeReport {
  engine?: string
  totals?: Record<string, number>
  surfaces?: Array<{
    surface: string
    violations?: Array<{ impact?: string; id?: string; help?: string }>
  }>
}

/**
 * Shape of the security-scan report — `scanner` records whether snyk or
 * yarn audit produced it, `ok` the gate outcome, `vulnerabilities` the advisory
 * rows (acceptedRisk marks entries waived via security-exceptions.json).
 */
export interface SnykReport {
  scanner?: string
  ok?: boolean
  totals?: Record<string, number>
  vulnerabilities?: Array<{
    packageName?: string
    severity?: string
    title?: string
    acceptedRisk?: boolean
    fixedIn?: string
  }>
}

/**
 * Shape of the console-scan gate output — `ok` is the pass/fail,
 * `violations` lists each `console.*` callsite found under src/ (file, line,
 * method) since src is a zero-console zone (AGENTS.md rule 12).
 */
export interface ConsoleScanReport {
  ok?: boolean
  totals?: Record<string, number>
  violations?: Array<{ file?: string; line?: number; method?: string }>
}

/**
 * One file-type rollup in the bundle-stats report — `bytes` is the
 * emitted (minified) size, `unminified` the pre-minification source
 * bytes recovered from sourcemap sourcesContent, `gzip`/`brotli` the
 * compressed wire sizes.
 */
export interface BundleBucket {
  files?: number
  bytes?: number
  unminified?: number
  gzip?: number
  brotli?: number
}

/**
 * One ES-target tier row — the js/css/misc buckets emitted under
 * dist/v/<tier>/ plus that tier's ten heaviest chunks.
 */
export interface BundleTier {
  name?: string
  js?: BundleBucket
  css?: BundleBucket
  misc?: BundleBucket
  largest?: Array<{ file?: string; bytes?: number }>
}

/** One wasm artifact crate row — .wasm module bytes + .js glue bytes. */
export interface WasmCrateStats {
  crate?: string
  files?: number
  wasmBytes?: number
  jsBytes?: number
  jsFiles?: number
}

/**
 * Shape of the bundle-stats report — the post-build dist/ inventory:
 * file-type totals (js/css/html/wasm/assets) with minified vs
 * unminified vs compressed bytes, per-tier rows, the per-crate wasm
 * table, prerendered-HTML grouped by top-level directory, and the
 * heaviest emitted chunks overall.
 */
export interface BundleStatsReport {
  generatedAt?: string
  totals?: {
    js?: BundleBucket
    css?: BundleBucket
    html?: BundleBucket
    wasm?: BundleBucket
    assets?: BundleBucket
  }
  tiers?: BundleTier[]
  wasm?: WasmCrateStats[]
  html?: BundleBucket & { byDir?: Array<{ dir?: string; files?: number; bytes?: number }> }
  largest?: Array<{ file?: string; bytes?: number }>
}

/**
 * Tri-state of the Deploy Info fetch: still `loading`, the bundle
 * is `missing` (no deploy-info/ in this build), or the index parsed `ready`.
 */
export type DeployFetchState = 'loading' | 'missing' | 'ready'
