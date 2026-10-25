import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

function setup(update = async () => {}) {
  const calls = [], messages = []
  let backs = 0
  const page = loadPageScript('profile-edit', {
    vue,
    '../../services/store.js': { state: { user: { name: '会员昵称', phone: '13800000000' } }, updateAvatar: async () => {}, updateProfile: async (...args) => { calls.push(args); await update() } },
    '../../services/navigation.js': { back: () => { backs++ }, toast: message => messages.push(message) },
    '../../services/config.js': { assetUrl: value => value, mediaUrl: value => value || '' },
  })
  return { page, calls, messages, backs: () => backs }
}

test('profile edit saves nickname and phone using the submitted form values', async () => {
  const h = setup()
  await h.page.save({ detail: { value: { nickname: ' 微信昵称 ', phone: ' 13600000000 ' } } })
  assert.deepEqual(h.calls, [['微信昵称', '13600000000']])
  assert.equal(h.backs(), 1)
  assert.equal(h.messages.at(-1), '保存成功')
})

test('invalid phone cannot save or leave the profile editor', async () => {
  const h = setup()
  await h.page.save({ detail: { value: { nickname: '昵称', phone: '123' } } })
  assert.equal(h.calls.length, 0); assert.equal(h.backs(), 0)
  assert.match(h.messages.at(-1), /11位手机号码/)
})

test('failed save retains entered data and can retry without duplicate submission', async () => {
  let reject
  const h = setup(() => new Promise((resolve, failure) => { reject = failure }))
  const event = { detail: { value: { nickname: '昵称', phone: '13600000000' } } }
  const pending = h.page.save(event)
  await h.page.save(event)
  assert.equal(h.calls.length, 1)
  reject(new Error('保存网络失败')); await pending
  assert.equal(h.page.phone.value, '13600000000'); assert.equal(h.page.saving.value, false)
  assert.equal(h.backs(), 0)
})
