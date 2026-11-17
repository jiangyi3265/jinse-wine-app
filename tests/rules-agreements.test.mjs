import test from 'node:test'
import assert from 'node:assert/strict'
import { availableRuleAgreements } from '../services/rules-content.js'

test('agreement consent only links to published documents with readable text', () => {
  assert.deepEqual(availableRuleAgreements(null), [])
  assert.deepEqual(availableRuleAgreements([
    { key: 'rules.service', content: [{ heading: '协议标题', lines: [] }] },
    { key: 'rules.privacy', content: '{invalid' },
  ]), [])
  const items = [{ key: 'rules.privacy', content: JSON.stringify([{ heading: '隐私', text: '可阅读的正文' }]) }]
  assert.deepEqual(availableRuleAgreements(items).map(item => item.type), ['privacy'])
  items.push({ key: 'rules.service', content: { sections: [{ heading: '服务', lines: ['服务正文'] }] } })
  assert.deepEqual(availableRuleAgreements(items).map(item => item.type), ['service', 'privacy'])
})
