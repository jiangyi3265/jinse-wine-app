import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('exchange actions reflect balance, stock and in-flight state', async () => {
  const state = vue.reactive({ points: 10, user: { id: 'member-1' }, exchangeStock: {} })
  const items = vue.reactive([
    { id: 'coupon', kind: 'coupon', name: '代金券', points: 200, stock: -1 },
    { id: 'gift', kind: 'goods', name: '礼盒', points: 300, stock: 0 },
  ])
  const messages = []
  let exchanged = 0
  const page = loadPageScript('points', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/catalog.js': { exchangeProducts: items, loadExchangeCatalog: async () => {} },
    '../../services/store.js': {
      state,
      exchangeReward: async () => { exchanged += 1; return 'coupon' },
      refreshDomain: async () => {},
      signInPoints: async () => {},
    },
    '../../services/navigation.js': {
      go() {}, toast: message => messages.push(message), confirm: async () => true,
    },
    '../../services/config.js': { isApiMode: () => true, assetUrl: String },
  })

  assert.equal(page.hasStock(items[0]), true)
  assert.equal(page.exchangeLabel(items[0]), '积分不足')
  assert.equal(page.exchangeLabel(items[1]), '已兑完')
  await page.exchange(items[0])
  assert.equal(exchanged, 0)
  assert.deepEqual(messages, ['积分不足，暂时无法兑换'])
  await page.exchange(items[1])
  assert.equal(exchanged, 0)
  assert.deepEqual(messages, ['积分不足，暂时无法兑换', '该奖品已兑完'])

  state.points = 500
  assert.equal(page.exchangeLabel(items[0]), '兑换')
  page.busy.value = items[0].id
  assert.equal(page.exchangeLabel(items[0]), '兑换中')
  page.busy.value = ''
  items[0].stock = undefined
  assert.equal(page.hasStock(items[0]), false)
  assert.equal(page.exchangeLabel(items[0]), '已兑完')
})
