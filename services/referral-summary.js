import { normalizeRuleContent } from './rules-content.js'

// Keep the product card tied to the same editable rules as the full dialog.
// Never fabricate a rate or settlement time if the rule cannot be read.
export function referralSummary(content) {
  const { sections } = normalizeRuleContent(content, 'promotion')
  const reward = sections.find(section => /推荐奖励|返利|计佣|佣金|推荐收益/.test(section.heading) && section.lines.length)
  return reward?.lines || []
}

// Preserve eligibility and payout conditions from the same editable policy.
export function referralGuide(content) {
  return normalizeRuleContent(content, 'promotion').sections.filter(section => section.lines.length)
}
