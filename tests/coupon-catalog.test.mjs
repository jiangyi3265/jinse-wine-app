import test from 'node:test'
import assert from 'node:assert/strict'

const requested = []
let productsAvailable = false
globalThis.uni = {
  request: async options => {
    requested.push(options.url)
    if (options.url.endsWith('/mini/coupons/templates')) return {
      statusCode: 200,
      data: { code: 0, data: [{ id: 'multi2', kind: 'fixed', amount: 1500, claimLimit: 2 }] },
    }
    if (options.url.endsWith('/mini/products') && productsAvailable) return {
      statusCode: 200,
      data: { code: 0, data: [{ id: 'classic', price: 39800, image: '/classic.jpg' }] },
    }
    throw new Error('unrelated catalog unavailable')
  },
}

const { config } = await import('../services/config.js')
config.mode = 'api'
config.apiBaseUrl = 'https://api.example.com'
const { couponTemplates, products, loadCouponCatalog } = await import('../services/catalog.js')

test('coupon browsing needs only coupon templates; checkout selection also loads products', async () => {
  await loadCouponCatalog()
  assert.deepEqual(requested, ['https://api.example.com/mini/coupons/templates'])
  assert.equal(couponTemplates[0].claimLimit, 2)
  assert.equal(couponTemplates[0].label, '15')

  await assert.rejects(loadCouponCatalog(true), /网络连接失败/)
  assert.equal(products.length, 0)
  productsAvailable = true
  await loadCouponCatalog(true)
  assert.equal(products[0].id, 'classic')
  assert.equal(products[0].image, 'https://api.example.com/classic.jpg')
})
