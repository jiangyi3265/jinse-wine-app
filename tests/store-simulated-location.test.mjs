import test from 'node:test'
import assert from 'node:assert/strict'

let metadataFails = false
let mapOpened = false
let mapChoice, copiedAddress
globalThis.uni = {
  request: async ({ url }) => {
    const route = new URL(url).pathname
    if (route === '/mini/content/stores.locations') {
      if (metadataFails) throw new Error('offline')
      return { statusCode: 200, data: { code: 0, data: { content: { 'XS-yatang': { simulated: true } } } } }
    }
    const store = { id: 'XS-yatang', name: '雄森酒业门市部', address: '广西平南县雅塘街82号', phone: '0775-7866298', latitude: 23.54, longitude: 110.39 }
    return { statusCode: 200, data: { code: 0, data: route === '/mini/stores' ? [store] : store } }
  },
  setClipboardData: options => { copiedAddress = options.data; options.complete() },
  chooseLocation: options => { mapChoice = options },
  openLocation: () => { mapOpened = true },
}
const { config } = await import('../services/config.js')
config.mode = 'api'
config.apiBaseUrl = 'https://api.example.com'
const { loadStoreCatalog, loadStoreByCode, stores } = await import('../services/catalog.js')
const { distanceMetres } = await import('../services/store-distance.js')
const { locateStore } = await import('../services/navigation.js')

test('list and direct detail identify simulated positions and avoid real directions or distances', async () => {
  await loadStoreCatalog()
  const detail = await loadStoreByCode('XS-yatang')
  assert.equal(stores[0].locationSimulated, true)
  assert.equal(detail.locationSimulated, true)
  assert.equal(distanceMetres(detail, { latitude: 23.53, longitude: 110.38 }), null)
  locateStore(detail)
  assert.equal(mapOpened, false)
  assert.match(copiedAddress, /雅塘街82号/)
  assert.equal(typeof mapChoice.success, 'function')
  assert.equal(mapChoice.latitude, undefined)
  assert.equal(mapChoice.longitude, undefined)
  metadataFails = true
  await assert.rejects(loadStoreByCode('XS-yatang'), /网络连接失败/)
  await assert.rejects(loadStoreCatalog(), /网络连接失败/)
})
