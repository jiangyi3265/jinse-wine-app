import test from 'node:test'
import assert from 'node:assert/strict'
import { referralSummary, referralGuide } from '../services/referral-summary.js'

test('product rebate summary follows editable rule changes without hardcoded financial promises', () => {
  const content = [{ heading: '专属分享', lines: ['先建立推荐关系'] }, { heading: '5% 推荐奖励', lines: ['有效订单按实付金额5%计佣。', '收货7天后结算。'] }]
  assert.deepEqual(referralSummary(content), content[1].lines)
  const changed = { sections: [{ title: '推荐奖励', text: '活动暂停，请等待新规则。' }] }
  assert.deepEqual(referralSummary(JSON.stringify(changed)), ['活动暂停，请等待新规则。'])
  for (const missing of [undefined, null, '', 'invalid json', {}, [{ heading: '专属分享', lines: ['仅分享不计佣'] }]]) assert.deepEqual(referralSummary(missing), [])
})

test('expanded distribution guide retains eligibility, refund and payout conditions as the policy changes', () => {
  const sections = [
    { heading: '专属分享', lines: ['已有推荐关系保持不变。', '分享本身不计佣。'] },
    { heading: '推荐奖励', lines: ['奖励按新规则计算。', '退款冲回佣金。'] },
    { heading: '查看与提现', lines: ['提现需财务处理，以付款记录为准。'] },
  ]
  assert.deepEqual(referralGuide(JSON.stringify({ sections })), sections)
  assert.deepEqual(referralGuide([{ heading: '活动调整', lines: ['活动暂停，请等待新规则。'] }]), [{ heading: '活动调整', lines: ['活动暂停，请等待新规则。'] }])
  for (const missing of [null, '', 'invalid json', {}, [{ heading: '空标题', lines: [] }]]) assert.deepEqual(referralGuide(missing), [])
})
