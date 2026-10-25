import test from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../services/config.js'
import { loadMemberPage, refreshDomain, state } from '../services/store.js'

config.mode = 'api'
config.apiBaseUrl = 'https://api.example.test'
const requests = []
let response
globalThis.uni = {
  getStorageSync: () => 'a'.repeat(64), setStorageSync() {}, removeStorageSync() {},
  request: async options => { requests.push(options); return { statusCode: 200, data: { code: 0, data: response } } },
}

test('all member history domains use authenticated page requests without client member ids', async () => {
  for (const [domain, path] of Object.entries({
    orders: '/mini/orders', awards: '/mini/rewards', redPackets: '/mini/rewards/cash',
    pointRecords: '/mini/points/records', drawRecords: '/mini/draws',
    verificationRecords: '/mini/staff/redemptions', pickupRecords: '/mini/staff/orders',
    commissionRecords: '/mini/promotion/records',
  })) {
    response = { rows: [{ id: 'old-row', amount: 1 }], total: 237, pageNum: 12, pageSize: 20 }
    const page = await loadMemberPage(domain, { pageNum: 12, pageSize: 20 })
    assert.equal(page.total, 237)
    assert.equal(page.rows[0].id, 'old-row')
    assert.equal(page.rows[0].amount, 1)
    assert.equal(requests.at(-1).url, config.apiBaseUrl + path)
    assert.deepEqual(requests.at(-1).data, { pageNum: 12, pageSize: 20 })
    assert.equal(requests.at(-1).header.Authorization, 'Bearer ' + 'a'.repeat(64))
  }
})

test('missing or inconsistent pagination cannot silently become an empty list', async () => {
  for (const invalid of [
    [], { rows: [], total: 0 }, { rows: [], total: -1, pageNum: 1, pageSize: 20 },
    { rows: [], total: 1.5, pageNum: 1, pageSize: 20 },
    { rows: [], total: 0, pageNum: 2, pageSize: 20 },
    { rows: [], total: 0, pageNum: 1, pageSize: 100 },
    { rows: [{ id: 'impossible' }], total: 0, pageNum: 1, pageSize: 20 },
  ]) {
    response = invalid
    await assert.rejects(loadMemberPage('drawRecords'), /记录数据不完整/)
  }
})

test('profile award total comes from the full count and images retain the backend origin', async () => {
  response = { rows: [{ id: 'old-award', image: '/profile/award.png' }], total: 237, pageNum: 1, pageSize: 20 }
  await refreshDomain('awards', { pageNum: 1, pageSize: 20 })
  assert.equal(state.awards.length, 1)
  assert.equal(state.awardTotal, 237)
  assert.equal(state.awards[0].image, 'https://api.example.test/profile/award.png')
})

test('server order line snapshots and cent amounts survive the paginated response', async () => {
  response = { rows: [{ id: 'order-1', status: 'receiving', total: 101, shipping: 100, items: [
    { orderItemId: 3, name: 'Wine', spec: 'Gift box', quantity: 1, price: 1, image: '/profile/product.png' },
  ] }], total: 1, pageNum: 1, pageSize: 20 }
  const page = await loadMemberPage('orders')
  assert.equal(page.rows[0].total, 101)
  assert.equal(page.rows[0].shipping, 100)
  assert.equal(page.rows[0].items[0].orderItemId, 3)
  assert.equal(page.rows[0].items[0].price, 1)
  assert.equal(page.rows[0].items[0].image, 'https://api.example.test/profile/product.png')
})
