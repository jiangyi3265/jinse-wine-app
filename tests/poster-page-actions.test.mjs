import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { money } from '../services/pricing.js'
import { drawPromotionPoster } from '../services/poster.js'

function harness({ code, catalog } = {}) {
  const products = vue.reactive([
    { id: 'one', name: '典藏酱香', spec: '500mL', price: 39850, image: 'one.jpg' },
    { id: 'two & gift', name: '双瓶礼盒', spec: '500mL × 2', price: 59899, image: 'two.jpg' },
  ])
  const calls = { code: 0, codeIds: [], catalog: 0, clipboard: [], menus: [] }, messages = []
  let shareHandler
  const page = loadPageScript('poster', {
    vue: { ...vue, getCurrentInstance: () => ({ proxy: {} }) },
    '@dcloudio/uni-app': { onLoad() {}, onShow() {}, onShareAppMessage: fn => { shareHandler = fn } },
    '../../services/store.js': {
      state: vue.reactive({ user: { name: '酒友' } }),
      createPromotionCode: async productId => { calls.code++; calls.codeIds.push(productId); return code ? code(productId) : { code: 'INVITE-1', qrCode: `/qr-${productId}.png` } },
    },
    '../../services/catalog.js': { products, loadProductCatalog: async () => { calls.catalog++; if (catalog) await catalog() } },
    '../../services/navigation.js': { go() {}, toast: s => messages.push(s) },
    '../../services/config.js': { isApiMode: () => true, assetUrl: String, mediaUrl: String },
    '../../services/pricing.js': { money },
    '../../services/poster.js': { drawPromotionPoster },
    '../../services/product-media.js': { productImage: value => value || '/placeholder.jpg' },
  }, {
    window: { location: { origin: 'https://wine.example', pathname: '/mini/' } },
    uni: {
      hideShareMenu: () => calls.menus.push('hide'), showShareMenu: () => calls.menus.push('show'),
      setClipboardData: o => { calls.clipboard.push(o.data); o.success() },
      getImageInfo: o => o.fail({ errMsg: 'network error' }),
    },
  })
  return { page, products, calls, messages, share: () => shareHandler() }
}

test('promotion sharing waits for identity and selected product appears in encoded link', async () => {
  const h = harness()
  h.page.shareLink()
  assert.equal(h.calls.clipboard.length, 0)
  await h.page.loadPoster()
  await h.page.selectProduct({ detail: { value: 1 } })
  assert.equal(h.page.featured.value.name, '双瓶礼盒')
  assert.deepEqual(h.calls.codeIds, ['one', 'two & gift'])
  assert.equal(h.page.promotionCode.value, '/qr-two & gift.png')
  h.page.shareLink()
  assert.equal(h.calls.clipboard[0], 'https://wine.example/mini/#/pages/product/index?id=two%20%26%20gift&inviteCode=INVITE-1')
  assert.equal(h.share().path, '/pages/product/index?id=two%20%26%20gift&inviteCode=INVITE-1')
})

test('a slower previous product response cannot replace the selected product QR', async () => {
  let finishSecond
  const h = harness({ code: productId => productId === 'two & gift'
    ? new Promise(resolve => { finishSecond = resolve })
    : { code: 'INVITE-1', qrCode: '/qr-one.png' } })
  await h.page.loadPoster()
  const slow = h.page.selectProduct({ detail: { value: 1 } })
  const latest = h.page.selectProduct({ detail: { value: 0 } })
  await latest
  finishSecond({ code: 'INVITE-1', qrCode: '/qr-two.png' })
  await slow
  assert.equal(h.page.featured.value.id, 'one')
  assert.equal(h.page.promotionCode.value, '/qr-one.png')
})

test('missing QR allows attributed link but not poster export; missing identity blocks both', async () => {
  const withInvite = harness({ code: () => ({ code: 'INVITE-1' }) })
  await withInvite.page.loadPoster()
  assert.equal(withInvite.page.canShare.value, true)
  assert.equal(withInvite.page.canSave.value, false)
  const withoutInvite = harness({ code: () => ({ qrCode: '/qr.png' }) })
  await withoutInvite.page.loadPoster()
  withoutInvite.page.shareLink()
  assert.equal(withoutInvite.page.canSave.value, false)
  assert.equal(withoutInvite.calls.clipboard.length, 0)
  assert.deepEqual(withoutInvite.calls.menus, ['hide'])
})

test('code refresh failure removes stale attribution and supports retry', async () => {
  let failure = false
  const h = harness({ code: () => { if (failure) throw Error('network'); return { code: 'INVITE-1', qrCode: '/qr.png' } } })
  await h.page.loadPoster()
  failure = true
  await h.page.loadPoster()
  assert.equal(h.page.canShare.value, false)
  assert.equal(h.page.promotionInviteCode.value, '')
  assert.equal(h.page.codeError.value, 'network')
  failure = false
  await h.page.loadPoster()
  assert.equal(h.page.canSave.value, true)
  assert.equal(h.page.codeError.value, '')
})

test('catalog failure cannot export stale product and overlapping loads share one request', async () => {
  let finish
  const h = harness({ catalog: () => new Promise((resolve, reject) => { finish = reject }) })
  const first = h.page.loadPoster()
  const second = h.page.loadPoster()
  assert.equal(h.calls.catalog, 1)
  finish(Error('catalog unavailable'))
  await Promise.all([first, second])
  assert.equal(h.page.canShare.value, false)
  assert.equal(h.page.loadError.value, 'catalog unavailable')
  assert.equal(h.calls.code, 0)
})

test('save locks product choice and releases lock after image download failure', async () => {
  const h = harness()
  await h.page.loadPoster()
  const saving = h.page.savePoster()
  h.page.selectProduct({ detail: { value: 1 } })
  await h.page.loadPoster()
  assert.equal(h.page.featured.value.id, 'one')
  assert.equal(h.calls.catalog, 1)
  await saving
  assert.equal(h.page.saving.value, false)
  assert.equal(h.page.canSave.value, true)
  assert.match(h.messages[0], /图片加载失败/)
})

test('export retains cents and image proportions, and long names do not overlap the QR', () => {
  for (const [width, height] of [[600, 600], [200, 1000], [1600, 400]]) {
    const text = [], images = []
    let fontSize = 12
    const ctx = {
      setFillStyle() {}, fillRect() {}, setStrokeStyle() {}, setLineWidth() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      setFontSize: size => { fontSize = size },
      measureText: value => ({ width: Array.from(value).length * fontSize }),
      fillText: (value, x, y) => text.push({ value, x, y, width: Array.from(value).length * fontSize }),
      drawImage: (...args) => images.push(args),
    }
    drawPromotionPoster(ctx, {
      product: { name: '特别特别长的商品名称用于核对换行和海报边界'.repeat(3), spec: '53度 500mL', price: 39850, originalPrice: 49899 },
      userName: '🍷酒友推荐'.repeat(12), productImage: { path: 'product', width, height }, qrImage: { path: 'qr' }, demo: false,
    })
    assert.ok(text.some(t => t.value === '¥398.50'))
    assert.ok(text.some(t => t.value === '¥498.99'))
    const [, x, y, w, h] = images[0]
    assert.ok(Math.abs(w / h - width / height) < 0.00001)
    assert.ok(x >= 24 && y >= 248 && x + w <= 366 && y + h <= 508)
    assert.ok(text.filter(t => t.y === 553 || t.y === 578).every(t => t.x + t.width <= 248))
    assert.ok(text.filter(t => t.y === 109 || t.y === 142).every(t => t.x + t.width <= 366))
  }
})
