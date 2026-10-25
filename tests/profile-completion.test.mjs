import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadComponentScript } from './helpers/page-script.mjs'

let instance = 0
async function setup(overrides = {}) {
  const completion = await import(`../services/profile-completion.js?case=${++instance}`)
  completion.offerProfileCompletion({ id: 'member-a', name: '微信用户', avatar: '' })
  const calls = [], messages = [], lifecycle = {}
  const page = loadComponentScript('ProfileCompletion', {
    vue,
    '@dcloudio/uni-app': { onShow: fn => { lifecycle.show = fn }, onHide: fn => { lifecycle.hide = fn } },
    '../services/profile-completion.js': completion,
    '../services/store.js': {
      updateAvatar: async path => { calls.push(['avatar', path]); return { avatar: '/profile/upload/avatar.png' } },
      updateProfile: async name => { calls.push(['name', name]); return { name } }, ...overrides,
    },
    '../services/config.js': { mediaUrl: value => value || '', assetUrl: value => value },
    '../services/navigation.js': { toast: message => messages.push(message) },
  })
  return { page, completion, calls, messages, lifecycle }
}

test('missing profile prompts once per member; existing profile is preserved', async () => {
  const { completion } = await setup()
  completion.dismissProfileCompletion()
  completion.offerProfileCompletion({ id: 'member-a', name: '微信用户', avatar: '' })
  assert.equal(completion.profileCompletion.visible, false)
  completion.offerProfileCompletion({ id: 'member-b', name: '已保存昵称', avatar: '/profile/upload/b.png' })
  assert.equal(completion.profileCompletion.visible, false)
  completion.offerProfileCompletion({ id: 'member-c', name: '另一会员', avatar: '' })
  assert.equal(completion.profileCompletion.visible, true)
  assert.equal(completion.profileCompletion.user.id, 'member-c')
})

test('save validates both fields and uses nickname form submission before dismissing', async () => {
  const { page, calls, completion, messages } = await setup()
  await page.save({ detail: { value: { nickname: '' } } })
  assert.match(page.error.value, /昵称/)
  await page.save({ detail: { value: { nickname: '微信昵称' } } })
  assert.match(page.error.value, /头像/)
  assert.equal(calls.length, 0)
  page.chooseAvatar({ detail: { avatarUrl: 'wxfile://temporary-avatar' } })
  page.name.value = '过期输入'
  await page.save({ detail: { value: { nickname: ' 微信昵称 ' } } })
  assert.deepEqual(calls, [['avatar', 'wxfile://temporary-avatar'], ['name', '微信昵称']])
  assert.equal(completion.profileCompletion.visible, false)
  assert.equal(messages.length, 1)
})

test('member can reopen authorization after skipping it', async () => {
  const { completion } = await setup()
  completion.dismissProfileCompletion()
  completion.offerProfileCompletion({ id: 'member-a', name: '微信用户', avatar: '' }, true)
  assert.equal(completion.profileCompletion.visible, true)
})

test('nickname failure retains uploaded avatar and retry does not upload again', async () => {
  let attempt = 0
  const { page, calls, completion } = await setup({ updateProfile: async () => {
    if (++attempt === 1) throw Error('资料保存网络失败')
  } })
  page.chooseAvatar({ detail: { avatarUrl: 'wxfile://temporary-avatar' } })
  const event = { detail: { value: { nickname: '会员昵称' } } }
  await page.save(event)
  assert.equal(completion.profileCompletion.visible, true)
  assert.equal(page.saving.value, false)
  assert.match(page.error.value, /网络失败/)
  assert.equal(page.avatarPath.value, '')
  await page.save(event)
  assert.equal(calls.filter(([type]) => type === 'avatar').length, 1)
  assert.equal(completion.profileCompletion.visible, false)
})

test('upload failure preserves selected image; concurrent saves cannot duplicate submission', async () => {
  let rejectUpload, uploads = 0, names = 0
  const { page, completion, lifecycle } = await setup({
    updateAvatar: () => { uploads++; return new Promise((resolve, reject) => { rejectUpload = reject }) },
    updateProfile: async () => { names++ },
  })
  page.chooseAvatar({ detail: { avatarUrl: 'wxfile://chosen-avatar' } })
  const event = { detail: { value: { nickname: '会员昵称' } } }
  const saving = page.save(event)
  await page.save(event)
  assert.equal(uploads, 1)
  rejectUpload(Error('上传失败'))
  await saving
  assert.equal(names, 0)
  assert.equal(page.avatarPath.value, 'wxfile://chosen-avatar')
  assert.equal(completion.profileCompletion.visible, true)
  lifecycle.hide(); assert.equal(page.pageActive.value, false)
  lifecycle.show(); assert.equal(page.pageActive.value, true)
})
