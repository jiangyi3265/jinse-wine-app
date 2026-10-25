import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { couponEligibility } from '../services/pricing.js'
import { loadPageScript } from './helpers/page-script.mjs'

function selector(route, checkout, cart = []) {
  const coupon = { id: 'coupon-1', templateId: 'full15', status: 'unused', expiresAt: Date.now() + 86400000,
    minimum: 50000, minQuantity: 1, kind: 'fixed', amount: 1500 }
  const state = vue.reactive({ coupons: [coupon], cart, checkout })
  const sources = []
  let onLoadHandler
  let onShowHandler
  const page = loadPageScript(route, {
    vue,
    '@dcloudio/uni-app': {
      onLoad: handler => { onLoadHandler = handler },
      onShow: handler => { onShowHandler = handler },
    },
    '../../services/catalog.js': {
      couponTemplates: vue.reactive([]),
      getProduct: () => ({ id: 'classic', price: 39800 }),
      loadCouponCatalog: async includeProducts => { sources.push(includeProducts) },
      loadProductSkus: async () => [{ skuCode: 'premium', price: 60000 }],
    },
    '../../services/store.js': {
      state,
      claimCoupon: async () => {},
      couponClaimLimitReached: () => false,
      loadCart: async () => cart,
      persist() {},
      refreshDomain: async () => {},
    },
    '../../services/pricing.js': { couponEligibility },
    '../../services/navigation.js': { go() {}, back() {}, toast() {} },
    '../../services/config.js': { isApiMode: () => true },
  })
  return { page, coupon, sources, load: async query => { onLoadHandler(query); await onShowHandler() } }
}

test('cart coupon selector evaluates all cart lines and skips unrelated product catalog', async () => {
  const cart = [{ productId: 'classic', price: 30000, quantity: 1 },
    { productId: 'double', price: 25000, quantity: 1 }]
  const { page, coupon, sources, load } = selector('coupons', { productId: 'classic', quantity: 1, couponId: null }, cart)
  await load({ mode: 'select', source: 'cart' })
  assert.deepEqual(sources, [false])
  assert.equal(page.tab.value, '全部')
  assert.equal(page.lines.value.length, 2)
  assert.equal(page.eligibility(coupon), '')
  assert.equal(page.disabled(coupon), false)
})

test('single-product coupon selector uses the selected SKU price', async () => {
  const { page, coupon, sources, load } = selector('my-coupons',
    { productId: 'classic', skuCode: 'premium', quantity: 1, couponId: null })
  await load({ mode: 'select' })
  assert.deepEqual(sources, [true])
  assert.deepEqual(Array.from(page.tabs.value), ['全部', '可用', '不可用'])
  assert.equal(page.lines.value[0].price, 60000)
  assert.equal(page.eligibility(coupon), '')
})
