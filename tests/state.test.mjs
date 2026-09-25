import test from 'node:test'
import assert from 'node:assert/strict'
const memory = new Map()
globalThis.uni = {
  getStorageSync: (key) => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
}
const {
  state,
  claimCoupon,
  exchangeReward,
  prepareCheckout,
  submitOrder,
  setOrderStatus,
  receiveRedPacket,
  verifyAward,
  saveAddress,
} = await import('../services/store.js')
test('claim once and persist, duplicate claim does not mint another coupon', () => {
  const count = state.coupons.length
  claimCoupon('group95')
  assert.equal(state.coupons.length, count + 1)
  assert.throws(() => claimCoupon('group95'))
  assert.equal(state.coupons.length, count + 1)
})
test('group membership enforced in demo service', () => {
  state.claimedTemplates = state.claimedTemplates.filter((x) => x !== 'group95')
  state.user.groupMember = false
  assert.throws(() => claimCoupon('group95'), /社群/)
  state.user.groupMember = true
})
test('points and stock decrement with one entitlement; insufficient balance leaves state intact', () => {
  const points = state.points,
    stock = state.exchangeStock.voucher20,
    count = state.coupons.length
  exchangeReward('voucher20')
  assert.equal(state.points, points - 200)
  assert.equal(state.exchangeStock.voucher20, stock - 1)
  assert.equal(state.coupons.length, count + 1)
  state.points = 1
  const before = JSON.stringify(state)
  assert.throws(() => exchangeReward('cups'), /积分不足/)
  assert.equal(JSON.stringify(state), before)
  state.points = points - 200
})
test('checkout submission idempotent and coupon reserved; cancel restores availability', () => {
  prepareCheckout('classic')
  const first = submitOrder(),
    second = submitOrder()
  assert.equal(first.id, second.id)
  assert.equal(first.total, 38300)
  const c = state.coupons.find((c) => c.id === first.couponId)
  assert.equal(c.status, 'locked')
  setOrderStatus(first.id, 'cancelled')
  assert.equal(c.status, 'unused')
})
test('payment consumes reserved coupon and cannot repeat or cancel already-paid order', () => {
  prepareCheckout('classic')
  const order = submitOrder()
  setOrderStatus(order.id, 'shipping')
  assert.equal(state.coupons.find((c) => c.id === order.couponId).status, 'used')
  assert.throws(() => setOrderStatus(order.id, 'shipping'))
  assert.throws(() => setOrderStatus(order.id, 'cancelled'))
})
test('red packet cannot be received twice', () => {
  receiveRedPacket('redpack-1')
  assert.throws(() => receiveRedPacket('redpack-1'))
  assert.equal(state.redPackets[0].status, 'received')
})
test('invalid code and duplicate redemption cannot create verification records', () => {
  const before = state.verificationRecords.length
  assert.throws(() => verifyAward('unknown'))
  verifyAward('JS-DEMO-0628')
  assert.throws(() => verifyAward('JS-DEMO-0628'))
  assert.equal(state.verificationRecords.length, before + 1)
})
test('nonstaff cannot verify', () => {
  state.user.role = 'customer'
  assert.throws(() => verifyAward('JS-DEMO-0629'), /权限/)
  state.user.role = 'staff'
})
test('invalid address is rejected', () =>
  assert.throws(
    () =>
      saveAddress({
        name: '测试',
        phone: '123',
        region: '广西',
        detail: '测试路',
      }),
    /手机号码/,
  ))
