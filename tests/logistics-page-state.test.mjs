import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { orderStatusLabel, deliveryStatusLabel } from '../services/navigation.js'

function setup(status, deliveryResult) {
  let requests = 0
  const page = loadPageScript('logistics', {
    vue,
    '@dcloudio/uni-app': { onLoad() {} },
    '../../services/navigation.js': { contact() {}, go() {}, orderStatusLabel, deliveryStatusLabel },
    '../../services/store.js': {
      refreshOrder: async () => ({ id: 'review-order', status, fulfillmentMode: 'delivery' }),
      loadOrderDelivery: async () => { requests++; if (deliveryResult instanceof Error) throw deliveryResult; return deliveryResult },
    },
  })
  page.id.value = 'review-order'
  return { page, requests: () => requests }
}

test('cancelled and unpaid orders never appear as waiting for shipment', async () => {
  for (const [status, expected] of [['cancelled', '已取消'], ['pending', '待付款']]) {
    const { page, requests } = setup(status)
    await page.loadDelivery()
    assert.equal(page.statusTitle.value, expected)
    assert.equal(requests(), 0)
    assert.equal(page.error.value, '')
  }
})

test('missing tracking for a shipped order stays an actionable error', async () => {
  const failure = Object.assign(new Error('物流数据暂不可用'), { statusCode: 404 })
  const shipped = setup('shipping', failure).page
  await shipped.loadDelivery()
  assert.equal(shipped.error.value, '物流数据暂不可用')
  const paid = setup('paid', failure).page
  await paid.loadDelivery()
  assert.equal(paid.error.value, '')
  assert.equal(paid.statusTitle.value, '待发货')
})
