import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPageScript } from './helpers/page-script.mjs'
import * as vue from 'vue'
import { orderStatusLabel, deliveryStatusLabel } from '../services/navigation.js'
import { useMemberList } from '../services/member-list.js'

// Execute the actual page handlers with mocked service boundaries. This catches
// missing imports and races in the UI, which store-only tests do not exercise.
function pageHarness(page, { confirm = async () => true, mutate = async () => {}, loadDelivery = async () => null,
  refreshOrder = null, syncPaymentOrder = null, onRefund = () => {}, refundStatus = 'pending', onPay = async () => {} } = {}) {
  const calls = [], messages = []
  const order = vue.reactive({ id: 'page-order', status: 'pending', total: 1000 })
  const store = {
    state: vue.reactive({ orders: [order] }),
    setOrderStatus: async (...args) => { calls.push(args); await mutate(); order.status = args[1] },
    refreshDomain: async () => {}, refreshOrder: refreshOrder || (async () => order),
    syncPaymentOrder: syncPaymentOrder || (async () => order),
    payOrder: onPay, loadOrderDelivery: loadDelivery, loadPickupCode: async () => '',
    requestRefund: async (...args) => { calls.push(['refund', ...args]); await mutate(); onRefund(order); return { status: refundStatus } },
  }
  const modules = {
    vue,
    '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../services/store.js': store,
    '../../services/member-list.js': { useMemberList: (domain, options) => useMemberList(domain, {
      ...options, fetchPage: async () => ({ rows: [order], total: 1, pageNum: 1, pageSize: 20 }),
    }) },
    '../../services/config.js': { isApiMode: () => true, assetUrl: value => value },
    '../../services/catalog.js': { getProduct: () => null },
    '../../services/product-media.js': { productImage: value => value || '/placeholder.jpg', defaultProductImage: () => '/placeholder.jpg' },
    '../../services/pricing.js': { money: String },
    '../../services/navigation.js': {
      go() {}, contact() {}, statusLabels: {}, orderStatusLabel, deliveryStatusLabel, dateLabel: String,
      confirm, toast: message => messages.push(message),
    },
  }
  const pageState = loadPageScript(page, modules)
  if (pageState.id) pageState.id.value = order.id
  return { page: pageState, order, calls, messages }
}

test('order list cancellation invokes the service and reflects the returned state', async () => {
  const h = pageHarness('orders')
  await h.page.cancel(h.order)
  assert.deepEqual(h.calls, [['page-order', 'cancelled']])
  assert.equal(h.order.status, 'cancelled')
  assert.deepEqual(h.messages, ['订单已取消'])
  assert.equal(h.page.cancellingId.value, '')
})

test('cancellation dismiss, failure and retry leave the action usable', async () => {
  let accept = false, fail = true
  const h = pageHarness('orders', { confirm: async () => accept, mutate: async () => { if (fail) throw Error('网络超时') } })
  await h.page.cancel(h.order)
  assert.equal(h.calls.length, 0)
  accept = true
  await h.page.cancel(h.order)
  assert.equal(h.order.status, 'pending')
  assert.equal(h.page.cancellingId.value, '')
  assert.deepEqual(h.messages, ['网络超时'])
  fail = false
  await h.page.cancel(h.order)
  assert.equal(h.order.status, 'cancelled')
})

test('duplicate cancellation is blocked while confirmation is open', async () => {
  let resolveConfirm
  const h = pageHarness('orders', { confirm: () => new Promise(resolve => { resolveConfirm = resolve }) })
  const first = h.page.cancel(h.order)
  await h.page.cancel(h.order)
  resolveConfirm(true)
  await first
  assert.equal(h.calls.length, 1)
})

test('receive confirmation locks out a concurrent refund until completion', async () => {
  let resolveConfirm
  const h = pageHarness('order-detail', { confirm: () => new Promise(resolve => { resolveConfirm = resolve }) })
  h.order.status = 'receiving'
  const first = h.page.receive()
  await h.page.receive()
  await h.page.refund()
  resolveConfirm(true)
  await first
  assert.deepEqual(h.calls, [['page-order', 'complete']])
  assert.equal(h.page.busy.value, false)
})

test('zero remaining refund cannot fall back to the original order total', async () => {
  const h = pageHarness('order-detail')
  h.order.status = 'complete'
  h.order.refundSummary = { remaining: 0, processing: false }
  assert.equal(h.page.canRefund.value, false)
  await h.page.refund()
  assert.equal(h.calls.length, 0)
})

test('accepted refund stays pending when order detail refresh fails', async () => {
  const h = pageHarness('order-detail', {
    refreshOrder: async () => { throw new Error('detail unavailable') },
    onRefund: order => {
      order.refundSummary = { processing: true, remaining: 0 }
      order.refunds = [{ id: 'refund-1', status: 'pending', amount: 1000 }]
    },
  })
  h.order.status = 'paid'
  h.order.refundSummary = { processing: false, remaining: 1000 }
  await h.page.refund()
  assert.equal(h.page.canRefund.value, false)
  assert.deepEqual(h.messages, ['退款申请已提交'])
})

test('order detail hides cached order actions after a failed read and recovers on retry', async () => {
  let unavailable = true
  let payments = 0
  const h = pageHarness('order-detail', {
    refreshOrder: async () => {
      if (unavailable) throw new Error('订单读取失败')
      return h.order
    },
    onPay: async () => { payments += 1 },
  })
  await h.page.loadOrder()
  assert.equal(h.page.loadError.value, '订单读取失败')
  assert.equal(h.page.order.value, null)
  await h.page.pay()
  assert.equal(payments, 0)

  unavailable = false
  await h.page.loadOrder()
  assert.equal(h.page.loadError.value, '')
  assert.equal(h.page.order.value.id, h.order.id)
})

test('refund replay reports the returned final decision', async () => {
  for (const [status, expected] of [
    ['refunded', '退款已完成'],
    ['rejected', '退款申请已驳回，请查看售后记录'],
  ]) {
    const h = pageHarness('order-detail', { refundStatus: status,
      refreshOrder: async () => { throw new Error('detail unavailable') } })
    h.order.status = 'paid'
    h.order.refundSummary = { processing: false, remaining: 1000 }
    await h.page.refund()
    assert.deepEqual(h.messages, [expected])
  }
})

test('payment return pending shows query action instead of another payment', async () => {
  let payments = 0
  const h = pageHarness('order-detail', { onPay: async () => {
    payments += 1
    h.order.paymentAwaiting = true
    return { id: h.order.id, status: 'pending', paymentAwaiting: true }
  } })
  await h.page.pay()
  assert.equal(payments, 1)
  assert.equal(h.order.paymentAwaiting, true)
  assert.deepEqual(h.messages, ['支付结果核对中，请稍后查询订单状态'])
})

test('payment query uses merchant status and explains a closed trade', async () => {
  let queries = 0
  const h = pageHarness('order-detail', { syncPaymentOrder: async () => {
    queries += 1
    return { id: 'page-order', status: 'pending', wechatTradeState: 'CLOSED' }
  } })
  h.order.paymentAwaiting = true
  await h.page.queryPayment()
  assert.equal(queries, 1)
  assert.deepEqual(h.messages, ['微信交易已关闭或失败，请取消此订单后重新下单'])
  assert.equal(h.page.busy.value, false)
})

test('closed payment can be cancelled from order detail', async () => {
  const h = pageHarness('order-detail')
  h.order.paymentAwaiting = true
  h.order.wechatTradeState = 'CLOSED'
  assert.equal(h.page.paymentTradeClosed.value, true)
  await h.page.cancelOrder()
  assert.deepEqual(h.calls, [['page-order', 'cancelled']])
  assert.equal(h.order.status, 'cancelled')
})

test('refund timeline distinguishes manual, WeChat and uncertain channel results', () => {
  const h = pageHarness('order-detail')
  assert.equal(h.page.refundStatusLabel({ status: 'refunded', channelStatus: 'MANUAL_CONFIRMED' }), '线下退款已登记')
  assert.equal(h.page.refundStatusLabel({ status: 'refunded', channelStatus: 'SUCCESS' }), '微信退款已完成')
  assert.equal(h.page.refundStatusLabel({ status: 'approved', channelStatus: 'SUCCESS' }), '微信已退款，订单更新中')
  assert.equal(h.page.refundStatusLabel({ status: 'approved', channelStatus: 'REVIEW' }), '退款待商家人工核对')
  assert.equal(h.page.refundStatusLabel({ status: 'approved', channelStatus: 'ABNORMAL' }), '退款异常，待商家核对')
  assert.equal(h.page.refundStatusLabel({ status: 'approved', channelStatus: 'UNKNOWN' }), '退款结果核对中')
  assert.equal(h.page.refundStatusLabel({ status: 'approved', channelStatus: 'CLOSED' }), '微信退款已关闭，待商家处理')
  assert.equal(h.page.refundStatusLabel({ status: 'approved', channelStatus: 'PENDING_AUTO' }), '退款待发起')
})

test('cancelled and refunded orders have dedicated filters', async () => {
  const h = pageHarness('orders')
  h.order.status = 'refunded'
  assert.ok(h.page.tabs.some(tab => tab.id === 'refunded'))
  assert.ok(h.page.tabs.some(tab => tab.id === 'cancelled'))
  h.page.chooseTab('refunded')
  await h.page.loadOrders(1)
  assert.equal(h.page.visibleOrders.value.length, 1)
  h.page.chooseTab('cancelled')
  await h.page.loadOrders(1)
  assert.equal(h.page.visibleOrders.value.length, 0)
})

test('refunded order without shipment does not report a logistics failure', async () => {
  const missingDelivery = Object.assign(new Error('物流信息不存在'), { statusCode: 404 })
  const h = pageHarness('order-detail', { loadDelivery: async () => { throw missingDelivery } })
  h.order.status = 'refunded'
  h.order.fulfillmentMode = 'delivery'
  await h.page.loadDelivery(h.order.id, h.order)
  assert.equal(h.page.deliveryError.value, '')
  assert.equal(h.page.delivery.value, null)
})
