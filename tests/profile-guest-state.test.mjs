import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('guest profile does not report an asset outage; signed-in asset failure does', async () => {
  let signedIn = false
  let requests = 0
  const state = { user: { avatar: '', vip: false }, coupons: [], awards: [], points: 0 }
  const page = loadPageScript('profile', {
    vue,
    '@dcloudio/uni-app': { onShow: () => {} },
    '../../services/store.js': {
      state,
      refreshDomain: async domain => {
        requests++
        if (domain === 'points') throw Error('积分暂不可用')
      },
    },
    '../../services/navigation.js': { go: () => {}, toast: () => {} },
    '../../services/config.js': { assetUrl: path => path, mediaUrl: value => value || '' },
    '../../services/api.js': { hasSession: () => signedIn, login: async () => {} },
    '../../services/profile-completion.js': { offerProfileCompletion() {} },
  })

  await page.loadProfile()
  assert.equal(requests, 0)
  assert.equal(page.signedIn.value, false)
  assert.equal(page.partialError.value, false)

  signedIn = true
  await page.loadProfile()
  assert.equal(requests, 4)
  assert.equal(page.signedIn.value, true)
  assert.equal(page.partialError.value, true)
})
