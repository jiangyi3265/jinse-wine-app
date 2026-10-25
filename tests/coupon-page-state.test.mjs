import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

for (const route of ['coupons', 'my-coupons']) {
  test(`${route} blocks stale coupon actions after a load failure and locks an active claim`, async () => {
    const template = { id: 'multi2', name: '活动券', channel: '节日活动', claimLimit: 1 }
    const couponTemplates = vue.reactive([template])
    const state = vue.reactive({ coupons: [{ id: 'old', templateId: 'old' }], checkout: { productId: '', quantity: 1, couponId: null } })
    let onLoadHandler
    let onShowHandler
    let loadCount = 0
    let claims = 0
    let finishClaim
    const claim = new Promise(resolve => { finishClaim = resolve })
    const page = loadPageScript(route, {
      vue,
      '@dcloudio/uni-app': {
        onLoad: handler => { onLoadHandler = handler },
        onShow: handler => { onShowHandler = handler },
      },
      '../../services/catalog.js': {
        couponTemplates,
        getProduct: () => null,
        loadCouponCatalog: async () => { if (++loadCount === 1) throw new Error('券目录暂时不可用') },
        loadProductSkus: async () => [],
      },
      '../../services/store.js': {
        state,
        claimCoupon: async () => {
          claims += 1
          await claim
          state.coupons.push({ id: 'new', templateId: 'multi2' })
        },
        couponClaimLimitReached: id => state.coupons.some(coupon => coupon.templateId === id),
        loadCart: async () => [],
        persist() {},
        refreshDomain: async () => {},
      },
      '../../services/pricing.js': { couponEligibility: () => '' },
      '../../services/navigation.js': { go() {}, back() {}, toast() {} },
      '../../services/config.js': { isApiMode: () => true },
    })

    onLoadHandler({ mine: '0' })
    await onShowHandler()
    assert.equal(page.loading.value, false)
    assert.equal(page.loadError.value, '券目录暂时不可用')
    await page.loadCoupons()
    assert.equal(page.loadError.value, '')
    assert.equal(page.filtered.value.length, 1)

    const first = page.handle(template)
    assert.equal(page.claiming.value, 'multi2')
    assert.equal(page.label(template), '领取中')
    assert.equal(page.disabled(template), true)
    await page.handle(template)
    assert.equal(claims, 1)
    finishClaim()
    await first
    assert.equal(page.claiming.value, '')
    assert.equal(page.label(template), '已领取')
  })
}
