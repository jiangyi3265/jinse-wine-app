import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('home keeps available products when stores fail and hides stale products on reload failure', async () => {
  let show
  let productFailure = false
  const products = []
  const stores = []
  const config = { brand: { homeHeroTitle: '当前品牌' }, finderUserName: '' }
  const page = loadPageScript('index', {
    vue,
    '@dcloudio/uni-app': { onShow: callback => { show = callback } },
    '../../services/navigation.js': { go() {} },
    '../../services/product-media.js': { productImage: value => value || '/placeholder.jpg' },
    '../../services/regions.js': { resolveRegion: store => [store.province || '', store.city || ''] },
    '../../services/catalog.js': {
      products, stores, homeHeroSlides: [],
      loadProductCatalog: async () => {
        if (productFailure) throw new Error('商品读取失败')
        products.splice(0, products.length, { id: 'current', name: '当前商品', image: '/current.png' })
      },
      loadStoreCatalog: async () => { throw new Error('门店读取失败') },
      loadPresentationCatalog: async () => {},
    },
    '../../services/config.js': {
      config, displayValue: value => value || '', isApiMode: () => true, assetUrl: value => value,
    },
  })

  await show()
  await page.loadHome()
  assert.equal(page.featured.value.id, 'current')
  assert.equal(page.storeReady.value, false)
  assert.equal(page.loading.value, false)
  assert.equal(page.showVideoBanner.value, false)

  productFailure = true
  await page.loadHome()
  assert.equal(page.featured.value, null)
  assert.equal(page.productError.value, '商品读取失败')
  assert.equal(products[0].id, 'current')
})
