import test from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../services/config.js'
import { loadPointsContent, normalizeExchangeDetails, rewardExchangeDetail } from '../services/points-content.js'

test('voucher details stay paired with their full exchange codes and resolve server images', () => {
  config.mode = 'api'
  config.apiBaseUrl = 'https://shop.example'
  const details = normalizeExchangeDetails({ items: [null, { code: 'zoo', venue: '动物园', sections: [{ title: '使用地点', text: '动物园入口核销' }], images: [null, { url: '/photo.jpg', caption: '入口' }, { url: 9 }] }, { code: 'zoo-special', venue: '特别体验' }] })
  assert.equal(Object.keys(details).length, 2)
  assert.deepEqual(details.zoo.images, [{ url: 'https://shop.example/photo.jpg', caption: '入口' }])
  assert.deepEqual(details.zoo.sections, [{ heading: '使用地点', lines: ['动物园入口核销'] }])
  assert.equal(rewardExchangeDetail({ kind: 'voucher', code: 'EX-zoo-special-012345' }, details).venue, '特别体验')
  assert.equal(rewardExchangeDetail({ kind: 'ticket', code: 'EX-zoo-012345' }, details), null)
  assert.equal(rewardExchangeDetail({ kind: 'voucher', code: 'other-zoo-012345' }, details), null)
  assert.deepEqual(normalizeExchangeDetails(null), {})
})

test('points content uses the maintained rules, handles missing content and surfaces network failure', async () => {
  config.mode = 'api'
  const previousUni = globalThis.uni
  let response = { statusCode: 200, data: { code: 0, data: [
    { key: 'rules.points', content: [{ title: '消费累积', text: '确认收货后入账' }] },
    { key: 'exchange.details', content: { items: [{ code: 'hotel', venue: '酒店' }] } },
  ] } }
  globalThis.uni = { request: async () => response }
  try {
    const loaded = await loadPointsContent()
    assert.equal(loaded.guide[0].lines[0], '确认收货后入账')
    assert.equal(loaded.details.hotel.venue, '酒店')
    response.data.data = []
    assert.deepEqual(await loadPointsContent(), { guide: [], details: {} })
    response = { statusCode: 503, data: { code: 503 } }
    await assert.rejects(loadPointsContent())
  } finally { globalThis.uni = previousUni }
})
