import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { config } from '../services/config.js'
import { useMemberList } from '../services/member-list.js'
import { loadPageScript } from './helpers/page-script.mjs'

config.mode = 'api'
const result = (rows, total = rows.length, pageNum = 1) => ({ rows, total, pageNum, pageSize: 20 })

test('member pager sends server filters and can reach records beyond former fixed caps', async () => {
  const calls = [], status = vue.ref('paid')
  const pager = useMemberList('orders', { filters: () => ({ status: status.value }), fetchPage: async (domain, query) => {
    calls.push([domain, query]); return result([{ id: 'old-order' }], 237, query.pageNum)
  } })
  await pager.load(12)
  assert.deepEqual(calls, [['orders', { status: 'paid', pageNum: 12, pageSize: 20 }]])
  assert.equal(pager.total.value, 237)
  assert.equal(pager.pageCount.value, 12)
  assert.equal(pager.rows.value[0].id, 'old-order')
  status.value = 'complete'
  await pager.load(1)
  assert.equal(calls[1][1].status, 'complete')
  assert.equal(pager.pageNum.value, 1)
})

test('late success and late failure from an earlier tab cannot overwrite the current list', async () => {
  for (const fail of [false, true]) {
    const requests = []
    const pager = useMemberList('awards', { fetchPage: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) })
    const first = pager.load(12), second = pager.load(1)
    requests[1].resolve(result([{ id: 'current' }], 1))
    await second
    if (fail) requests[0].reject(new Error('old failure'))
    else requests[0].resolve(result([{ id: 'old' }], 240, 12))
    await first
    assert.equal(pager.rows.value[0].id, 'current')
    assert.equal(pager.loadError.value, '')
    assert.equal(pager.pageNum.value, 1)
    assert.equal(pager.loading.value, false)
  }
})

test('deleting the last-page rows moves the list to the current last page', async () => {
  const pages = []
  const pager = useMemberList('orders', { fetchPage: async (_, q) => {
    pages.push(q.pageNum)
    return q.pageNum === 12 ? result([], 200, 12) : result([{ id: 'last-remaining' }], 200, 10)
  } })
  await pager.load(12)
  assert.deepEqual(pages, [12, 10])
  assert.equal(pager.pageNum.value, 10)
  assert.equal(pager.rows.value[0].id, 'last-remaining')
})

test('empty and failed lists can recover without stale loading or page state', async () => {
  let unavailable = true
  const pager = useMemberList('drawRecords', { fetchPage: async () => {
    if (unavailable) throw new Error('network unavailable')
    return result([], 0, 12)
  } })
  await pager.load(12)
  assert.equal(pager.loadError.value, 'network unavailable')
  assert.equal(pager.loading.value, false)
  unavailable = false
  await pager.load(12)
  assert.equal(pager.loadError.value, '')
  assert.equal(pager.pageNum.value, 1)
  assert.equal(pager.total.value, 0)
})

function awardsHarness({ qr = async id => '/qr-' + id, ticketQr = async () => ({ qrCode: 'data:image/png;base64,YWJj' }) } = {}) {
  const calls = []
  const list = { rows: vue.ref(Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), status: 'pending', code: 'CODE-' + i }))), total: vue.ref(237), pageNum: vue.ref(1), pageSize: 20, loading: vue.ref(true), loadError: vue.ref(''), load: async () => {} }
  const page = loadPageScript('awards', {
    vue, '@dcloudio/uni-app': { onShow() {}, onHide() {}, onUnload() {} },
    '../../services/store.js': { state: { awards: [] }, loadRewardCodeQr: async id => { calls.push(id); return qr(id) } },
    '../../services/member-list.js': { useMemberList: () => list },
    '../../services/navigation.js': { go() {} },
    '../../services/config.js': { isApiMode: () => true },
    '../../services/product-media.js': { productImage: value => value || '/placeholder.png' },
    '../../services/api.js': { get: ticketQr },
    '../../services/ticket-code.js': { ticketImageSource: async value => value, removeTicketImage() {} },
  })
  return { page, calls, list }
}

test('reward codes are requested only for the first and explicitly expanded awards', async () => {
  const { page, calls } = awardsHarness()
  await page.loadRewardQrs()
  assert.deepEqual(calls, ['1'])
  page.expanded.value = '20'
  await page.loadRewardQrs()
  assert.deepEqual(calls, ['1', '20'])
  await page.loadRewardQrs()
  assert.deepEqual(calls, ['1', '20'])
})

test('ticket awards request the original private code without generating a local redemption code', async () => {
  const { page, calls, list } = awardsHarness()
  list.rows.value = [{ id: '99', kind: 'ticket', status: 'pending', code: 'TK-99' }]
  await page.loadRewardQrs()
  assert.deepEqual(calls, [])
  assert.equal(page.qrById['99'], 'data:image/png;base64,YWJj')
  page.clearTicketQrs()
  assert.equal(page.qrById['99'], undefined)
})

test('ticket image response arriving after leaving the page is discarded', async () => {
  let finish
  const { page, list } = awardsHarness({ ticketQr: () => new Promise(resolve => { finish = resolve }) })
  list.rows.value = [{ id: '99', kind: 'ticket', status: 'pending', code: 'TK-99' }]
  const pending = page.loadRewardQrs()
  page.clearTicketQrs()
  finish({ qrCode: 'data:image/png;base64,YWJj' })
  await pending
  assert.equal(page.qrById['99'], undefined)
})

test('failed reward codes retry and clear their previous error after recovery', async () => {
  let fail = true
  const { page, calls, list } = awardsHarness({ qr: async () => {
    if (fail) throw new Error('code unavailable')
    return '/recovered.png'
  } })
  await page.loadRewardQrs()
  assert.equal(page.qrErrors['1'], 'code unavailable')
  fail = false
  await page.loadRewardQrs()
  assert.equal(page.qrById['1'], '/recovered.png')
  assert.equal(page.qrErrors['1'], undefined)
  list.rows.value[0].status = 'closed'
  page.expanded.value = '2'
  await page.loadRewardQrs()
  assert.deepEqual(calls, ['1', '1', '2'])
  assert.equal(page.awardStatus('closed'), '已失效')
})
