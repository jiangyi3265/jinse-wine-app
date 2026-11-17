import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadComponentScript } from './helpers/page-script.mjs'

function component(get, wx) {
  const messages = []
  return { messages, page: loadComponentScript('CommissionTransfers', {
    vue, '@dcloudio/uni-app': { onShow() {} },
    '../services/api.js': { get }, '../services/config.js': { isApiMode: () => true },
    '../services/navigation.js': { toast: value => messages.push(value) },
  }, { wx }) }
}
test('merchant confirmation does not itself mark a commission as paid', async () => {
  let confirms = 0
  const { page } = component(async path => path.endsWith('/1')
    ? { state: 'WAIT_USER_CONFIRM', appId: 'app', mchId: 'merchant', packageInfo: 'package' }
    : { configured: true, rows: [{ id: 1, amount: 490, status: 'PROCESSING' }] },
  { requestMerchantTransfer(options) { confirms++; options.success({}) } })
  await page.confirmReceipt({ id: 1 })
  assert.equal(confirms, 1)
  assert.equal(page.rows.value[0].status, 'PROCESSING')
  assert.equal(page.busy.value, null)
})
test('unsupported clients retain the pending entitlement and release the operation lock', async () => {
  const { page, messages } = component(async () => ({ state: 'WAIT_USER_CONFIRM', appId: 'app', mchId: 'merchant', packageInfo: 'package' }), undefined)
  await page.confirmReceipt({ id: 1 })
  assert.equal(page.busy.value, null)
  assert.match(messages[0], /最新版微信小程序/)
})
test('duplicate confirmation clicks cannot launch two merchant confirmation requests', async () => {
  let release; let calls = 0
  const { page } = component(async path => {
    if (!path.endsWith('/1')) return { configured: true, rows: [] }
    calls++; await new Promise(resolve => { release = resolve }); return { state: 'SUCCESS' }
  })
  const first = page.confirmReceipt({ id: 1 })
  await page.confirmReceipt({ id: 1 })
  assert.equal(calls, 1); release(); await first
  assert.equal(page.busy.value, null)
})
