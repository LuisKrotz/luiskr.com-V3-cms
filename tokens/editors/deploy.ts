/**
 * @file @cms/tokens/deploy.js
 * @description Deploy-info classes — score badges and deploy report table.
 */

import { _B_CMS_DEPLOY, _B_CMS_SCORE } from '../base.js'

/**
 * Frozen cms deploy class-name map — sole declaration site for these tokens; consumers read
 * members and never re-declare the strings (zero-hardcoding rules 4–5). Object.freeze makes
 * the token contract immutable at runtime.
 */
export const CMS_DEPLOY_CLASSES = Object.freeze({
  CMS_SCORE: _B_CMS_SCORE,
  CMS_SCORE_GOOD: `${_B_CMS_SCORE}--good`,
  CMS_SCORE_WARN: `${_B_CMS_SCORE}--warn`,
  CMS_SCORE_BAD: `${_B_CMS_SCORE}--bad`,
  CMS_SCORE_INFO: `${_B_CMS_SCORE}--info`,
  CMS_DEPLOY_TABLE: `${_B_CMS_DEPLOY}-table`,
  CMS_DEPLOY_URL: `${_B_CMS_DEPLOY}-url`,
  CMS_GAUGES: `${_B_CMS_DEPLOY}-gauges`,
  CMS_GAUGE: `${_B_CMS_DEPLOY}-gauge`,
  CMS_GAUGE_NUM: `${_B_CMS_DEPLOY}-gauge-num`,
  CMS_GAUGE_LABEL: `${_B_CMS_DEPLOY}-gauge-label`,
  CMS_GAUGE_TRACK: `${_B_CMS_DEPLOY}-gauge-track`,
  CMS_GAUGE_FILL: `${_B_CMS_DEPLOY}-gauge-fill`,
  CMS_CHART: `${_B_CMS_DEPLOY}-chart`,
  CMS_CHART_ROW: `${_B_CMS_DEPLOY}-chart-row`,
  CMS_CHART_LABEL: `${_B_CMS_DEPLOY}-chart-label`,
  CMS_CHART_BAR: `${_B_CMS_DEPLOY}-chart-bar`,
  CMS_CHART_TRACK: `${_B_CMS_DEPLOY}-chart-track`,
  CMS_CHART_FILL: `${_B_CMS_DEPLOY}-chart-fill`,
  CMS_CHART_VAL: `${_B_CMS_DEPLOY}-chart-val`,
  CMS_CHART_LEGEND: `${_B_CMS_DEPLOY}-chart-legend`,
})
