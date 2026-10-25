import test from 'node:test'
import assert from 'node:assert/strict'

let unavailable = new Set()
const requested = []
globalThis.uni = {
  request: async ({ url }) => {
    const path = new URL(url).pathname
    requested.push(path)
    if (unavailable.has(path)) throw new Error('unavailable')
    const data = {
      '/mini/brand': { homeHeroTitle: '当前品牌', groupQr: '/old-brand-group.png' },
      '/mini/content': [{ key: 'home.hero', type: 'banner', imageUrl: '/hero.png' }],
      '/mini/channel': {
        'wechat.work.groupQr': '/current-group.png',
        'wechat.video.finderUserName': 'current-finder',
      },
    }[path]
    if (!data) throw new Error(`Unexpected request: ${path}`)
    return { statusCode: 200, data: { code: 0, data } }
  },
}

const { config } = await import('../services/config.js')
config.mode = 'api'
config.apiBaseUrl = 'https://api.example.com'
const { homeHeroSlides, loadPresentationCatalog } = await import('../services/catalog.js')

test('startup presentation reads only brand, content, and channels and clears failed sources', async () => {
  await loadPresentationCatalog()
  assert.deepEqual(requested, ['/mini/brand', '/mini/content', '/mini/channel'])
  assert.equal(config.brand.homeHeroTitle, '当前品牌')
  assert.equal(config.groupQr, 'https://api.example.com/current-group.png')
  assert.equal(homeHeroSlides.length, 1)

  unavailable = new Set(['/mini/channel'])
  await loadPresentationCatalog()
  assert.equal(config.brand.homeHeroTitle, '当前品牌')
  assert.equal(config.groupQr, '')
  assert.equal(config.finderUserName, '')

  unavailable = new Set(['/mini/brand', '/mini/content'])
  await loadPresentationCatalog()
  assert.equal(config.brand.homeHeroTitle, undefined)
  assert.equal(homeHeroSlides.length, 0)
  assert.equal(config.groupQr, 'https://api.example.com/current-group.png')

  unavailable = new Set(['/mini/brand', '/mini/content', '/mini/channel'])
  await assert.rejects(loadPresentationCatalog(), /网络连接失败/)
  assert.equal(config.brand.homeHeroTitle, undefined)
  assert.equal(config.groupQr, '')
  assert.equal(homeHeroSlides.length, 0)
})
