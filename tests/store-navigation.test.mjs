import test from 'node:test'
import assert from 'node:assert/strict'
import { hasStoreCoordinates, locateStore } from '../services/navigation.js'

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
