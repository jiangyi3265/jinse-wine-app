import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('service channels and QR codes read their own public data and clear stale values', async () => {
  let route
  let channel = {
    'wechat.video.finderUserName': 'verified-finder',
    'wechat.video.liveFeedId': 'live-1',
    'wechat.customer.serviceQr': '/customer.png',
  }
  const paths = []
  const page = loadPageScript('service', {
    vue,
    '@dcloudio/uni-app': { onLoad: callback => { route = callback }, onShow() {} },
    '../../services/config.js': {
      config: { finderUserName: 'stale-finder', customerServiceQr: '/stale.png' },
      isApiMode: () => true, mediaUrl: value => `https://api.example.com${value}`,
    },
    '../../services/api.js': { get: async path => {
      paths.push(path)
      if (path === '/mini/brand') return { officialAccountQr: '/official.png' }
      if (path === '/mini/channel') {
        if (channel instanceof Error) throw channel
        return channel
      }
      throw new Error(`Unexpected catalog read: ${path}`)
    } },
    '../../services/navigation.js': { go() {}, toast() {} },
  })

  route({ type: 'channels' })
  await page.loadService()
  assert.equal(page.serviceData.value.finderUserName, 'verified-finder')
  assert.equal(page.serviceData.value.videoLiveFeedId, 'live-1')

  channel = new Error('渠道读取失败')
  await page.loadService()
  assert.deepEqual({ ...page.serviceData.value }, {})
  assert.equal(page.loadError.value, '渠道读取失败')

  route({ type: 'official' })
  await page.loadService()
  assert.equal(page.serviceData.value.officialQr, 'https://api.example.com/official.png')

  channel = { 'wechat.customer.serviceQr': '/current.png' }
  route({ type: 'customer' })
  await page.loadService()
  assert.equal(page.serviceData.value.customerServiceQr, 'https://api.example.com/current.png')
  assert.deepEqual(paths, ['/mini/channel', '/mini/channel', '/mini/brand', '/mini/channel'])
})
