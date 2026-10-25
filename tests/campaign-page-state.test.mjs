import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('campaign claim depends on current coupons, not the shop catalog', async () => {
  const templates = vue.reactive([{ id: 'festival', channel: '节日活动', name: '节日优惠券' }])
  const calls = []
  const messages = []
  let failCoupons = false
  let claimResult = async () => {}
  const page = loadPageScript('campaign', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/store.js': {
      claimCoupon: async id => { calls.push(['claim', id]); return claimResult() },
      couponClaimLimitReached: () => false,
      refreshDomain: async domain => calls.push(['refresh', domain]),
    },
    '../../services/catalog.js': {
      couponTemplates: templates,
      loadCouponCatalog: async () => {
        calls.push(['catalog', 'coupons'])
        if (failCoupons) throw new Error('券目录读取失败')
      },
    },
    '../../services/config.js': {
      config: { brand: {} }, displayValue: value => value || '', isApiMode: () => true,
      assetUrl: value => value, mediaUrl: value => value,
    },
    '../../services/api.js': { get: async path => {
      calls.push(['get', path])
      assert.equal(path, '/mini/brand')
      return { homeCampaignTitle: '会员领券', homeCampaignImage: '/campaign.jpg' }
    } },
    '../../services/navigation.js': { go() {}, toast: message => messages.push(message) },
  })

  await Promise.all([page.loadCampaign(), page.loadCampaignBrand()])
  assert.equal(page.campaignCoupon.value.name, '节日优惠券')
  assert.equal(page.campaignBrand.value.campaignHeroTitle, '会员领券')
  assert.equal(page.groupCoupon.value, undefined)
  templates.push({ id: 'group-fixed', channel: '社群专享', kind: 'fixed', amount: 1500 })
  assert.equal(page.groupBenefit.value.value, '15')
  assert.equal(page.groupBenefit.value.unit, '元')
  await page.claim()
  assert.deepEqual(calls.slice(0, 4), [
    ['catalog', 'coupons'], ['get', '/mini/brand'], ['refresh', 'coupons'], ['claim', 'festival'],
  ])

  failCoupons = true
  await page.loadCampaign()
  assert.equal(page.campaignCoupon.value, null)
  assert.equal(page.groupCoupon.value, null)
  assert.equal(page.couponReady.value, false)
  await page.claim()
  assert.equal(calls.filter(call => call[0] === 'claim').length, 1)
  assert.equal(messages.at(-1), '请先确认活动优惠券')

  failCoupons = false
  await page.loadCampaign()
  let finish
  claimResult = () => new Promise(resolve => { finish = resolve })
  const first = page.claim()
  const second = page.claim()
  assert.equal(page.claiming.value, true)
  assert.equal(calls.filter(call => call[0] === 'claim').length, 2)
  finish()
  await Promise.all([first, second])
  assert.equal(page.claiming.value, false)
})
