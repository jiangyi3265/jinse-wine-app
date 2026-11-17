import test from 'node:test'
import assert from 'node:assert/strict'
import { claimCampaignPopup, campaignRuleSummary } from '../services/campaign-popup.js'
test('campaign popup waits for enabled remote content and opens only once per session', () => {
  assert.equal(claimCampaignPopup(null), false)
  assert.equal(claimCampaignPopup({ enabled: false }), false)
  assert.equal(claimCampaignPopup({ enabled: true }), true)
  assert.equal(claimCampaignPopup({ enabled: true }), false)
})

test('popup summary preserves current CMS conditions and omits empty sections', () => {
  const sections = [
    { heading: '尚未配置', lines: [] },
    { heading: '领取优惠', lines: ['仅指定会员可领取，每人限一次。', '七日内有效。'] },
    { heading: '使用条件', lines: ['至少购买两件才可使用，不与其他券叠加。'] },
    { heading: '售后处理', lines: ['退款规则请查看完整说明。'] },
  ]
  assert.deepEqual(campaignRuleSummary(JSON.stringify({ sections })), [
    { heading: '领取优惠', line: sections[1].lines[0] },
    { heading: '使用条件', line: sections[2].lines[0] },
  ])
  sections[1].lines[0] = '每人限两次。'
  assert.equal(campaignRuleSummary(sections)[0].line, '每人限两次。')
})

test('popup with missing or malformed rules never invents campaign conditions', () => {
  for (const content of [null, undefined, 'not json', {}, { sections: [{ text: '' }] }]) {
    assert.deepEqual(campaignRuleSummary(content), [])
  }
})
