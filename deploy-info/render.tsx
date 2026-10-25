/**
 * @file cms/deploy-info/render.tsx — report-wall JSX for the Build
 * tab: the last-build manifest metadata, score chips (Lighthouse
 * thresholds), the report sections, and the loading/missing gates.
 */

import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import { TYPE_STRINGS } from '@core/tokens/strings/types.js'
import { ARIA_ATTRS } from '@core/tokens/attrs/aria.js'
import { ATTR_VALUES } from '@core/tokens/attrs/values.js'
import { h } from '@core/jsx.js'
import { DEPLOY_INFO_BASE } from './data.js'
import type { CmsDeployInfo } from './CmsDeployInfo.js'
import type { BundleBucket, BundleStatsReport } from './types.js'
import { CMS_CARD_CLASSES, CMS_DEPLOY_CLASSES, CMS_FORM_CLASSES } from '@cms/tokens.js'

// Lighthouse-style thresholds: ≥0.9 renders green, ≥0.5 amber, below red
// — matches the colors a Lighthouse report shows for the same numbers.
const SCORE_GOOD_THRESHOLD = 0.9
const SCORE_WARN_THRESHOLD = 0.5

/** Lighthouse category keys in display order. */
const LIGHTHOUSE_KEYS = ['performance', 'accessibility', 'best-practices', 'seo']

/** Coverage-summary row keys in display order. */
const COVERAGE_KEYS = ['lines', 'statements', 'functions', 'branches']

/** The metric the per-module chart bars plot — line coverage, the head-line number. */
const LINES_METRIC = COVERAGE_KEYS[0]

/** Maps a 0–1 score to the green/amber/red chip class (Lighthouse conventions). */
export const scoreClass = (value: unknown): string => {
  if (typeof value !== TYPE_STRINGS.NUMBER) return CMS_DEPLOY_CLASSES.CMS_SCORE

  const score = value as number

  if (score >= SCORE_GOOD_THRESHOLD)
    return `${CMS_DEPLOY_CLASSES.CMS_SCORE} ${CMS_DEPLOY_CLASSES.CMS_SCORE_GOOD}`

  if (score >= SCORE_WARN_THRESHOLD)
    return `${CMS_DEPLOY_CLASSES.CMS_SCORE} ${CMS_DEPLOY_CLASSES.CMS_SCORE_WARN}`

  return `${CMS_DEPLOY_CLASSES.CMS_SCORE} ${CMS_DEPLOY_CLASSES.CMS_SCORE_BAD}`
}

/** Formats a 0–1 score as a whole percentage; non-numbers render an em-dash. */
export const pct = (value: unknown): string =>
  typeof value === TYPE_STRINGS.NUMBER
    ? `${Math.round((value as number) * 100)}`
    : CHAR_STRINGS.EM_DASH

/** Maps a 0–1 score to just the good/warn/bad tone modifier (chart fills). */
const scoreTone = (value: number): string =>
  value >= SCORE_GOOD_THRESHOLD
    ? CMS_DEPLOY_CLASSES.CMS_SCORE_GOOD
    : value >= SCORE_WARN_THRESHOLD
      ? CMS_DEPLOY_CLASSES.CMS_SCORE_WARN
      : CMS_DEPLOY_CLASSES.CMS_SCORE_BAD

/**
 * Gauge geometry — a 36-unit viewBox with r = 100 / 2π ≈ 15.9155 makes the
 * ring circumference exactly 100, so `stroke-dasharray` equals the score
 * percent directly (the same trick Lighthouse's own gauges use).
 */
const GAUGE_VIEWBOX = '0 0 36 36'
const GAUGE_CENTER = 18
const GAUGE_R = 15.9155

/**
 * One Lighthouse-style ring gauge — an SVG donut whose arc length is the
 * score percent, colored by the good/warn/bad thresholds, with the number
 * printed in the hole and the category label underneath. `role="img"` +
 * `aria-label` gives the graphic a text alternative; the score table below
 * stays as the full semantic fallback.
 * @param {string} label Category name (performance/accessibility/…).
 * @param {unknown} value 0–1 score; non-numbers render an empty ring + "—".
 */
const renderGauge = (label: string, value: unknown) => {
  const num = typeof value === TYPE_STRINGS.NUMBER ? (value as number) : null

  return (
    <span
      class={CMS_DEPLOY_CLASSES.CMS_GAUGE}
      role={ARIA_ATTRS.ROLE_IMG}
      aria-label={`${label} ${pct(value)}`}
    >
      <svg viewBox={GAUGE_VIEWBOX} aria-hidden={ATTR_VALUES.TRUE}>
        <circle
          class={CMS_DEPLOY_CLASSES.CMS_GAUGE_TRACK}
          cx={GAUGE_CENTER}
          cy={GAUGE_CENTER}
          r={GAUGE_R}
        />
        {num !== null ? (
          <circle
            class={`${CMS_DEPLOY_CLASSES.CMS_GAUGE_FILL} ${scoreTone(num)}`}
            cx={GAUGE_CENTER}
            cy={GAUGE_CENTER}
            r={GAUGE_R}
            style={{ strokeDasharray: `${num * 100} 100` }}
          />
        ) : null}
        <text class={CMS_DEPLOY_CLASSES.CMS_GAUGE_NUM} x={GAUGE_CENTER} y={GAUGE_CENTER}>
          {pct(value)}
        </text>
      </svg>
      <span class={CMS_DEPLOY_CLASSES.CMS_GAUGE_LABEL} aria-hidden={ATTR_VALUES.TRUE}>
        {label}
      </span>
    </span>
  )
}

/** Horizontal-bar geometry — 100-unit-wide svg so fill width equals percent. */
const BAR_VIEWBOX = '0 0 100 8'
const BAR_HEIGHT = 8

/**
 * One labeled horizontal bar — the label, a full-width track with a
 * proportional fill rect, and the formatted value. `preserveAspectRatio=none`
 * lets the svg stretch to the row while keeping the 0–100 scale.
 * @param {string} label Row label (metric name).
 * @param {number} frac Fill fraction 0–1 (clamped for safety).
 * @param {string} display Formatted value text shown at the row end.
 * @param {string} [tone] Modifier class for the fill color.
 */
const renderBar = (label: string, frac: number, display: string, tone: string) => (
  <div class={CMS_DEPLOY_CLASSES.CMS_CHART_ROW}>
    <span class={CMS_DEPLOY_CLASSES.CMS_CHART_LABEL}>{label}</span>
    <svg
      class={CMS_DEPLOY_CLASSES.CMS_CHART_BAR}
      viewBox={BAR_VIEWBOX}
      preserveAspectRatio={ATTR_VALUES.NONE}
      role={ARIA_ATTRS.ROLE_IMG}
      aria-label={`${label} ${display}`}
    >
      <rect
        class={CMS_DEPLOY_CLASSES.CMS_CHART_TRACK}
        x={0}
        y={0}
        width={100}
        height={BAR_HEIGHT}
      />
      <rect
        class={`${CMS_DEPLOY_CLASSES.CMS_CHART_FILL} ${tone}`}
        x={0}
        y={0}
        width={Math.min(1, Math.max(0, frac)) * 100}
        height={BAR_HEIGHT}
      />
    </svg>
    <span class={CMS_DEPLOY_CLASSES.CMS_CHART_VAL}>{display}</span>
  </div>
)

/**
 * Stacked distribution bar — one track split into proportional segments
 * (e.g. violations/potential/recommendation), with the legend printed as
 * text alongside so the graphic never carries meaning by color alone.
 * @param segments `[{label, count, tone}]` — counts needn't sum to 100;
 * they are normalized against their total.
 */
const renderStacked = (segments: Array<{ label: string; count: number; tone: string }>) => {
  const total = segments.reduce((acc, s) => acc + s.count, 0)

  if (!total) return null

  const label = segments.map((s) => `${s.label} ${s.count}`).join(', ')
  let x = 0

  return (
    <div class={CMS_DEPLOY_CLASSES.CMS_CHART}>
      <svg
        class={CMS_DEPLOY_CLASSES.CMS_CHART_BAR}
        viewBox={BAR_VIEWBOX}
        preserveAspectRatio={ATTR_VALUES.NONE}
        role={ARIA_ATTRS.ROLE_IMG}
        aria-label={label}
      >
        <rect
          class={CMS_DEPLOY_CLASSES.CMS_CHART_TRACK}
          x={0}
          y={0}
          width={100}
          height={BAR_HEIGHT}
        />
        {segments
          .filter((s) => s.count > 0)
          .map((s) => {
            const w = (s.count / total) * 100
            const rect = (
              <rect
                class={`${CMS_DEPLOY_CLASSES.CMS_CHART_FILL} ${s.tone}`}
                x={x}
                y={0}
                width={w}
                height={BAR_HEIGHT}
              />
            )
            x += w
            return rect
          })}
      </svg>
      <p class={CMS_DEPLOY_CLASSES.CMS_CHART_LEGEND}>{label}</p>
    </div>
  )
}

/** Renders the score chips for one Lighthouse category set. */
export const renderScores = (scores: Record<string, number> | undefined) => {
  if (!scores) return null

  return LIGHTHOUSE_KEYS.map((key) => (
    <td>
      <span class={scoreClass(scores[key])}>{pct(scores[key])}</span>
    </td>
  ))
}

/** Renders the Lighthouse section (scores + failing audits). */
export const renderLighthouse = (host: CmsDeployInfo) => {
  if (!host.lighthouse?.urls?.length) {
    return <p className={CMS_FORM_CLASSES.CMS_HINT}>No Lighthouse data in this build bundle.</p>
  }

  return (
    <div>
      {host.lighthouse.urls.map((entry) => (
        <div class={CMS_DEPLOY_CLASSES.CMS_CHART}>
          <p class={CMS_CARD_CLASSES.CMS_CARD_SUBTITLE}>{entry.url}</p>
          <div class={CMS_DEPLOY_CLASSES.CMS_GAUGES}>
            {LIGHTHOUSE_KEYS.map((key) => renderGauge(key, entry.scores?.[key]))}
          </div>
        </div>
      ))}
      <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
        <thead>
          <tr>
            <th>URL</th>
            <th>Perf</th>
            <th>A11y</th>
            <th>Best</th>
            <th>SEO</th>
          </tr>
        </thead>
        <tbody>
          {host.lighthouse.urls.map((entry) => (
            <tr>
              <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{entry.url}</td>
              {renderScores(entry.scores)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Renders the Jest coverage summary table plus the per-module rollup. */
export const renderCoverage = (host: CmsDeployInfo) => {
  const report = host.coverage

  if (!report?.total) {
    return <p className={CMS_FORM_CLASSES.CMS_HINT}>No coverage data in this build bundle.</p>
  }

  const total = report.total
  const modules = Object.entries(report.modules || {})

  return (
    <div>
      <div class={CMS_DEPLOY_CLASSES.CMS_CHART}>
        {COVERAGE_KEYS.map((key) =>
          renderBar(
            key,
            (total[key]?.pct ?? 0) / 100,
            `${total[key]?.pct ?? CHAR_STRINGS.EM_DASH}`,
            scoreTone((total[key]?.pct ?? 0) / 100)
          )
        )}
      </div>
      <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Covered</th>
            <th>Total</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {COVERAGE_KEYS.map((key) => (
            <tr>
              <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{key}</td>
              <td>{total[key]?.covered ?? CHAR_STRINGS.EM_DASH}</td>
              <td>{total[key]?.total ?? CHAR_STRINGS.EM_DASH}</td>
              <td>
                <span class={scoreClass((total[key]?.pct ?? 0) / 100)}>
                  {total[key]?.pct ?? CHAR_STRINGS.EM_DASH}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modules.length ? (
        <div class={CMS_DEPLOY_CLASSES.CMS_CHART}>
          {modules.map(([name, row]) =>
            renderBar(
              name,
              (row[LINES_METRIC]?.pct ?? 0) / 100,
              `${row[LINES_METRIC]?.pct ?? CHAR_STRINGS.EM_DASH}`,
              scoreTone((row[LINES_METRIC]?.pct ?? 0) / 100)
            )
          )}
        </div>
      ) : null}

      {modules.length ? (
        <div>
          <h4 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Per module</h4>
          <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
            <thead>
              <tr>
                <th>Module</th>
                {COVERAGE_KEYS.map((key) => (
                  <th>{key} %</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map(([name, row]) => (
                <tr>
                  <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{name}</td>
                  {COVERAGE_KEYS.map((key) => (
                    <td>
                      <span class={scoreClass((row[key]?.pct ?? 0) / 100)}>
                        {row[key]?.pct ?? CHAR_STRINGS.EM_DASH}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

/** Renders the axe-core accessibility scan (violations grouped by surface). */
export const renderAxe = (host: CmsDeployInfo) => {
  if (!host.axe) {
    return <p className={CMS_FORM_CLASSES.CMS_HINT}>No accessibility scan in this build bundle.</p>
  }

  const t: Record<string, number> = host.axe.totals || {}
  const surfaces = host.axe.surfaces || []

  return (
    <div>
      <p className={CMS_CARD_CLASSES.CMS_CARD_SUBTITLE}>
        {host.axe.engine} · {t.violations ?? 0} violations ({t.criticalOrSerious ?? 0}{' '}
        critical/serious) · {t.passes ?? 0} rules passed · {t.incomplete ?? 0} needs-review
      </p>
      {renderStacked([
        { label: 'violations', count: t.violations ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_BAD },
        {
          label: 'needs-review',
          count: t.incomplete ?? 0,
          tone: CMS_DEPLOY_CLASSES.CMS_SCORE_WARN,
        },
        { label: 'passed', count: t.passes ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_GOOD },
      ])}
      {surfaces.some((s) => s.violations?.length) ? (
        <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
          <thead>
            <tr>
              <th>Surface</th>
              <th>Impact</th>
              <th>Rule</th>
              <th>Issue</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.flatMap((s) =>
              (s.violations || []).map((v) => (
                <tr>
                  <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{s.surface}</td>
                  <td>
                    <span
                      class={scoreClass(
                        v.impact === 'critical' || v.impact === 'serious' ? 0 : 0.6
                      )}
                    >
                      {v.impact}
                    </span>
                  </td>
                  <td>{v.id}</td>
                  <td>{v.help}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : (
        <p className={CMS_FORM_CLASSES.CMS_HINT}>Zero violations on all scanned surfaces.</p>
      )}
    </div>
  )
}

/** Maps an IBM finding level to the red/amber/green chip (violations red, potentials amber). */
const a11yLevelClass = (level: unknown): string =>
  scoreClass(level === 'violation' ? 0 : level === 'potentialviolation' ? 0.6 : 1)

/** Renders the IBM Equal Access full-site scan — totals, per-rule rollup, flagged routes. */
export const renderA11y = (host: CmsDeployInfo) => {
  const a = host.a11y

  if (!a) {
    return (
      <p className={CMS_FORM_CLASSES.CMS_HINT}>No IBM accessibility scan in this build bundle.</p>
    )
  }

  const t: Record<string, number> = a.totals || {}
  const rules = a.rules || []
  const routes = a.routes || []

  return (
    <div>
      <p className={CMS_CARD_CLASSES.CMS_CARD_SUBTITLE}>
        {a.engine} · {a.pages ?? 0} routes — {t.violation ?? 0} violations,{' '}
        {t.potentialviolation ?? 0} potential, {t.recommendation ?? 0} recommendations,{' '}
        {t.manual ?? 0} manual · {t.gated ?? 0} unreviewed
        {t.errors ? ` · ${t.errors} scan errors` : CHAR_STRINGS.EMPTY}
        {t.gated ? ' · gate FAILED' : ' · gate passed'}
      </p>
      {renderStacked([
        { label: 'violations', count: t.violation ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_BAD },
        {
          label: 'potential',
          count: t.potentialviolation ?? 0,
          tone: CMS_DEPLOY_CLASSES.CMS_SCORE_WARN,
        },
        {
          label: 'recommendations',
          count: t.recommendation ?? 0,
          tone: CMS_DEPLOY_CLASSES.CMS_SCORE_INFO,
        },
        { label: 'manual', count: t.manual ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_GOOD },
      ])}
      {rules.length ? (
        <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
          <thead>
            <tr>
              <th>Level</th>
              <th>Rule</th>
              <th>Findings</th>
              <th>Pages</th>
              <th>Check</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr>
                <td>
                  <span class={a11yLevelClass(r.level)}>{r.level}</span>
                </td>
                <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{r.ruleId}</td>
                <td>{r.count}</td>
                <td>{r.pages}</td>
                <td>{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={CMS_FORM_CLASSES.CMS_HINT}>Zero findings on all scanned routes.</p>
      )}
      {routes.length ? (
        <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
          <thead>
            <tr>
              <th>Route</th>
              <th>Viol</th>
              <th>Potential</th>
              <th>Rec</th>
              <th>Unreviewed</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr>
                <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{r.route}</td>
                <td>{r.violation ?? CHAR_STRINGS.EM_DASH}</td>
                <td>{r.potentialviolation ?? CHAR_STRINGS.EM_DASH}</td>
                <td>{r.recommendation ?? CHAR_STRINGS.EM_DASH}</td>
                <td>
                  <span class={scoreClass(r.gated ? 0 : 1)}>{r.gated ?? 0}</span>
                  {r.error ? ` — ${r.error}` : CHAR_STRINGS.EMPTY}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={CMS_FORM_CLASSES.CMS_HINT}>Every scanned route is clean of gated findings.</p>
      )}
    </div>
  )
}

/** Renders the dependency vulnerability scan (Snyk or yarn-audit fallback). */
export const renderSnyk = (host: CmsDeployInfo) => {
  if (!host.snyk) {
    return <p className={CMS_FORM_CLASSES.CMS_HINT}>No dependency scan in this build bundle.</p>
  }

  const t: Record<string, number> = host.snyk.totals || {}
  const vulns = host.snyk.vulnerabilities || []

  return (
    <div>
      <p className={CMS_CARD_CLASSES.CMS_CARD_SUBTITLE}>
        {host.snyk.scanner} · {t.total ?? 0} vulns — critical {t.critical ?? 0}, high {t.high ?? 0},
        moderate {t.moderate ?? 0}, low {t.low ?? 0}
        {host.snyk.ok ? ' · gate passed' : ' · gate FAILED'}
      </p>
      {renderStacked([
        { label: 'critical', count: t.critical ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_BAD },
        { label: 'high', count: t.high ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_BAD },
        { label: 'moderate', count: t.moderate ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_WARN },
        { label: 'low', count: t.low ?? 0, tone: CMS_DEPLOY_CLASSES.CMS_SCORE_INFO },
      ])}
      {vulns.length ? (
        <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
          <thead>
            <tr>
              <th>Package</th>
              <th>Severity</th>
              <th>Issue</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            {vulns.map((v) => (
              <tr>
                <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{v.packageName}</td>
                <td>
                  <span
                    class={scoreClass(v.severity === 'high' || v.severity === 'critical' ? 0 : 0.6)}
                  >
                    {v.severity}
                  </span>
                </td>
                <td>
                  {v.title}
                  {v.acceptedRisk ? ' · accepted risk' : CHAR_STRINGS.EMPTY}
                </td>
                <td>{v.fixedIn || 'none'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={CMS_FORM_CLASSES.CMS_HINT}>No known vulnerabilities in dependencies.</p>
      )}
    </div>
  )
}

/** Byte-size units for the bundle tables — KB/MB/GB with one decimal. */
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB']

/**
 * Formats a byte count as a compact human size (B/KB/MB/GB, one
 * decimal past the byte unit); non-numbers render an em-dash.
 * @param {unknown} value Byte count from the bundle-stats report.
 * @returns {string} The formatted size.
 */
export const fmtBytes = (value: unknown): string => {
  if (typeof value !== TYPE_STRINGS.NUMBER) return CHAR_STRINGS.EM_DASH

  let n = value as number
  let unit = 0

  while (n >= 1024 && unit < BYTE_UNITS.length - 1) {
    n /= 1024
    unit += 1
  }

  return `${unit ? n.toFixed(1) : Math.round(n)} ${BYTE_UNITS[unit]}`
}

/** Bundle-rollup row order — the file-type totals in display order. */
const BUNDLE_TOTAL_KEYS: Array<[string, keyof NonNullable<BundleStatsReport['totals']>]> = [
  ['JavaScript', 'js'],
  ['CSS', 'css'],
  ['HTML', 'html'],
  ['Wasm', 'wasm'],
  ['Other assets', 'assets'],
]

/** One size row for a bucket — files, minified, unminified, gzip, brotli. */
const bundleRow = (label: string, bucket: BundleBucket | undefined) => (
  <tr>
    <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{label}</td>
    <td>{bucket?.files ?? CHAR_STRINGS.EM_DASH}</td>
    <td>{fmtBytes(bucket?.bytes)}</td>
    <td>{fmtBytes(bucket?.unminified)}</td>
    <td>{fmtBytes(bucket?.gzip)}</td>
    <td>{fmtBytes(bucket?.brotli)}</td>
  </tr>
)

/** Renders the post-build bundle inventory (emitted sizes per type, tier, crate). */
export const renderBundle = (host: CmsDeployInfo) => {
  const b = host.bundle

  if (!b?.totals) {
    return <p className={CMS_FORM_CLASSES.CMS_HINT}>No bundle stats in this build bundle.</p>
  }

  const totals = b.totals
  const tiers = b.tiers || []
  const crates = b.wasm || []
  const largest = b.largest || []
  const byDir = b.html?.byDir || []
  const maxBytes = Math.max(1, ...BUNDLE_TOTAL_KEYS.map(([, key]) => totals[key]?.bytes ?? 0))

  return (
    <div>
      <div class={CMS_DEPLOY_CLASSES.CMS_CHART}>
        {BUNDLE_TOTAL_KEYS.map(([label, key]) =>
          renderBar(
            label,
            (totals[key]?.bytes ?? 0) / maxBytes,
            fmtBytes(totals[key]?.bytes),
            CMS_DEPLOY_CLASSES.CMS_SCORE_INFO
          )
        )}
      </div>
      <h4 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Totals (all emitted output)</h4>
      <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Files</th>
            <th>Minified</th>
            <th>Unminified</th>
            <th>Gzip</th>
            <th>Brotli</th>
          </tr>
        </thead>
        <tbody>{BUNDLE_TOTAL_KEYS.map(([label, key]) => bundleRow(label, totals[key]))}</tbody>
      </table>

      <h4 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Per engine tier</h4>
      <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
        <thead>
          <tr>
            <th>Tier</th>
            <th>JS files</th>
            <th>JS min</th>
            <th>JS unmin</th>
            <th>JS br</th>
            <th>CSS min</th>
            <th>CSS unmin</th>
            <th>CSS br</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr>
              <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{t.name}</td>
              <td>{t.js?.files ?? CHAR_STRINGS.EM_DASH}</td>
              <td>{fmtBytes(t.js?.bytes)}</td>
              <td>{fmtBytes(t.js?.unminified)}</td>
              <td>{fmtBytes(t.js?.brotli)}</td>
              <td>{fmtBytes(t.css?.bytes)}</td>
              <td>{fmtBytes(t.css?.unminified)}</td>
              <td>{fmtBytes(t.css?.brotli)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>WASM artifacts</h4>
      <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
        <thead>
          <tr>
            <th>Crate</th>
            <th>Files</th>
            <th>.wasm</th>
            <th>JS glue</th>
          </tr>
        </thead>
        <tbody>
          {crates.map((c) => (
            <tr>
              <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{c.crate}</td>
              <td>{c.files ?? CHAR_STRINGS.EM_DASH}</td>
              <td>{fmtBytes(c.wasmBytes)}</td>
              <td>{fmtBytes(c.jsBytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {byDir.length ? (
        <div>
          <h4 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Prerendered HTML by directory</h4>
          <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
            <thead>
              <tr>
                <th>Directory</th>
                <th>Pages</th>
                <th>Bytes</th>
              </tr>
            </thead>
            <tbody>
              {byDir.map((d) => (
                <tr>
                  <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{d.dir}</td>
                  <td>{d.files}</td>
                  <td>{fmtBytes(d.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {largest.length ? (
        <div>
          <h4 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Largest emitted chunks</h4>
          <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
            <thead>
              <tr>
                <th>File</th>
                <th>Minified</th>
              </tr>
            </thead>
            <tbody>
              {largest.map((f) => (
                <tr>
                  <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{f.file}</td>
                  <td>{fmtBytes(f.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

/** Renders the console.* usage scan (debug-leftover policy). */
export const renderConsoleScan = (host: CmsDeployInfo) => {
  if (!host.consoleScan) {
    return <p className={CMS_FORM_CLASSES.CMS_HINT}>No console scan in this build bundle.</p>
  }

  const t: Record<string, number> = host.consoleScan.totals || {}
  const violations = host.consoleScan.violations || []

  return (
    <div>
      <p className={CMS_CARD_CLASSES.CMS_CARD_SUBTITLE}>
        {t.callsites ?? 0} callsites — {t.warn ?? 0} warn, {t.error ?? 0} error, {t.exempted ?? 0}{' '}
        exempted · {t.violations ?? 0} violations
        {host.consoleScan.ok ? ' · gate passed' : ' · gate FAILED'}
      </p>
      {violations.length ? (
        <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
          <thead>
            <tr>
              <th>File</th>
              <th>Line</th>
              <th>Call</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => (
              <tr>
                <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{v.file}</td>
                <td>{v.line}</td>
                <td>console.{v.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={CMS_FORM_CLASSES.CMS_HINT}>No forbidden console.* usage detected.</p>
      )}
    </div>
  )
}

/**
 * Renders the last-build manifest metadata — generation timestamp, commit
 * sha, and the inventory of report files the bundle carries.
 */
export const renderBuildMeta = (host: CmsDeployInfo) => {
  const files = Object.entries(host.index?.files || {})

  return (
    <div>
      <p className={CMS_CARD_CLASSES.CMS_CARD_SUBTITLE}>
        Generated {host.index?.generatedAt ?? CHAR_STRINGS.EM_DASH}
        {host.index?.commit ? ` · commit ${host.index.commit}` : CHAR_STRINGS.EMPTY}
      </p>
      {files.length ? (
        <table className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_TABLE}>
          <thead>
            <tr>
              <th>Report</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            {files.map(([name, file]) => (
              <tr>
                <td className={CMS_DEPLOY_CLASSES.CMS_DEPLOY_URL}>{name}</td>
                <td>{file}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={CMS_FORM_CLASSES.CMS_HINT}>No report files listed in the bundle manifest.</p>
      )}
    </div>
  )
}

/** JSX template — loading/missing gates then the report wall. */
export const renderDeployInfo = (host: CmsDeployInfo) => {
  if (host._fetchState === 'loading') {
    return (
      <section className={CMS_CARD_CLASSES.CMS_CARD}>
        <h2 className={CMS_CARD_CLASSES.CMS_CARD_TITLE}>Build</h2>
        <p className={CMS_FORM_CLASSES.CMS_HINT}>Loading last build bundle…</p>
      </section>
    )
  }

  if (host._fetchState === 'missing') {
    return (
      <section className={CMS_CARD_CLASSES.CMS_CARD}>
        <h2 className={CMS_CARD_CLASSES.CMS_CARD_TITLE}>Build</h2>
        <p className={CMS_FORM_CLASSES.CMS_HINT}>
          No build bundle found at {DEPLOY_INFO_BASE}/ — run yarn deploy:info (or yarn build) to
          generate the quality reports.
        </p>
      </section>
    )
  }

  return (
    <section className={CMS_CARD_CLASSES.CMS_CARD}>
      <h2 className={CMS_CARD_CLASSES.CMS_CARD_TITLE}>Build</h2>

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Last build</h3>
      {renderBuildMeta(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Lighthouse (last run)</h3>
      {renderLighthouse(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Jest Coverage</h3>
      {renderCoverage(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Bundle (last build)</h3>
      {renderBundle(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Accessibility Scan (axe-core)</h3>
      {renderAxe(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>
        Accessibility Scan (IBM Equal Access)
      </h3>
      {renderA11y(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Dependency Scan</h3>
      {renderSnyk(host)}

      <h3 className={CMS_FORM_CLASSES.CMS_SUBSECTION_TITLE}>Console Usage Scan</h3>
      {renderConsoleScan(host)}
    </section>
  )
}
