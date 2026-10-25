import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

function withdrawalPage(status) {
  const state = vue.reactive({ user: { role: 'customer' }, promotion: {
    settled: 1000, minWithdrawCent: 1000, records: [{ id: 'record-1', status: 'settled', amount: 1000 }],
  } })
  const messages = []
  const page = loadPageScript('promotion', {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '../../services/store.js': {
      state,
      refreshDomain: async () => { throw new Error('promotion unavailable') },
      withdrawCommission: async () => {
        if (status === 'pending') {
          state.promotion.settled = 0
          state.promotion.records[0].status = 'processing'
        }
        return { id: 'settlement-1', status }
      },
    },
    '../../services/catalog.js': { products: [], loadCatalog: async () => {} },
    '../../services/navigation.js': { go() {}, toast: message => messages.push(message) },
    '../../services/config.js': { isApiMode: () => true },
  }, { uni: { showModal: ({ success }) => success({ confirm: true }) } })
  return { page, state, messages }
}

test('accepted withdrawal is reported as submitted when promotion refresh fails', async () => {
  const { page, state, messages } = withdrawalPage('pending')
  await page.withdrawAll()
  assert.equal(state.promotion.settled, 0)
  assert.deepEqual(messages, ['提现申请已提交，等待财务审核'])
  assert.match(page.loadError.value, /重新加载/)
})

test('settlement replay reports paid and failed outcomes without stale resubmission', async () => {
  for (const [status, expected] of [
    ['paid', '提现已完成，请查看佣金记录'],
    ['failed', '提现申请已退回，请查看佣金记录'],
  ]) {
    const { page, messages } = withdrawalPage(status)
    await page.withdrawAll()
    assert.deepEqual(messages, [expected])
    assert.match(page.loadError.value, /重新加载/)
    await page.withdrawAll()
    assert.deepEqual(messages, [expected])
  }
})

test('promotion refresh failure hides cached commission rows without a catalog dependency', async () => {
  const { page, messages } = withdrawalPage('pending')
  await page.loadPromotion()
  assert.match(page.loadError.value, /promotion unavailable/)
  assert.equal(page.commissionItems.value.length, 0)
  assert.deepEqual(messages, [])
})
