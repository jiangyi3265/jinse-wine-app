import test from 'node:test'
import assert from 'node:assert/strict'
import { config, mediaUrl } from '../services/config.js'
import { productImage } from '../services/product-media.js'

test('catalog media survives a second resolution by the product card', () => {
  const previous = { mode: config.mode, apiBaseUrl: config.apiBaseUrl }
  try {
    config.mode = 'api'
    config.apiBaseUrl = '/dev-api'
    const photo = '/profile/upload/products/bugu-three-scene-20261109/bugu-three-scene-v1.png'
    assert.equal(productImage(mediaUrl(photo)), '/dev-api' + photo)
    assert.equal(mediaUrl('/dev-api-other/image.jpg'), '/dev-api/dev-api-other/image.jpg')
    config.apiBaseUrl = 'https://example.com/api/'
    assert.equal(productImage(mediaUrl(photo)), 'https://example.com/api' + photo)
    assert.equal(productImage('https://cdn.example.com/photo.jpg'), 'https://cdn.example.com/photo.jpg')
  } finally {
    Object.assign(config, previous)
  }
})
