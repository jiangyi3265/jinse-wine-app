import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

function harness({ packet: initial = {}, result = {}, wxAction, refresh, claim, noWx = false } = {}) {
  const packet = vue.reactive({ id: 'cash-1', status: 'processing', transferStatus: 'WAIT_USER_CONFIRM', ...initial })
  const messages = [], calls = { claim: 0, refresh: 0, wx: 0 }
  const globals = noWx ? {} : { wx: { requestMerchantTransfer(options) {
    calls.wx++
    if (wxAction) wxAction(options)
    else options.success({})
  } } }
  const page = loadPageScript('redpacket', {
    vue, '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../services/store.js': {
      state: vue.reactive({ redPackets: [packet] }),
      receiveRedPacket: async () => {
        calls.claim++
        if (claim) await claim()
        return { state: 'WAIT_USER_CONFIRM', packageInfo: 'test-package', mchId: 'test-mch', appId: 'test-app', ...result }
      },
      refreshRedPacket: async () => { calls.refresh++; if (refresh) await refresh(packet); return packet },
    },
    '../../services/config.js': { isApiMode: () => true },
    '../../services/navigation.js': { go() {}, contact() {}, confirm: async () => true, toast: s => messages.push(s) },
    '../../services/pricing.js': { money: String },
  }, globals)
  page.id.value = packet.id
  return { page, packet, calls, messages }
}

test('waiting transfer has a confirmation action and does not claim success from WeChat UI', async () => {
  const h = harness()
  assert.equal(h.page.canConfirmTransfer.value, true)
  assert.equal(h.page.canStartTransfer.value, false)
  await h.page.receive()
  assert.deepEqual(h.calls, { claim: 1, refresh: 1, wx: 1 })
  assert.equal(h.page.received.value, false)
  assert.equal(h.page.busy.value, false)
})

test('cancelled confirmation refreshes state and can be reopened', async () => {
  const h = harness({ wxAction: o => o.fail({ errMsg: 'requestMerchantTransfer:fail cancel' }) })
  await h.page.receive()
  assert.match(h.messages[0], /可再次/)
  assert.equal(h.calls.refresh, 1)
  assert.equal(h.page.canConfirmTransfer.value, true)
  await h.page.receive()
  assert.equal(h.calls.wx, 2)
})

test('closed reward and unknown in-flight state cannot start a new transfer', async () => {
  for (const packet of [
    { status: 'closed', transferStatus: 'PENDING' },
    { status: 'processing', transferStatus: 'UNKNOWN' },
    { status: 'processing', transferStatus: 'PROCESSING' },
    { status: 'pending', transferStatus: 'NEW_UNKNOWN_STATE' },
  ]) {
    const h = harness({ packet })
    await h.page.receive()
    assert.equal(h.calls.claim, 0)
    assert.equal(h.page.canRefreshTransfer.value, true)
  }
})

test('stale package from non-confirmation state never opens WeChat confirmation', async () => {
  for (const state of ['SUCCESS', 'PROCESSING', 'FAIL', 'CANCELLED', 'UNKNOWN']) {
    const h = harness({ result: { state } })
    await h.page.receive()
    assert.equal(h.calls.wx, 0)
    assert.equal(h.calls.refresh, 1)
  }
})

test('failed transfer with an open reward can retry and only server success marks it received', async () => {
  const h = harness({ packet: { status: 'failed', transferStatus: 'FAIL' }, result: { state: 'SUCCESS' }, refresh: p => { p.status = 'received'; p.transferStatus = 'SUCCESS' } })
  assert.equal(h.page.canStartTransfer.value, true)
  await h.page.receive()
  assert.equal(h.page.received.value, true)
  assert.equal(h.page.canStartTransfer.value, false)
  assert.equal(h.calls.wx, 0)
})

test('missing confirmation fields, unsupported WeChat, and refresh failure release the operation lock', async () => {
  for (const options of [{ result: { appId: '' } }, { noWx: true }, { refresh: () => { throw Error('network') } }]) {
    const h = harness(options)
    await h.page.receive()
    assert.equal(h.page.busy.value, false)
    assert.ok(h.messages.length > 0)
    assert.equal(h.page.received.value, false)
  }
})

test('double click on confirmation reuses one outstanding operation', async () => {
  let resolveClaim
  const h = harness({ claim: () => new Promise(resolve => { resolveClaim = resolve }) })
  const first = h.page.receive()
  await h.page.receive()
  assert.equal(h.calls.claim, 1)
  resolveClaim()
  await first
  assert.equal(h.calls.wx, 1)
})
