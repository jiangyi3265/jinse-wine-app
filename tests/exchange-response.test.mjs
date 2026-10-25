import test from 'node:test'
import assert from 'node:assert/strict'

const memory = new Map()
let responder
globalThis.uni = {
  getStorageSync: key => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: key => memory.delete(key),
  request: options => responder(options),
}
memory.set('jinse-mini-token-v1', 'a'.repeat(48))

const { config } = await import('../services/config.js')
config.mode = 'api'
config.apiBaseUrl = 'https://api.example.com'
const { exchangeProducts, couponTemplates } = await import('../services/catalog.js')
const { state, exchangeReward, drawCode, claimCoupon, couponClaimLimitReached, signInPoints } = await import('../services/store.js')

test('confirmed exchange stays successful when follow-up reads fail', async () => {
  const item = { id: 'cup', kind: 'goods', stock: 2, points: 200 }
  exchangeProducts.push(item)
  state.points = 500
  responder = async options => {
    if (options.method === 'POST') return {
      statusCode: 200,
      data: { code: 0, data: { id: '17', name: '品鉴杯', image: '/gift.jpg', pointBalance: 300 } },
    }
    throw new Error('refresh unavailable')
  }

  assert.equal(await exchangeReward('cup'), 'goods')
  assert.equal(state.points, 300)
  assert.equal(item.stock, 1)
  assert.equal(state.awards[0].id, '17')
  assert.equal(memory.get('jinse-mini-request-ids-v1')?.['exchange:cup'], undefined)
})

test('unknown exchange response retains the same idempotency key for retry', async () => {
  const item = { id: 'cups', kind: 'goods', stock: 2, points: 100 }
  exchangeProducts.push(item)
  const sent = []
  let attempt = 0
  responder = async options => {
    if (options.method === 'POST') {
      sent.push(options.header['Idempotency-Key'])
      if (++attempt === 1) throw new Error('response lost')
      return { statusCode: 200, data: { code: 0, data: { id: '18', pointBalance: null } } }
    }
    throw new Error('refresh unavailable')
  }

  await assert.rejects(exchangeReward('cups'), /网络连接失败/)
  assert.ok(memory.get('jinse-mini-request-ids-v1')?.['exchange:cups'])
  assert.equal(await exchangeReward('cups'), 'goods')
  assert.equal(sent.length, 2)
  assert.equal(sent[0], sent[1])
  assert.equal(state.points, 300)
  assert.equal(memory.get('jinse-mini-request-ids-v1')?.['exchange:cups'], undefined)
})

test('confirmed draw remains visible and actionable when follow-up reads fail', async () => {
  responder = async options => {
    if (options.method === 'POST') return {
      statusCode: 200,
      data: { code: 0, data: { id: '31', kind: 'cash', name: '现金红包', amount: 888, pointBalance: 320 } },
    }
    throw new Error('refresh unavailable')
  }

  const result = await drawCode('CASH-31')
  assert.equal(result.id, '31')
  assert.equal(state.points, 320)
  assert.equal(state.drawRecords[0].rewardId, '31')
  assert.equal(state.drawRecords[0].value, '¥8.88')
  assert.equal(memory.get('jinse-mini-request-ids-v1')?.['draw:CASH-31'], undefined)
})

test('goods and coupon draw entitlements remain visible when refresh fails', async () => {
  const results = [
    { id: '32', kind: 'goods', name: '品鉴杯', image: '/cup.jpg', pointBalance: 320 },
    { id: '33', kind: 'coupon', templateId: 'festival90', name: '节日券', status: 'unused', pointBalance: 320 },
  ]
  responder = async options => {
    if (options.method === 'POST') return { statusCode: 200, data: { code: 0, data: results.shift() } }
    throw new Error('refresh unavailable')
  }

  await drawCode('GOODS-32')
  assert.equal(state.awards[0].id, '32')
  assert.equal(state.awards[0].image, 'https://api.example.com/cup.jpg')
  await drawCode('COUPON-33')
  assert.equal(state.coupons[0].id, '33')
  assert.ok(state.claimedTemplates.includes('festival90'))
})

test('confirmed claim and sign-in keep local entitlement and balance when refresh fails', async () => {
  responder = async options => {
    if (options.method === 'POST') return {
      statusCode: 200,
      data: { code: 0, data: options.url.includes('/signin')
        ? { balance: 347 }
        : { id: '41', templateId: 'group95', name: '社群券', status: 'unused' } },
    }
    throw new Error('refresh unavailable')
  }

  assert.equal((await claimCoupon('group95')).id, '41')
  assert.equal(state.coupons[0].id, '41')
  assert.ok(state.claimedTemplates.includes('group95'))
  assert.equal(memory.get('jinse-mini-request-ids-v1')?.['claim:group95'], undefined)
  assert.equal((await signInPoints()).balance, 347)
  assert.equal(state.points, 347)
  assert.equal(Object.keys(memory.get('jinse-mini-request-ids-v1') || {}).filter(key => key.startsWith('signin:')).length, 0)
})

test('claim button remains available until the configured per-member limit is reached', async () => {
  couponTemplates.push({ id: 'multi2', claimLimit: 2 })
  const sent = []
  responder = async options => {
    if (options.method === 'POST') {
      sent.push(options.header['Idempotency-Key'])
      return { statusCode: 200, data: { code: 0, data: { id: String(60 + sent.length), templateId: 'multi2' } } }
    }
    throw new Error('refresh unavailable')
  }

  assert.equal(couponClaimLimitReached('multi2'), false)
  await claimCoupon('multi2')
  assert.equal(couponClaimLimitReached('multi2'), false)
  await claimCoupon('multi2')
  assert.equal(couponClaimLimitReached('multi2'), true)
  assert.notEqual(sent[0], sent[1])
})

test('unknown draw, claim and sign-in responses retain each operation key for retry', async () => {
  const operations = [
    { key: 'draw:RETRY-51', run: () => drawCode('RETRY-51'), result: { id: '51', kind: 'none', value: '谢谢参与' } },
    { key: 'claim:retry-coupon', run: () => claimCoupon('retry-coupon'), result: { id: '52', templateId: 'retry-coupon' } },
    { key: 'signin:', run: () => signInPoints(), result: { balance: 350 } },
  ]
  for (const operation of operations) {
    const sent = []
    responder = async options => {
      if (options.method === 'POST') {
        sent.push(options.header['Idempotency-Key'])
        if (sent.length === 1) throw new Error('response lost')
        return { statusCode: 200, data: { code: 0, data: operation.result } }
      }
      throw new Error('refresh unavailable')
    }
    await assert.rejects(operation.run(), /网络连接失败/)
    const entries = memory.get('jinse-mini-request-ids-v1') || {}
    const key = Object.keys(entries).find(value => value.startsWith(operation.key))
    assert.ok(key)
    assert.ok(entries[key])
    await operation.run()
    assert.deepEqual(sent, [sent[0], sent[0]])
    assert.equal(memory.get('jinse-mini-request-ids-v1')?.[key], undefined)
  }
})
