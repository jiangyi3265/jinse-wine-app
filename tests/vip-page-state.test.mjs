import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('VIP campaigns load without the shop catalog and group QR fails closed', async () => {
  let channel = { 'wechat.work.groupQr': '/group-qr.png' }
  const calls = []
  const page = loadPageScript('vip', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/config.js': { config: { groupQr: '' }, isApiMode: () => true, mediaUrl: value => `https://api.example.com${value}` },
    '../../services/navigation.js': { go() {}, contact() {}, toast() {} },
    '../../services/api.js': {
      get: async path => {
        calls.push(path)
        if (path === '/mini/social/campaigns') return [{ id: 1, title: '社群活动' }]
        if (path === '/mini/channel') {
          if (channel instanceof Error) throw channel
          return channel
        }
        throw new Error(`Unexpected catalog read: ${path}`)
      },
      post() {},
    },
    '../../services/store.js': { newRequestId: () => 'request-1' },
  })

  await Promise.all([page.loadCampaigns(), page.loadGroupQr()])
  assert.equal(page.campaigns.value[0].title, '社群活动')
  assert.equal(page.groupQr.value, 'https://api.example.com/group-qr.png')
  assert.deepEqual(calls, ['/mini/social/campaigns', '/mini/channel'])

  channel = new Error('渠道读取失败')
  await page.loadGroupQr()
  assert.equal(page.groupQr.value, '')
  assert.equal(page.groupQrError.value, '渠道读取失败')
  assert.equal(page.campaigns.value[0].title, '社群活动')

  channel = { 'wechat.work.groupQr': '/expired.png', 'wechat.work.groupQrExpired': 'true' }
  await page.loadGroupQr()
  assert.equal(page.groupQr.value, '')
  assert.equal(page.groupQrError.value, '')
})
