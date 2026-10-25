import test from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../services/config.js'
import { invitationFromEntry } from '../services/invitation.js'
import { productIdFromScene } from '../services/product-scene.js'

let version = 0
async function harness({ loggedIn = true, bind } = {}) {
  config.mode = 'api'
  config.apiBaseUrl = 'https://api.example'
  const storage = new Map(loggedIn ? [['jinse-mini-token-v1', 'T'.repeat(48)]] : [])
  const calls = []
  globalThis.uni = {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: key => storage.delete(key),
    login: async () => ({ code: 'test-wechat-code' }),
    request: async options => {
      const path = new URL(options.url).pathname
      calls.push({ path, data: options.data })
      if (path === '/mini/auth/wechat') return { statusCode: 200, data: { code: 0, data: { token: 'N'.repeat(48) } } }
      if (path === '/mini/promotion/bind' && bind) return bind(options.data.code)
      return { statusCode: 200, data: { code: 0, data: {} } }
    },
  }
  const api = await import(`../services/api.js?invitation-test=${++version}`)
  return { api, calls, storage }
}
const ok = () => ({ statusCode: 200, data: { code: 0, data: {} } })
const failed = code => ({ statusCode: code, data: { code, message: 'invitation rejected' } })

test('cold and warm entry queries accept referral codes and exclude draw/pickup scenes', () => {
  assert.equal(invitationFromEntry({ path: 'pages/index/index', query: { scene: 'JS123PROMO' } }), 'JS123PROMO')
  assert.equal(invitationFromEntry({ path: '/pages/product/index', query: { inviteCode: 'JS%31PROMO' } }), 'JS1PROMO')
  assert.equal(invitationFromEntry({ path: 'pages/product/index', query: { scene: 'P1-2' } }), 'P1-2')
  assert.equal(invitationFromEntry({ path: 'pages/scan/index', query: { scene: 'LOTTERY123' } }), '')
  assert.equal(invitationFromEntry({ query: { scene: 'JW-20261006123456-ABCDEF123456' } }), '')
  assert.equal(invitationFromEntry({ query: { inviteCode: '%bad%' } }), '')
})

test('product poster scenes resolve exact product ids and reject other scenes', () => {
  assert.equal(productIdFromScene('P1-2'), '2')
  assert.equal(productIdFromScene('P1-1y2p0ij32e8e7'), '9223372036854775807')
  assert.equal(productIdFromScene('P1-1y2p0ij32e8e8'), '')
  assert.equal(productIdFromScene('P0-1'), '')
  assert.equal(productIdFromScene('JS1PROMO'), '')
})

test('concurrent authenticated calls share one pending bind before business requests', async () => {
  let release
  const h = await harness({ bind: () => new Promise(resolve => { release = () => resolve(ok()) }) })
  h.api.setPendingInviteCode('INVITE-A')
  const first = h.api.get('/mini/me', true), second = h.api.get('/mini/orders', true)
  assert.equal(h.calls.length, 1)
  release()
  await Promise.all([first, second])
  assert.equal(h.calls.filter(c => c.path === '/mini/promotion/bind').length, 1)
  assert.equal(h.calls.length, 3)
})

test('new invitation arriving during bind is not cleared by the old response', async () => {
  let release
  const h = await harness({ bind: code => code === 'INVITE-A' ? new Promise(resolve => { release = () => resolve(ok()) }) : ok() })
  h.api.setPendingInviteCode('INVITE-A')
  const request = h.api.get('/mini/me', true)
  h.api.setPendingInviteCode('INVITE-B')
  release()
  await request
  assert.deepEqual(h.calls.filter(c => c.path === '/mini/promotion/bind').map(c => c.data.code), ['INVITE-A', 'INVITE-B'])
})

test('invalid or already-bound invitation cannot prevent login and normal browsing', async () => {
  for (const code of [400, 409]) {
    const h = await harness({ loggedIn: false, bind: () => failed(code) })
    h.api.setPendingInviteCode('INVALID-INVITE')
    await h.api.get('/mini/me', true)
    await h.api.get('/mini/orders', true)
    assert.deepEqual(h.calls[0].data, { code: 'test-wechat-code' })
    assert.equal(h.calls.filter(c => c.path === '/mini/promotion/bind').length, 1)
    assert.equal(h.calls.at(-1).path, '/mini/orders')
  }
})

test('temporary attribution failure blocks business writes and retains invitation for retry', async () => {
  let offline = true
  const h = await harness({ bind: () => { if (offline) throw Error('network'); return ok() } })
  h.api.setPendingInviteCode('INVITE-A')
  await assert.rejects(h.api.post('/mini/orders', {}, true), /网络连接失败/)
  assert.equal(h.calls.some(c => c.path === '/mini/orders'), false)
  offline = false
  await h.api.post('/mini/orders', {}, true)
  assert.equal(h.calls.filter(c => c.path === '/mini/promotion/bind').length, 2)
  assert.equal(h.calls.at(-1).path, '/mini/orders')
})

test('missing bind endpoint does not silently discard attribution', async () => {
  let available = false
  const h = await harness({ bind: () => available ? ok() : failed(404) })
  h.api.setPendingInviteCode('INVITE-A')
  await assert.rejects(h.api.post('/mini/orders', {}, true), /尚未接入/)
  assert.equal(h.calls.some(c => c.path === '/mini/orders'), false)
  available = true
  await h.api.post('/mini/orders', {}, true)
  assert.equal(h.calls.filter(c => c.path === '/mini/promotion/bind').length, 2)
})

test('expired session during attribution refreshes login and retries the same invite', async () => {
  let attempts = 0
  const h = await harness({ bind: () => ++attempts === 1 ? failed(401) : ok() })
  h.api.setPendingInviteCode('INVITE-A')
  await h.api.get('/mini/me', true)
  assert.deepEqual(h.calls.map(c => c.path), ['/mini/promotion/bind', '/mini/auth/wechat', '/mini/promotion/bind', '/mini/me'])
  assert.equal(h.storage.get('jinse-mini-token-v1'), 'N'.repeat(48))
})
