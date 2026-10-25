import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { couponEligibility } from '../services/pricing.js'

async function settleQuote() {
  await vue.nextTick()
  await new Promise(setImmediate)
}

function cartHarness(initial, submit = async () => {}, quote = null) {
  const cart = initial.map(item => ({ ...item }))
  const calls = []
  const messages = []
  const state = vue.reactive({ checkout: { fulfillmentMode: 'delivery', addressId: '1' }, addresses: [{ id: '1' }], coupons: [] })
  const modules = {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/navigation.js': { go: (...args) => calls.push(['go', ...args]), toast: message => messages.push(message) },
    '../../services/config.js': { mediaUrl: value => value, isApiMode: () => true },
    '../../services/product-media.js': { productImage: value => value || '/placeholder.jpg' },
    '../../services/store.js': {
      state,
      loadCart: async () => cart.map(item => ({ ...item })),
      updateCartItem: async (id, quantity) => { calls.push(['update', id, quantity]); cart.find(item => item.id === id).quantity = quantity },
      removeCartItem: async id => { calls.push(['remove', id]); cart.splice(cart.findIndex(item => item.id === id), 1) },
      submitCartOrder: async () => { calls.push(['checkout']); return submit() },
      quoteCartOrder: async () => quote ? quote() : {
        subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        shipping: 100, discount: 0,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + 100,
      },
      refreshDomain: async () => {},
    },
    '../../services/catalog.js': { stores: [], loadCouponCatalog: async () => {}, loadStoreCatalog: async () => {} },
    '../../services/pricing.js': { couponEligibility },
  }
  const page = loadPageScript('cart', modules)
  page.items.value = cart
  page.addressReady.value = true
  page.couponReady.value = true
  page.loading.value = false
  page.serverQuote.value = { subtotal: 1000, shipping: 100, discount: 0, total: 1100 }
  return { page, cart, calls, messages, state }
}

test('unavailable cart item remains removable and cannot enter checkout', async () => {
  const h = cartHarness([{ id: 1, stock: 0, quantity: 1, price: 1000 }])
  assert.equal(h.page.itemIssue(h.cart[0]), '已售罄或已下架')
  assert.equal(h.page.unavailableCount.value, 1)
  await h.page.checkout()
  assert.deepEqual(h.calls, [])
  assert.deepEqual(h.messages, ['请先调整库存不足或已下架的商品'])
  await h.page.remove(h.cart[0])
  assert.equal(h.page.unavailableCount.value, 0)
  assert.deepEqual(h.calls, [['remove', 1]])
})

test('cart quantity above stock can be adjusted directly to available quantity', async () => {
  const h = cartHarness([{ id: 2, stock: 2, quantity: 5, price: 1000 }])
  assert.equal(h.page.itemIssue(h.cart[0]), '仅剩 2 件')
  assert.equal(h.page.canAdjustToStock(h.cart[0]), true)
  await h.page.adjustToStock(h.cart[0])
  await settleQuote()
  assert.deepEqual(h.calls, [['update', 2, 2]])
  assert.equal(h.page.unavailableCount.value, 0)
  await h.page.checkout()
  assert.deepEqual(h.calls, [['update', 2, 2], ['checkout'], ['go', 'orders']])
})

test('cart coupon selection identifies the multi-item cart source', () => {
  const h = cartHarness([{ id: 3, productId: 'classic', stock: 2, quantity: 1, price: 39800 }])
  h.page.chooseCoupon()
  assert.equal(h.calls.length, 1)
  assert.equal(h.calls[0][0], 'go')
  assert.equal(h.calls[0][1], 'coupons')
  assert.equal(h.calls[0][2].mode, 'select')
  assert.equal(h.calls[0][2].source, 'cart')
})

test('changed cart makes a selected coupon ineligible before order submission', async () => {
  const h = cartHarness([{ id: 4, productId: 'classic', stock: 2, quantity: 1, price: 39800 }])
  h.state.checkout.couponId = 'coupon-1'
  h.state.coupons = [{ id: 'coupon-1', status: 'unused', expiresAt: Date.now() + 86400000,
    minimum: 50000, minQuantity: 1, productIds: [] }]
  assert.equal(h.page.couponIssue.value, '满500元可用')
  await h.page.checkout()
  assert.deepEqual(h.calls, [])
  assert.equal(h.messages[0], '满500元可用，请重新选择优惠券')
  h.page.items.value[0].quantity = 2
  assert.equal(h.page.couponIssue.value, '')
})

test('cart checkout ignores a second tap while order creation is pending', async () => {
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const h = cartHarness([{ id: 5, productId: 'classic', stock: 2, quantity: 1, price: 39800 }], () => pending)
  const first = h.page.checkout()
  const second = h.page.checkout()
  assert.equal(h.page.submitting.value, true)
  assert.deepEqual(h.calls, [['checkout']])
  finish()
  await Promise.all([first, second])
  assert.equal(h.page.submitting.value, false)
  assert.deepEqual(h.calls, [['checkout'], ['go', 'orders']])
})

test('an unconfirmed selected coupon blocks checkout until removed', async () => {
  const h = cartHarness([{ id: 6, productId: 'classic', stock: 2, quantity: 1, price: 39800 }])
  h.state.checkout.couponId = 'coupon-1'
  h.page.couponReady.value = false
  assert.equal(h.page.couponIssue.value, '优惠券状态待确认')
  await h.page.checkout()
  assert.deepEqual(h.calls, [])
  h.page.clearCoupon()
  await settleQuote()
  assert.equal(h.page.couponIssue.value, '')
  await h.page.checkout()
  assert.deepEqual(h.calls, [['checkout'], ['go', 'orders']])
})

test('pending freight quote blocks checkout and uses the returned server amount', async () => {
  let finish
  const h = cartHarness([{ id: 7, stock: 9, quantity: 2, price: 500 }], undefined,
    () => new Promise(resolve => { finish = resolve }))
  await vue.nextTick()
  assert.equal(h.page.quoteReady.value, false)
  await h.page.checkout()
  assert.equal(h.calls.some(call => call[0] === 'checkout'), false)
  finish({ subtotal: 1000, shipping: 325, discount: 100, total: 1225 })
  await settleQuote()
  assert.equal(h.page.serverQuote.value.shipping, 325)
  assert.equal(h.page.serverQuote.value.total, 1225)
  assert.equal(h.page.quoteReady.value, true)
})

test('failed freight quote hides the old amount and allows retry', async () => {
  let failed = true
  const h = cartHarness([{ id: 8, stock: 9, quantity: 1, price: 500 }], undefined, async () => {
    if (failed) throw new Error('运费暂时无法获取')
    return { subtotal: 500, shipping: 1, discount: 0, total: 501 }
  })
  await settleQuote()
  assert.equal(h.page.quoteReady.value, false)
  assert.equal(h.page.serverQuote.value, null)
  assert.equal(h.page.quoteError.value, '运费暂时无法获取')
  failed = false
  await h.page.refreshQuote()
  assert.equal(h.page.quoteReady.value, true)
  assert.equal(h.page.serverQuote.value.shipping, 1)
})

test('late quote response cannot replace the current delivery choice', async () => {
  const pending = []
  const h = cartHarness([{ id: 9, stock: 9, quantity: 1, price: 500 }], undefined,
    () => new Promise(resolve => pending.push(resolve)))
  await vue.nextTick()
  h.state.checkout.fulfillmentMode = 'pickup'
  await vue.nextTick()
  pending[0]({ subtotal: 500, shipping: 100, discount: 0, total: 600 })
  await Promise.resolve()
  assert.equal(h.page.serverQuote.value, null)
  assert.equal(h.page.quoteReady.value, false)
})
