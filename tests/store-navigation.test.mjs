import test from 'node:test'
import assert from 'node:assert/strict'
import { hasStoreCoordinates, hasVerifiedStoreCoordinates, canLocateStore, storeMapUrl, locateStore } from '../services/navigation.js'

test('store navigation accepts finite coordinates within geographic bounds', () => {
  assert.equal(hasStoreCoordinates({ latitude: '23.12', longitude: '109.41' }), true)
  // This project treats the legacy 0,0 placeholder as an unconfigured store.
  assert.equal(hasStoreCoordinates({ latitude: 0, longitude: 109.41 }), true)
  assert.equal(hasStoreCoordinates({ latitude: 23.12, longitude: 0 }), true)
  for (const coordinates of [
    { latitude: 0, longitude: 0 },
    { latitude: '0.0000000', longitude: '0.0000000' },
    { latitude: null, longitude: null },
    { latitude: '', longitude: 109 },
    { latitude: '  ', longitude: 109 },
    { latitude: true, longitude: 109 },
    { latitude: 'north', longitude: 109 },
    { latitude: 91, longitude: 109 },
    { latitude: 23, longitude: -181 },
  ]) assert.equal(hasStoreCoordinates(coordinates), false)
})

test('store navigation rejects invalid coordinates and passes numbers to the map', () => {
  const opened = [], notices = []
  globalThis.uni = {
    openLocation: (options) => opened.push(options),
    showToast: ({ title }) => notices.push(title),
  }
  locateStore({ name: 'Invalid store', latitude: ' ', longitude: 109 })
  assert.equal(opened.length, 0)
  assert.match(notices[0], /导航位置/)

  locateStore({ name: 'Valid store', address: 'Test Road', latitude: '23.12', longitude: '109.41' })
  assert.equal(opened.length, 1)
  assert.equal(opened[0].latitude, 23.12)
  assert.equal(opened[0].longitude, 109.41)
})

const simulatedStore = {
  name: '雄森酒业门市部', address: '广西平南县雅塘街82号', city: '贵港市',
  latitude: 23.54, longitude: 110.39, locationSimulated: true,
}

test('unverified stores open the map picker without using their simulated coordinates', () => {
  const copied = [], selected = [], opened = []
  globalThis.uni = {
    setClipboardData: options => { copied.push(options.data); options.complete() },
    chooseLocation: options => selected.push(options),
    openLocation: options => opened.push(options),
  }
  const original = structuredClone(simulatedStore)
  assert.equal(hasVerifiedStoreCoordinates(simulatedStore), false)
  assert.equal(canLocateStore(simulatedStore), true)
  locateStore(simulatedStore)
  assert.deepEqual(copied, [simulatedStore.address])
  assert.equal(selected.length, 1)
  assert.equal(selected[0].latitude, undefined)
  assert.equal(selected[0].longitude, undefined)
  assert.equal(opened.length, 0)
  selected[0].success({ name: '用户确认的地点', address: '地图中的地址', latitude: 23.55, longitude: 110.4 })
  assert.equal(opened[0].latitude, 23.55)
  assert.equal(opened[0].longitude, 110.4)
  assert.equal(opened[0].name, '用户确认的地点')
  assert.equal(opened[0].address, '地图中的地址')
  assert.deepEqual(simulatedStore, original)
  assert.equal(canLocateStore({ address: ' ' }), false)
  assert.equal(canLocateStore({ address: '真实门店地址' }), true)
})

test('map cancellation is quiet; permission recovery retries; generic failure offers address copy', () => {
  const choices = [], modals = [], copied = []
  globalThis.uni = {
    setClipboardData: options => { copied.push(options.data); options.complete?.() },
    chooseLocation: options => choices.push(options),
    showModal: options => modals.push(options),
    openSetting: options => options.success({ authSetting: { 'scope.userLocation': true } }),
  }
  locateStore(simulatedStore)
  choices[0].fail({ errMsg: 'chooseLocation:fail cancel' })
  assert.equal(modals.length, 0)
  choices[0].fail({ errMsg: 'chooseLocation:fail auth deny' })
  assert.equal(modals[0].confirmText, '去设置')
  modals[0].success({ confirm: true })
  assert.equal(choices.length, 2)
  choices[1].fail({ errMsg: 'chooseLocation:fail network error' })
  assert.equal(modals[1].confirmText, '复制地址')
  modals[1].success({ confirm: true })
  assert.deepEqual(copied, [simulatedStore.address, simulatedStore.address])
})

test('invalid picker results never start navigation', () => {
  const notices = [], opened = []
  globalThis.uni = {
    setClipboardData: options => options.complete(),
    chooseLocation: options => options.success({ latitude: null, longitude: null }),
    openLocation: options => opened.push(options),
    showToast: options => notices.push(options.title),
  }
  locateStore(simulatedStore)
  assert.equal(opened.length, 0)
  assert.match(notices[0], /有效位置/)
})

test('web maps search by address for unverified stores and mark only verified points', () => {
  const search = new URL(storeMapUrl(simulatedStore))
  assert.equal(search.pathname, '/search')
  assert.equal(search.searchParams.get('keyword'), simulatedStore.address)
  assert.equal(search.searchParams.get('city'), simulatedStore.city)
  assert.equal(search.searchParams.has('position'), false)
  const marker = new URL(storeMapUrl({ ...simulatedStore, locationSimulated: false }))
  assert.equal(marker.pathname, '/marker')
  assert.equal(marker.searchParams.get('position'), '110.39,23.54')
  assert.equal(marker.searchParams.get('coordinate'), 'gaode')
  let destination
  globalThis.window = { location: { assign: url => { destination = url } } }
  try {
    locateStore(simulatedStore)
    assert.equal(destination, search.href)
  } finally { delete globalThis.window }
})
