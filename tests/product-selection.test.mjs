import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

function harness() {
  const products = vue.reactive([{ id: 'rice', image: '/cover.jpg', stock: 30, price: 14800 }])
  const rows = [{ skuCode: 'a', skuName: '瓶装', stock: 10, price: 14800 }, { skuCode: 'b', skuName: '坛装', stock: 8, price: 38800 }]
  const calls = [], writes = []
  let enter, add = async () => {}
  const page = loadPageScript('product', {
    vue,
    '@dcloudio/uni-app': { onLoad: cb => { enter = cb }, onShow() {}, onUnload() {}, onHide() {}, onShareAppMessage() {} },
    '../../services/catalog.js': {
      products, couponTemplates: [], getProduct: id => products.find(p => p.id === id),
      loadProductCatalog: async () => {}, loadCouponCatalog: async () => {},
      loadProductSkus: async () => rows.map(row => ({ ...row })), loadProductShipping: async () => ({ shipping: 0 }),
    },
    '../../services/store.js': { createPromotionCode: async () => ({ code: 'TEST' }), prepareCheckout: (...args) => calls.push(['checkout', ...args]), addCartItem: (...args) => { writes.push(args); return add() } },
    '../../services/invitation.js': { acceptEntryInvitation: async () => {} },
    '../../services/product-scene.js': { productIdFromScene: () => '' },
    '../../services/navigation.js': { go: (...args) => calls.push(['go', ...args]), contact() {}, run: fn => { try { fn() } catch (e) { calls.push(['toast', e.message]) } }, toast: message => calls.push(['toast', message]) },
    '../../services/config.js': { displayValue: value => value, isApiMode: () => true },
    '../../services/product-media.js': { productImage: value => value },
    '../../services/product-gallery.js': { productPhotos: p => p ? [p.image] : [], loadProductPresentation: async () => ({ photos: [], detail: null }) },
  }, { uni: {} })
  return { page, rows, calls, writes, enter: () => enter({ id: 'rice' }), setAdd: value => { add = value } }
}

test('returning retains the selected SKU and quantity, but respects reduced or exhausted stock', async () => {
  const h = harness(); h.enter(); await h.page.loadDetail()
  h.page.selectSku(h.page.skus.value[1]); h.page.quantity.value = 3
  await h.page.loadDetail()
  assert.equal(h.page.selectedSku.value.skuCode, 'b')
  assert.equal(h.page.quantity.value, 3)
  h.rows[1].stock = 2
  await h.page.loadDetail()
  assert.equal(h.page.quantity.value, 2)
  assert.match(h.calls.at(-1)[1], /库存已更新/)
  h.rows[1].stock = 0
  await h.page.loadDetail()
  assert.equal(h.page.selectedSku.value.skuCode, 'b', 'Never silently switch the customer to another SKU')
  assert.equal(h.page.currentStock.value, 0)
  await h.page.addToCart(); h.page.buy()
  assert.equal(h.writes.length, 0)
  assert.equal(h.calls.some(c => c[0] === 'checkout'), false)
})

test('a removed SKU requires a new choice and entering another product resets the old selection', async () => {
  const h = harness(); h.enter(); await h.page.loadDetail()
  h.page.selectSku(h.page.skus.value[1]); h.page.quantity.value = 3
  h.rows.pop(); await h.page.loadDetail()
  assert.equal(h.page.needsSku.value, true)
  h.page.buy(); assert.equal(h.page.sheet.value, true)
  await h.page.addToCart(); assert.equal(h.writes.length, 0)
  h.page.selectSku(h.page.skus.value[0]); assert.equal(h.page.needsSku.value, false)
  h.page.id.value = 'other'
  assert.equal(h.page.quantity.value, 1)
  assert.equal(h.page.selectedSku.value, null)
})

test('slow add-to-cart sends once, releases the button after failure, and allows a deliberate retry', async () => {
  const h = harness(); h.enter(); await h.page.loadDetail()
  let reject
  h.setAdd(() => new Promise((resolve, fail) => { reject = fail }))
  const pending = h.page.addToCart()
  await h.page.addToCart(); h.page.buy()
  assert.equal(h.writes.length, 1)
  assert.equal(h.page.adding.value, true)
  assert.equal(h.calls.some(c => c[0] === 'checkout'), false)
  reject(new Error('网络暂时不可用')); await pending
  assert.equal(h.page.adding.value, false)
  h.setAdd(async () => {})
  await h.page.addToCart()
  assert.equal(h.writes.length, 2)
  assert.equal(h.calls.at(-1)[1], '已加入购物车')
})
