import test from 'node:test'
import assert from 'node:assert/strict'

let responder
globalThis.uni = { getStorageSync: key => key === 'jinse-mini-token-v1' ? 'a'.repeat(48) : '', request: options => responder(options), uploadFile: async () => ({ statusCode: 200, data: JSON.stringify({ code: 0, data: { name: '旧昵称', phone: '13800000000', avatar: '/profile/upload/new.jpg' } }) }) }
const { config } = await import('../services/config.js')
config.mode = 'api'
const { state, updateProfile, updateAvatar, refreshDomain } = await import('../services/store.js')

test('profile save sends phone, updates shared identity, and nickname-only calls preserve phone', async () => {
  const requests = []
  responder = async options => {
    requests.push(options.data)
    return { statusCode: 200, data: { code: 0, data: { id: '1', name: options.data.name, phone: options.data.phone ?? state.user.phone } } }
  }
  await updateProfile('新昵称', '13600000000')
  assert.deepEqual(requests[0], { name: '新昵称', phone: '13600000000' })
  assert.equal(state.user.phone, '13600000000')
  await updateProfile('微信昵称')
  assert.equal('phone' in requests[1], false)
  assert.equal(state.user.phone, '13600000000')
})

test('late profile read cannot overwrite a saved nickname or phone', async () => {
  let finish
  responder = options => options.method === 'GET' ? new Promise(resolve => { finish = resolve }) : Promise.resolve({ statusCode: 200, data: { code: 0, data: { name: options.data.name, phone: options.data.phone } } })
  const reading = refreshDomain('user')
  await new Promise(resolve => setImmediate(resolve))
  await updateProfile('已保存昵称', '13500000000')
  finish({ statusCode: 200, data: { code: 0, data: { name: '旧昵称', phone: '13800000000' } } })
  await reading
  assert.equal(state.user.name, '已保存昵称'); assert.equal(state.user.phone, '13500000000')
})

test('avatar upload does not overwrite nickname or phone with an older response', async () => {
  state.user.name = '已保存昵称'; state.user.phone = '13500000000'
  await updateAvatar('wxfile://avatar')
  assert.equal(state.user.avatar, '/profile/upload/new.jpg')
  assert.equal(state.user.name, '已保存昵称'); assert.equal(state.user.phone, '13500000000')
})
