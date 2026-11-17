import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

function harness() {
  const products = vue.reactive([{ id: 'set-three', name: '三瓶组合', image: '/three.jpg', price: 21000, stock: 0 }, { id: 'other', name: '另一商品', image: '/other.jpg', stock: 3 }])
  const calls = [], requests = [], unload = []
  let share, enter, respond = async () => ({ code: 'JS42PROMO', qrCode: '' })
  const page = loadPageScript('product', {
    vue,
    '@dcloudio/uni-app': { onLoad: cb => { enter = cb }, onShow() {}, onHide() {}, onUnload: cb => unload.push(cb), onShareAppMessage: cb => { share = cb } },
    '../../services/catalog.js': { products, couponTemplates: [], getProduct: id => products.find(p => p.id === id), loadProductCatalog: async () => {}, loadCouponCatalog: async () => {}, loadProductSkus: async () => [], loadProductShipping: async () => ({ shipping: 0 }) },
    '../../services/store.js': { prepareCheckout() {}, addCartItem() {}, createPromotionCode: code => { requests.push(code); return respond(code) } },
    '../../services/invitation.js': { acceptEntryInvitation: async () => {} },
    '../../services/product-scene.js': { productIdFromScene: () => '' },
    '../../services/navigation.js': { go: (...args) => calls.push(args), toast() {}, contact() {}, run: fn => fn() },
    '../../services/config.js': { displayValue: v => v, isApiMode: () => true },
    '../../services/product-media.js': { productImage: v => v },
    '../../services/product-gallery.js': { productPhotos: p => p ? [p.image] : [], loadProductPresentation: async () => ({ photos: [], detail: null }) },
  }, { uni: { showShareMenu() {}, hideShareMenu() {} } })
  return { page, calls, requests, share: () => share(), enter: () => enter({ id: 'set-three' }), respond: fn => { respond = fn }, unload: () => unload.forEach(fn => fn()) }
}
const ready = async () => { const h = harness(); h.enter(); await h.page.loadDetail(); return h }

test('product sharing uses current product and verified inviter, even while QR is pending or stock is zero', async () => {
  const h = await ready()
  assert.equal(h.page.canShareProduct.value, false)
  assert.equal(h.share().path, '/pages/shop/index')
  await h.page.openProductShare()
  assert.equal(h.requests[0], 'set-three')
  assert.equal(h.page.canShareProduct.value, true)
  assert.equal(h.share().path, '/pages/product/index?id=set-three&inviteCode=JS42PROMO')
  assert.equal(h.share().title, '雄森酒业 · 三瓶组合')
  assert.equal(h.share().imageUrl, '/three.jpg')
  h.page.closeProductShare()
  assert.equal(h.page.canShareProduct.value, true, 'Native share callback must retain identity after sheet closes')
  h.page.openProductPoster(); assert.deepEqual(Array.from(h.calls.at(-1)).map(v => typeof v === 'object' ? v.id : v), ['poster', 'set-three'])
  h.page.openEarnings(); assert.equal(h.calls.at(-1)[0], 'promotion')
})

test('missing or malformed identity blocks sharing and failed requests can be retried', async () => {
  const h = await ready()
  for (const code of ['', 'bad&inviteCode=wrong', 42]) {
    h.respond(async () => ({ code })); await h.page.openProductShare()
    assert.equal(h.page.canShareProduct.value, false)
    assert.match(h.page.shareError.value, /尚未就绪/)
  }
  h.respond(async () => { throw new Error('网络错误') }); await h.page.prepareProductShare()
  assert.equal(h.page.shareError.value, '网络错误')
  h.respond(async () => ({ code: 'JS43PROMO' })); await h.page.prepareProductShare()
  assert.equal(h.page.canShareProduct.value, true)
  assert.match(h.share().path, /inviteCode=JS43PROMO$/)
})

test('duplicate taps send once; cancellation, product switch and unload discard late identity', async () => {
  for (const action of ['cancel', 'switch', 'unload']) {
    const h = await ready(); let resolve
    h.respond(() => new Promise(r => { resolve = r }))
    const task = h.page.openProductShare(); await h.page.openProductShare()
    assert.equal(h.requests.length, 1)
    assert.equal(h.page.canShareProduct.value, false)
    if (action === 'cancel') h.page.closeProductShare()
    if (action === 'switch') h.page.id.value = 'other'
    if (action === 'unload') h.unload()
    resolve({ code: 'JS42PROMO' }); await task
    assert.equal(h.page.shareCode.value, '')
    assert.equal(h.page.canShareProduct.value, false)
    assert.equal(h.page.shareOpen.value, false)
  }
})
