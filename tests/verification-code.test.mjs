import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { verificationCodeFromScan, isPickupOrderCode } from '../services/verification-code.js'
import { loadPageScript } from './helpers/page-script.mjs'

test('verification scan extracts official scenes and exact pickup order numbers', () => {
  const scene = 'RB-0123456789abcdef'
  const orderNo = 'JS' + 'A'.repeat(20)
  assert.equal(verificationCodeFromScan(`pages/verification/index?scene=${scene}`), scene)
  assert.equal(verificationCodeFromScan(`https://mini.example/pages/verification/index?scene=${encodeURIComponent(scene)}`), scene)
  assert.equal(verificationCodeFromScan(`pages/verification/index?orderNo=${orderNo}`), orderNo)
  assert.equal(isPickupOrderCode(orderNo), true)
  assert.equal(isPickupOrderCode(`prefix-${orderNo}`), false)
})

test('staff opening a reward scene verifies the resolved reward code', async () => {
  const scene = 'RB-0123456789abcdef'
  const fullCode = 'EX-CUPA1-123456789abc'
  const state = vue.reactive({ user: { role: 'staff' }, awards: [], verificationRecords: [] })
  const lookedUp = [], confirmed = []
  let onLoadHandler, onShowHandler
  const page = loadPageScript('verification', {
    vue,
    '@dcloudio/uni-app': {
      onLoad: handler => { onLoadHandler = handler },
      onShow: handler => { onShowHandler = handler },
    },
    '../../services/store.js': {
      state,
      lookupAward: async code => {
        lookedUp.push(code)
        return { id: '11', name: '品鉴杯', code: fullCode, status: 'pending' }
      },
      verifyAward: async (code, requestId) => { confirmed.push({ code, requestId }) },
      lookupPickupOrder: async () => {},
      confirmPickupOrder: async () => {},
      loadPickupRedemptions: async () => [],
      refreshDomain: async () => {},
      newRequestId: () => 'redeem-request-1',
    },
    '../../services/config.js': { isApiMode: () => true, assetUrl: String, mediaUrl: value => value || '' },
    '../../services/navigation.js': { go() {}, toast() {}, confirm: async () => true },
    '../../services/verification-code.js': { verificationCodeFromScan, isPickupOrderCode },
  })

  onLoadHandler({ scene })
  await onShowHandler()
  assert.deepEqual(lookedUp, [scene])
  assert.equal(page.selected.value, fullCode)
  assert.equal(page.award.value.code, fullCode)
  await page.verify()
  assert.deepEqual(confirmed, [{ code: fullCode, requestId: 'redeem-request-1' }])
})

test('confirmed pickup remains complete when recent redemption list cannot refresh', async () => {
  const state = vue.reactive({ user: { role: 'staff' }, awards: [], verificationRecords: [] })
  const messages = []
  const page = loadPageScript('verification', {
    vue,
    '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../services/store.js': {
      state,
      lookupAward: async () => {},
      verifyAward: async () => {},
      lookupPickupOrder: async () => {},
      confirmPickupOrder: async () => ({ id: 'JS123', status: 'complete' }),
      loadPickupRedemptions: async () => { throw new Error('list unavailable') },
      refreshDomain: async () => {},
      newRequestId: () => 'pickup-request-1',
    },
    '../../services/config.js': { isApiMode: () => true, assetUrl: String, mediaUrl: value => value || '' },
    '../../services/navigation.js': { go() {}, toast: message => messages.push(message), confirm: async () => true },
    '../../services/verification-code.js': { verificationCodeFromScan, isPickupOrderCode },
  })
  page.pickupOrder.value = { orderNo: 'JS123', status: 'paid', itemKinds: 1 }
  await page.verifyPickupOrder()
  assert.equal(page.pickupOrder.value.status, 'complete')
  assert.equal(page.pickupRequestId.value, '')
  assert.deepEqual(messages, ['订单核销完成，佣金已按当前规则入账'])
})
