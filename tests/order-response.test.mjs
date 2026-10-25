import test from 'node:test'
import assert from 'node:assert/strict'

const requests = []
const memory = new Map()
let refundStatus = 'pending'
let withdrawalStatus = 'pending'
let paymentOrderStatus = 'pending'
let paymentTradeState = 'NOTPAY'
let paymentUiCalls = 0
globalThis.uni = {
  getStorageSync: key => key === 'jinse-mini-token-v1' ? 'A'.repeat(48) : memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: key => memory.delete(key),
  requestPayment: async () => { paymentUiCalls += 1 },
  request: async ({ url, method, data }) => {
    requests.push({ url, method, data })
    if (method === 'POST' && url === '/mini/orders/pay-order/pay')
      return { statusCode: 200, data: { code: 0, data: { timeStamp: '1', nonceStr: 'nonce', package: 'prepay_id=123', paySign: 'sign' } } }
    if (method === 'GET' && url === '/mini/orders/pay-order')
      return { statusCode: 200, data: { code: 0, data: { id: 'pay-order', status: paymentOrderStatus, total: 1000 } } }
    if (method === 'POST' && url === '/mini/orders/pay-order/pay-sync')
      return { statusCode: 200, data: { code: 0, data: { id: 'pay-order', status: paymentOrderStatus, total: 1000, wechatTradeState: paymentTradeState } } }
    if (method === 'POST' && url === '/mini/orders')
      return { statusCode: 200, data: { code: 0, data: { id: 'order-single', status: 'pending', couponId: 'coupon-single' } } }
    if (method === 'POST' && url === '/mini/orders/cart')
      return { statusCode: 200, data: { code: 0, data: { id: 'order-cart', status: 'pending', couponId: 'coupon-cart' } } }
    if (method === 'POST' && url === '/mini/orders/order-single/cancel')
      return { statusCode: 200, data: { code: 0, data: { id: 'order-single', status: 'cancelled', couponId: 'coupon-single' } } }
    if (method === 'POST' && url === '/mini/rewards/cash/cash-1/claim')
      return { statusCode: 200, data: { code: 0, data: { state: 'WAIT_USER_CONFIRM', packageInfo: 'package', mchId: 'merchant', appId: 'app' } } }
    if (method === 'POST' && url === '/mini/staff/redemptions/confirm')
      return { statusCode: 200, data: { code: 0, data: { id: 'award-1', code: 'reward-code', status: 'redeemed' } } }
    if (method === 'POST' && url === '/mini/addresses')
      return { statusCode: 200, data: { code: 0, data: { id: 'address-2', ...data } } }
    if (method === 'POST' && url === '/mini/orders/order-single/refund')
      return { statusCode: 200, data: { code: 0, data: { id: 'refund-1', status: refundStatus, amount: data.amount, reason: data.reason } } }
    if (method === 'POST' && url === '/mini/promotion/withdraw')
      return { statusCode: 200, data: { code: 0, data: { id: 'settlement-1', status: withdrawalStatus, amount: data.amount } } }
    throw new Error('follow-up refresh is unavailable')
  },
}

const { config } = await import('../services/config.js')
config.mode = 'api'
const { state, submitOrder, submitCartOrder, setOrderStatus, receiveRedPacket, verifyAward, saveAddress,
  requestRefund, withdrawCommission, payOrder, refreshOrder, syncPaymentOrder } = await import('../services/store.js')

test('single-item order remains confirmed when coupon refresh fails', async () => {
  state.checkout = { productId: 'classic', quantity: 1, couponId: 'coupon-single', addressId: 'address-1',
    fulfillmentMode: 'delivery', requestId: 'single-order-request' }
  state.coupons = [{ id: 'coupon-single', status: 'unused' }]
  const order = await submitOrder()
  assert.equal(order.id, 'order-single')
  assert.equal(state.orders[0].id, order.id)
  assert.equal(state.coupons[0].status, 'locked')
  assert.equal(state.coupons[0].orderId, order.id)
  assert.equal(state.checkout.requestId, 'single-order-request')
})

test('cart order clears cart and remains confirmed when both refreshes fail', async () => {
  state.checkout = { productId: '', quantity: 1, couponId: 'coupon-cart', addressId: 'address-1',
    fulfillmentMode: 'delivery', cartRequestId: '', cartRequestSignature: '' }
  state.coupons = [{ id: 'coupon-cart', status: 'unused' }]
  state.cart = [{ id: 'line-1', productId: 'classic', quantity: 1, price: 39800 }]
  const order = await submitCartOrder()
  assert.equal(order.id, 'order-cart')
  assert.equal(state.orders[0].id, order.id)
  assert.deepEqual(state.cart, [])
  assert.equal(state.coupons[0].status, 'locked')
  assert.equal(state.coupons[0].orderId, order.id)
  assert.equal(state.checkout.cartRequestId, '')
  assert.equal(requests.filter(item => item.url === '/mini/orders/cart').length, 1)
})

test('cancelled order and released coupon remain visible when refresh fails', async () => {
  state.coupons = [{ id: 'coupon-single', status: 'locked', orderId: 'order-single' }]
  const order = await setOrderStatus('order-single', 'cancelled')
  assert.equal(order.status, 'cancelled')
  assert.equal(state.orders.find(item => item.id === order.id)?.status, 'cancelled')
  assert.equal(state.coupons[0].status, 'unused')
  assert.equal(state.coupons[0].orderId, null)
})

test('cash confirmation parameters survive an unavailable status refresh', async () => {
  const result = await receiveRedPacket('cash-1')
  assert.equal(result.state, 'WAIT_USER_CONFIRM')
  assert.equal(result.packageInfo, 'package')
})

test('successful award verification stays redeemed when list refresh fails', async () => {
  state.awards = [{ id: 'award-1', code: 'reward-code', status: 'pending' }]
  const result = await verifyAward('reward-code', 'verify-request')
  assert.equal(result.status, 'redeemed')
  assert.equal(state.awards[0].status, 'redeemed')
})

test('saved address remains selected when address refresh fails', async () => {
  state.addresses = []
  const saved = await saveAddress({ name: '张三', phone: '13800000000', region: '广西贵港', detail: '金港大道', isDefault: true })
  assert.equal(saved.id, 'address-2')
  assert.equal(state.addresses[0].id, saved.id)
  assert.equal(state.checkout.addressId, saved.id)
})

test('refund request marks the order pending before any detail refresh', async () => {
  refundStatus = 'pending'
  state.orders = [{ id: 'order-single', status: 'paid', total: 1000,
    refundSummary: { processing: false, remaining: 1000 }, refunds: [] }]
  const result = await requestRefund('order-single', 1000, '用户申请退款')
  assert.equal(result.id, 'refund-1')
  assert.equal(state.orders[0].refundSummary.processing, true)
  assert.equal(state.orders[0].refundSummary.remaining, 0)
  assert.equal(state.orders[0].refunds[0].id, result.id)
})

test('refund replay reflects a completed or rejected decision without double counting', async () => {
  state.orders = [{ id: 'order-single', status: 'paid', total: 1000,
    refundSummary: { requested: 1000, refunded: 0, processing: true, remaining: 0 },
    refunds: [{ id: 'refund-1', status: 'pending', amount: 1000 }] }]
  refundStatus = 'refunded'
  await requestRefund('order-single', 1000, '用户申请退款')
  assert.equal(state.orders[0].refundSummary.requested, 1000)
  assert.equal(state.orders[0].refundSummary.refunded, 1000)
  assert.equal(state.orders[0].refundSummary.processing, false)
  assert.equal(state.orders[0].refundSummary.remaining, 0)
  refundStatus = 'rejected'
  await requestRefund('order-single', 1000, '用户申请退款')
  assert.equal(state.orders[0].refundSummary.requested, 0)
  assert.equal(state.orders[0].refundSummary.refunded, 0)
  assert.equal(state.orders[0].refundSummary.processing, false)
  assert.equal(state.orders[0].refundSummary.remaining, 1000)
})

test('withdrawal response removes the stale withdrawable balance', async () => {
  withdrawalStatus = 'pending'
  state.promotion = { settled: 1000, records: [{ id: 'commission-1', amount: 1000, status: 'settled' }] }
  const result = await withdrawCommission(1000)
  assert.equal(result.id, 'settlement-1')
  assert.equal(state.promotion.settled, 0)
  assert.equal(state.promotion.records[0].status, 'processing')
})

test('paid or failed settlement replay does not falsely mark commissions processing', async () => {
  for (const status of ['paid', 'failed']) {
    withdrawalStatus = status
    state.promotion = { settled: 1000, records: [{ id: 'commission-1', amount: 1000, status: 'settled' }] }
    const result = await withdrawCommission(1000)
    assert.equal(result.status, status)
    assert.equal(state.promotion.records[0].status, 'settled')
  }
})

test('payment UI success stays awaiting until the server confirms payment', async () => {
  paymentOrderStatus = 'pending'
  state.orders = [{ id: 'pay-order', status: 'pending', total: 1000 }]
  const first = await payOrder('pay-order')
  assert.equal(first.status, 'pending')
  assert.equal(first.paymentAwaiting, true)
  assert.equal(paymentUiCalls, 1)
  assert.equal(memory.get('jinse-mini-request-ids-v1')['pay-awaiting:pay-order'] > 0, true)
  const second = await payOrder('pay-order')
  assert.equal(second.paymentAwaiting, true)
  assert.equal(paymentUiCalls, 1)
  assert.equal(requests.filter(item => item.url === '/mini/orders/pay-order/pay').length, 1)
  paymentOrderStatus = 'paid'
  const confirmed = await refreshOrder('pay-order')
  assert.equal(confirmed.status, 'paid')
  assert.equal(confirmed.paymentAwaiting, false)
  assert.equal(memory.get('jinse-mini-request-ids-v1')['pay-awaiting:pay-order'], undefined)
  assert.equal(memory.get('jinse-mini-request-ids-v1')['pay:pay-order'], undefined)
})

test('merchant status sync keeps pending payment blocked until the server confirms it', async () => {
  paymentOrderStatus = 'pending'
  paymentTradeState = 'USERPAYING'
  state.orders = [{ id: 'pay-order', status: 'pending', total: 1000 }]
  await payOrder('pay-order')
  const pending = await syncPaymentOrder('pay-order')
  assert.equal(pending.wechatTradeState, 'USERPAYING')
  assert.equal(pending.paymentAwaiting, true)
  paymentOrderStatus = 'paid'
  paymentTradeState = 'SUCCESS'
  const paid = await syncPaymentOrder('pay-order')
  assert.equal(paid.status, 'paid')
  assert.equal(paid.paymentAwaiting, false)
  assert.equal(memory.get('jinse-mini-request-ids-v1')['pay-awaiting:pay-order'], undefined)
})
