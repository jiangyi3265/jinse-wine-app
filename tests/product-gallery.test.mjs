import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { config } from '../services/config.js'
import { loadProductGallery, loadProductPresentation, productPhotos } from '../services/product-gallery.js'
import { loadPageScript } from './helpers/page-script.mjs'

test('gallery keeps cover first, removes duplicates and rejects malformed URLs', () => {
  config.mode = 'api'
  config.apiBaseUrl = 'https://shop.example'
  assert.deepEqual(productPhotos({ image: '/cover.jpg' }, [null, {}, '', ' /side.jpg ', '/cover.jpg', 'https://shop.example/side.jpg', 'javascript:alert(1)', '//untrusted.example/x']), ['https://shop.example/cover.jpg', 'https://shop.example/side.jpg'])
  assert.equal(productPhotos({ image: '' }, []).length, 1)
  assert.deepEqual(productPhotos(null), [])
  assert.equal(productPhotos({ image: '/cover.jpg' }, Array.from({ length: 20 }, (_, i) => `/photo-${i}.jpg`)).length, 10)
  config.mode = 'demo'
})

test('gallery reads only its product content; missing gallery is optional, service failures remain retryable', async () => {
  config.mode = 'api'
  const previousUni = globalThis.uni
  let response = { statusCode: 200, data: { code: 0, data: { type: 'page', content: { productCode: 'rice', photos: ['/side.jpg'] } } } }
  globalThis.uni = { request: async ({ url }) => {
    assert.ok(url.endsWith('/mini/content/product.gallery.rice'))
    return response
  } }
  try {
    assert.deepEqual(await loadProductGallery('rice'), ['/side.jpg'])
    response.data.data.content.detail = { spec: '38度 500mL/瓶' }
    assert.deepEqual(await loadProductPresentation('rice'), { photos: ['/side.jpg'], detail: { spec: '38度 500mL/瓶' } })
    response.data.data.content.productCode = 'other'
    assert.deepEqual(await loadProductGallery('rice'), [])
    response = { statusCode: 404, data: { code: 404 } }
    assert.deepEqual(await loadProductGallery('rice'), [])
    response = { statusCode: 503, data: { code: 503 } }
    await assert.rejects(loadProductGallery('rice'))
  } finally {
    globalThis.uni = previousUni
    config.mode = 'demo'
  }
})

test('product stays purchasable on gallery failure, retries photos and previews the selected image', async () => {
  let failure = true
  let preview
  let enter
  const products = vue.reactive([{ id: 'rice', image: '/cover.jpg', stock: 16, price: 14800 }])
  const page = loadPageScript('product', {
    vue,
    '@dcloudio/uni-app': { onLoad: cb => { enter = cb }, onShow() {}, onUnload() {}, onHide() {}, onShareAppMessage() {} },
    '../../services/catalog.js': {
      products, couponTemplates: [], getProduct: id => products.find(p => p.id === id),
      loadProductCatalog: async () => {}, loadCouponCatalog: async () => {},
      loadProductSkus: async () => [], loadProductShipping: async () => ({ shipping: 0 }),
    },
    '../../services/store.js': { createPromotionCode: async () => ({ code: 'TEST' }), prepareCheckout() {}, addCartItem: async () => {} },
    '../../services/invitation.js': { acceptEntryInvitation: async () => {} },
    '../../services/product-scene.js': { productIdFromScene: () => '' },
    '../../services/navigation.js': { go() {}, contact() {}, run: fn => fn(), toast() {} },
    '../../services/config.js': { displayValue: value => value, isApiMode: () => true },
    '../../services/product-media.js': { productImage: value => value || '/placeholder.jpg' },
    '../../services/product-gallery.js': {
      productPhotos,
      loadProductPresentation: async () => { if (failure) throw new Error('offline'); return { photos: ['/side.jpg'], detail: { spec: '38度 500mL/瓶' } } },
    },
  }, { uni: { previewImage: value => { preview = value } } })
  enter({ id: 'rice' })
  await page.loadDetail()
  assert.equal(page.loadError.value, '')
  assert.equal(page.currentStock.value, 16)
  assert.equal(page.galleryError.value, true)
  assert.deepEqual([...page.photos.value], ['/cover.jpg'])
  failure = false
  await page.loadPhotos()
  assert.equal(page.galleryError.value, false)
  assert.equal(page.photos.value.length, 2)
  assert.equal(page.galleryDetail.value.spec, '38度 500mL/瓶')
  page.previewImage(1)
  assert.equal(preview.current, '/side.jpg')
  assert.equal(preview.urls.length, 2)
  page.id.value = 'next'
  assert.equal(page.galleryPhotos.value.length, 0)
  assert.equal(page.galleryDetail.value, null)
})
