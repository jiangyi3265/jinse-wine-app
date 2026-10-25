import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { verificationCodeFromScan, isPickupOrderCode } from '../services/verification-code.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(overrides = {}) {
  const state = vue.reactive({ user: { role: 'staff' }, awards: [{ code: 'OWN', status: 'pending' }], verificationRecords: [] })
  let id = 0
  const messages = []
  const domains = []
  const page = loadPageScript('verification', {
    vue,
    '@dcloudio/uni-app': { onShow() {}, onLoad() {} },
    '../../services/store.js': {
      state, newRequestId: prefix => `${prefix}-${++id}`,
      lookupAward: async code => ({ code, status: 'pending', name: '品鉴杯' }),
      verifyAward: async code => ({ code, status: 'redeemed' }),
      lookupPickupOrder: async orderNo => ({ orderNo, status: 'paid' }),
      confirmPickupOrder: async () => {}, loadPickupRedemptions: async () => [],
      refreshDomain: async domain => { domains.push(domain) }, ...overrides,
    },
    '../../services/config.js': { isApiMode: () => true, assetUrl: String, mediaUrl: value => value || '' },
    '../../services/navigation.js': { go() {}, toast: msg => messages.push(msg), confirm: async () => true },
    '../../services/verification-code.js': { verificationCodeFromScan, isPickupOrderCode },
  })
  return { page, state, messages, domains }
}

test('staff lookup is isolated from personal prizes and remains visible after confirmation', async () => {
  let confirmations = 0
  const { page, state, domains } = setup({ verifyAward: async code => { confirmations++; return { code, status: 'redeemed' } } })
  assert.equal(page.award.value, null)
  await page.loadVerification()
  assert.equal(domains.includes('awards'), false)
  page.codeInput.value = 'CUSTOMER'
  await page.lookup()
  assert.equal(page.award.value.code, 'CUSTOMER')
  assert.deepEqual(state.awards.map(a => a.code), ['OWN'])
  state.awards = [] // Personal assets can refresh independently.
  assert.equal(page.award.value.code, 'CUSTOMER')
  await page.verify()
  assert.equal(page.award.value.status, 'redeemed')
  await page.verify()
  assert.equal(confirmations, 1)
})

test('failed lookup removes the previous actionable prize and preserves personal assets', async () => {
  const { page, state } = setup({ lookupAward: async code => {
    if (code === 'FAIL') throw new Error('查询服务不可用')
    return { code, status: 'pending' }
  } })
  page.codeInput.value = 'OK'
  await page.lookup()
  page.codeInput.value = 'FAIL'
  await page.lookup()
  assert.equal(page.award.value, null)
  assert.equal(page.queryError.value, '查询服务不可用')
  assert.equal(state.awards.length, 1)
  page.codeInput.value = ' '
  await page.lookup()
  assert.equal(page.queryError.value, '请先扫描或输入核销码')
})

test('out of order scans and mode switches cannot restore an old result', async () => {
  const old = deferred(), latest = deferred()
  const { page } = setup({ lookupAward: code => code === 'OLD' ? old.promise : latest.promise })
  page.codeInput.value = 'OLD'
  const first = page.lookup()
  page.codeInput.value = 'NEW'
  const second = page.lookup()
  latest.resolve({ code: 'NEW', status: 'pending' })
  await second
  old.resolve({ code: 'OLD', status: 'pending' })
  await first
  assert.equal(page.award.value.code, 'NEW')
  assert.equal(page.querying.value, false)

  const pending = deferred()
  const other = setup({ lookupAward: () => pending.promise }).page
  other.codeInput.value = 'OLD'
  const task = other.lookup()
  other.switchKind('order')
  pending.reject(new Error('旧查询失败'))
  await task
  assert.equal(other.activeKind.value, 'order')
  assert.equal(other.award.value, null)
  assert.equal(other.queryError.value, '')
})

test('editing a code invalidates in-flight pickup lookup and hides old order actions', async () => {
  const pending = deferred()
  const { page } = setup({ lookupPickupOrder: () => pending.promise })
  page.switchKind('order')
  page.codeInput.value = 'ORDER-A'
  const lookup = page.lookup()
  page.codeInput.value = 'ORDER-B'
  page.clearLookup()
  pending.resolve({ orderNo: 'ORDER-A', status: 'paid' })
  await lookup
  assert.equal(page.pickupOrder.value, null)
  assert.equal(page.codeInput.value, 'ORDER-B')
})

test('unknown confirmation can retry the same request without switching the displayed target mid-submit', async () => {
  const pending = deferred()
  const requests = []
  const { page } = setup({ verifyAward: async (code, requestId) => {
    requests.push({ code, requestId })
    if (requests.length === 1) return pending.promise
    return { code, status: 'redeemed' }
  } })
  page.codeInput.value = 'CUSTOMER'
  await page.lookup()
  const first = page.verify()
  await Promise.resolve()
  assert.equal(page.busy.value, true)
  page.switchKind('order')
  page.prepareCode('OTHER')
  await page.lookup()
  await page.verify()
  assert.equal(page.activeKind.value, 'award')
  assert.equal(page.award.value.code, 'CUSTOMER')
  pending.reject(new Error('连接中断'))
  await first
  await page.lookup()
  await page.verify()
  assert.equal(requests.length, 2)
  assert.equal(requests[0].requestId, requests[1].requestId)
  assert.equal(page.award.value.status, 'redeemed')
})
