import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { drawRuleTables } from '../services/rules-content.js'

function home(route = 'coupons') {
  const opened = []
  const page = loadPageScript('index', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/navigation.js': { go: (...args) => opened.push(args) },
    '../../services/campaign-popup.js': { claimCampaignPopup: () => false },
    '../../services/product-media.js': { productImage: value => value },
    '../../services/regions.js': { resolveRegion: () => [] },
    '../../services/catalog.js': {
      products: [], stores: [], homeHeroSlides: [],
      loadProductCatalog: async () => {}, loadStoreCatalog: async () => {}, loadPresentationCatalog: async () => {},
    },
    '../../services/config.js': {
      config: { brand: {}, content: { 'home.popup': { content: { enabled: true, route } } } },
      displayValue: value => value, isApiMode: () => false, assetUrl: value => value,
    },
  })
  return { page, opened }
}

test('promotion waits for explicit consent and consumes the pending destination only once', () => {
  const { page, opened } = home('points')
  page.campaignOpen.value = true
  page.openCampaignRules(true)
  assert.equal(page.rulesOpen.value, true)
  assert.equal(page.campaignOpen.value, false)
  assert.equal(opened.length, 0)
  page.continueCampaign()
  page.continueCampaign()
  assert.deepEqual(opened, [['points']])
})

test('cancelled promotion does not navigate when rules are later read from the footer', () => {
  const { page, opened } = home()
  page.openCampaignRules(true)
  page.cancelCampaignRules()
  assert.equal(page.campaignOpen.value, true)
  assert.equal(page.pendingCampaignRoute.value, '')
  page.openCampaignRules(false, false)
  page.continueCampaign()
  assert.equal(page.campaignOpen.value, false)
  assert.equal(opened.length, 0)
  page.openCampaignRules(false)
  page.continueCampaign()
  assert.equal(page.campaignOpen.value, true)
  assert.equal(opened.length, 0)
})

test('promotion cannot redirect consent to an arbitrary CMS route', () => {
  const { page, opened } = home('https://unrelated.invalid')
  page.openCampaignRules(true)
  page.continueCampaign()
  assert.deepEqual(opened, [['coupons']])
})

function scanPage() {
  const draws = [], opened = []
  const page = loadPageScript('scan', {
    vue,
    '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../services/store.js': { previewDraw() {}, drawCode: async code => { draws.push(code); return { kind: 'points' } }, loadDrawPrizes: async () => [] },
    '../../services/config.js': { config: {}, isApiMode: () => true, assetUrl: value => value },
    '../../services/lottery-link.js': { lotteryCodeFromInput: value => value },
    '../../services/navigation.js': { go: (...args) => opened.push(args), toast() {}, confirm: async () => false },
  })
  return { page, draws, opened }
}

test('closing scan rules discards the queued code before a later agreement', async () => {
  const { page, draws } = scanPage()
  await page.handleCode('fixture-code')
  assert.equal(page.rulesOpen.value, true)
  assert.equal(draws.length, 0)
  page.cancelRules()
  page.agreeRules()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(draws.length, 0)
})

test('scan submits the queued code only after agreeing and only once', async () => {
  const { page, draws, opened } = scanPage()
  await page.handleCode('fixture-code')
  page.agreeRules()
  page.agreeRules()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(draws, ['fixture-code'])
  assert.deepEqual(opened, [['points']])
})

test('draw rules label remaining stock and use actual reward values without invented totals', () => {
  const tables = drawRuleTables([{ activityId: 1, activityName: '活动甲', prizes: [
    { name: '现金红包', kind: 'cash', amountMinCent: 88, amountMaxCent: 188, stock: 23 },
    { name: '积分', kind: 'points', points: 99, stock: -1 },
    { name: '门票', kind: 'ticket', stock: 0 },
    { name: '待配置奖品', kind: 'cash', stock: null },
  ] }])
  assert.deepEqual(tables[0].columns, ['奖品', '权益说明', '剩余份数'])
  assert.deepEqual(tables[0].rows, [
    ['现金红包', '¥0.88–¥1.88', '23'], ['积分', '99 积分', '不限'], ['门票', '门票权益', '0'], ['待配置奖品', '以活动为准', '以活动为准'],
  ])
  assert.deepEqual(drawRuleTables(null), [])
  assert.deepEqual(drawRuleTables([null, {}, { prizes: [null, { name: '' }] }]), [])
})
