import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('home keeps available products when stores fail and hides stale products on reload failure', async () => {
  let show
  let productFailure = false
  const products = []
  const stores = []
  const config = { brand: { homeHeroTitle: '当前品牌' }, content: {}, finderUserName: '' }
  const page = loadPageScript('index', {
    vue,
    '@dcloudio/uni-app': { onShow: callback => { show = callback } },
    '../../services/navigation.js': { go() {} },
    '../../services/campaign-popup.js': { claimCampaignPopup: () => false },
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

test('home banner opens the current CMS destination instead of an unrelated featured product', async () => {
  const opened = []
  const page = loadPageScript('index', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/navigation.js': { go: (...args) => opened.push(args) },
    '../../services/campaign-popup.js': { claimCampaignPopup: () => false },
    '../../services/product-media.js': { productImage: value => value },
    '../../services/regions.js': { resolveRegion: () => [] },
    '../../services/catalog.js': {
      products: [{ id: 'featured', name: '精选商品' }], stores: [],
      homeHeroSlides: [
        { imageUrl: '/wine.jpg', title: '佳酿', linkRoute: 'shop' },
        { imageUrl: '/store.jpg', title: '实体门店', linkRoute: 'stores' },
      ],
      loadProductCatalog: async () => {}, loadStoreCatalog: async () => {}, loadPresentationCatalog: async () => {},
    },
    '../../services/config.js': { config: { brand: {}, content: {} }, displayValue: value => value, isApiMode: () => false, assetUrl: value => value },
  })
  page.openHero()
  page.heroIndex.value = 1
  assert.equal(page.currentHero.value.title, '实体门店')
  page.openHero()
  assert.deepEqual(opened, [['shop'], ['stores']])
})

test('home merchandising follows CMS ordering, removes duplicate and unpublished codes, and opens the matching product', () => {
  const opened = []
  const products = [{ id: 'first' }, { id: 'bugu' }, { id: 'xiong' }, { id: 'other' }]
  const config = { brand: { homeFeaturedProductCode: 'first' }, content: {
    'home.featured': { title: '补骨酒精选', content: { productCodes: ['bugu', 'gone', 'bugu', 'xiong', null] } },
  } }
  const slides = [{ linkRoute: 'product', content: { productCode: 'bugu' } }, { linkRoute: 'product', content: { productCode: 'gone' } }]
  const page = loadPageScript('index', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/navigation.js': { go: (...args) => opened.push(args) },
    '../../services/campaign-popup.js': { claimCampaignPopup: () => false },
    '../../services/product-media.js': { productImage: value => value },
    '../../services/regions.js': { resolveRegion: () => [] },
    '../../services/catalog.js': {
      products, stores: [], homeHeroSlides: slides,
      loadProductCatalog: async () => {}, loadStoreCatalog: async () => {}, loadPresentationCatalog: async () => {},
    },
    '../../services/config.js': { config, displayValue: value => value, isApiMode: () => false, assetUrl: value => value },
  })
  assert.equal(JSON.stringify(page.featuredProducts.value.map(p => p.id)), JSON.stringify(['bugu', 'xiong', 'first', 'other']))
  page.openHero()
  assert.equal(opened[0][0], 'product')
  assert.equal(opened[0][1].id, 'bugu')
  page.heroIndex.value = 1
  page.openHero()
  assert.equal(opened[1][0], 'shop')
  page.productReady.value = false
  assert.equal(page.featuredProducts.value.length, 0)
})
