// Show the configured campaign once during this app session. The persistent
// rules entry remains available after the campaign is dismissed.
let shown = false
export function claimCampaignPopup(content) {
  if (shown || content?.enabled !== true) return false
  shown = true
  return true
}
import { normalizeRuleContent } from './rules-content.js'


// Keep the first two populated sections verbatim. The full rules entry exposes
// every condition; the promotion must not supply its own reward promises.
export function campaignRuleSummary(content) {
  return normalizeRuleContent(content, 'campaign').sections
    .filter(section => section.lines.length)
    .slice(0, 2)
    .map(section => ({ heading: section.heading, line: section.lines[0] }))
}
