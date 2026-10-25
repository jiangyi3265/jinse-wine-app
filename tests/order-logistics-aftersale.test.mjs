import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { orderStatusLabel, deliveryStatusLabel } from '../services/navigation.js'

function harness(handler = async () => ({})) {
  const calls = [], messages = []
  const order = { id: 'order-1', status: 'receiving', items: [{ orderItemId: 11, name: '测试酒', quantity: 3 }] }
  const page = loadPageScript('aftersale', {
    vue, '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../services/api.js': { request: async (path, options) => { calls.push({ path, options }); return handler(path, options) } },
    '../../services/store.js': { refreshOrder: async () => order },
    '../../services/config.js': { isApiMode: () => true },
    '../../services/navigation.js': { confirm: async () => true, dateLabel: String, toast: message => messages.push(message) },
    '../../services/pricing.js': { money: String },
  })
  page.id.value = order.id; page.order.value = order
  page.reservedQuantities.value = { '11': 0 }
  return { page, calls, messages, order }
}

test('paid orders display awaiting shipment and signed orders retain pending receipt', () => {
  assert.equal(orderStatusLabel({ status: 'paid', fulfillmentMode: 'delivery' }), '待发货')
  assert.equal(orderStatusLabel({ status: 'receiving' }), '待收货')
  assert.equal(deliveryStatusLabel('signed'), '已签收，待确认收货')
  assert.equal(deliveryStatusLabel('agent_signed'), '已代签收，请核对取件')
})

test('aftersale validates product, quantity and reason before a write', async () => {
  const h = harness()
  h.page.form.quantity = '4'; await h.page.apply()
  assert.equal(h.calls.length, 0); assert.equal(h.messages.at(-1), '请输入有效的售后数量')
  h.page.form.quantity = '1'; await h.page.apply()
  assert.equal(h.calls.length, 0); assert.equal(h.messages.at(-1), '请填写售后原因')
})

test('unknown aftersale response retries with the same key and changed input receives a new key', async () => {
  const h = harness(async () => { throw new Error('网络超时') })
  h.page.form.reason = '破损'; await h.page.apply(); await h.page.apply()
  assert.equal(h.calls[0].options.requestId, h.calls[1].options.requestId)
  h.page.form.reason = '规格不合适'; await h.page.apply()
  assert.notEqual(h.calls[1].options.requestId, h.calls[2].options.requestId)
  assert.equal(h.page.busy.value, false)
})

test('available quantity uses the server summary across pages including legacy receipts', () => {
  const h = harness()
  h.page.records.value = [{ orderItemId: 11, quantity: 1, status: 'rejected' }]
  h.page.reservedQuantities.value = { '11': 2 }
  assert.equal(h.page.availableQuantity.value, 1)
  h.page.records.value = []
  assert.equal(h.page.availableQuantity.value, 1)
})

test('late detail response cannot replace the current case', async () => {
  let first
  const h = harness(path => path.endsWith('/1') ? new Promise(resolve => { first = resolve }) : Promise.resolve({ id: 2 }))
  const old = h.page.showDetail(1)
  await h.page.showDetail(2)
  first({ id: 1 }); await old
  assert.equal(h.page.detail.value.id, 2)
})

test('aftersale pages send pagination and retain quantity reservations on page two', async () => {
  const h = harness((path, options) => ({ rows: [{ id: options.data.pageNum }], total: 25, reservedQuantities: { '11': 2 } }))
  await h.page.load()
  assert.equal(h.page.total.value, 25)
  await h.page.load(2)
  assert.equal(h.calls.at(-1).options.data.pageNum, 2)
  assert.equal(h.calls.at(-1).options.data.pageSize, 20)
  assert.equal(h.page.pageNum.value, 2)
  assert.equal(h.page.pageCount.value, 2)
  assert.equal(h.page.records.value[0].id, 2)
  assert.equal(h.page.availableQuantity.value, 1)
})

test('a shrinking result moves to the last remaining page', async () => {
  const h = harness((path, options) => ({ rows: options.data.pageNum === 3 ? [] : [{ id: 1 }], total: 21, reservedQuantities: { '11': 0 } }))
  await h.page.load(3)
  assert.equal(h.calls.length, 2)
  assert.equal(h.calls.at(-1).options.data.pageNum, 2)
  assert.equal(h.page.pageNum.value, 2)
  assert.equal(h.page.records.value[0].id, 1)
})

test('missing quantity summary blocks application rather than using a partial page', async () => {
  const h = harness(() => ({ rows: [], total: 0, reservedQuantities: {} }))
  await h.page.load()
  assert.equal(h.page.loadError.value, '售后数据不完整，请重新加载')
  h.page.form.reason = '破损'
  await h.page.apply()
  assert.equal(h.calls.length, 1)
  assert.equal(h.page.loading.value, false)
})

test('failed pagination retains the committed page and retry recovers', async () => {
  let fail = true
  const h = harness((path, options) => {
    if (options.data.pageNum === 2 && fail) throw new Error('网络超时')
    return { rows: [{ id: options.data.pageNum }], total: 21, reservedQuantities: { '11': 0 } }
  })
  await h.page.load()
  await h.page.load(2)
  assert.equal(h.page.pageNum.value, 1)
  assert.equal(h.page.records.value[0].id, 1)
  assert.equal(h.page.loadError.value, '网络超时')
  fail = false
  await h.page.load(2)
  assert.equal(h.page.pageNum.value, 2)
  assert.equal(h.page.loadError.value, '')
})

test('closing detail invalidates an in-flight response', async () => {
  let resolve
  const h = harness(() => new Promise(done => { resolve = done }))
  const task = h.page.showDetail(1)
  h.page.closeDetail()
  resolve({ id: 1 })
  await task
  assert.equal(h.page.detail.value, null)
})
