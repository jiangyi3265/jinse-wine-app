import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteOrder, couponEligibility } from '../services/pricing.js'
const line = { productId: 'classic', price: 39800, quantity: 1 }
const coupon = (extra = {}) => ({
  status: 'unused',
  expiresAt: Date.now() + 100000,
  kind: 'fixed',
  amount: 1500,
  minimum: 20000,
  minQuantity: 1,
  ...extra,
})
test('398 less full-200-15 equals 383; original price never enters total', () =>
  assert.equal(quoteOrder([line], coupon()).total, 38300))
test('two items at 95% equals 756.20', () =>
  assert.equal(
    quoteOrder([{ ...line, quantity: 2 }], coupon({ kind: 'percent', rate: 95, minQuantity: 2 }))
      .total,
    75620,
  ))
test('midautumn 90% equals 358.20', () =>
  assert.equal(quoteOrder([line], coupon({ kind: 'percent', rate: 90 })).total, 35820))
test('quantity gate prevents a one-item group discount', () => {
  const q = quoteOrder([line], coupon({ kind: 'percent', rate: 95, minQuantity: 2 }))
  assert.equal(q.discount, 0)
  assert.match(q.reason, /2件/)
})
test('expired and used coupons cannot discount', () => {
  for (const c of [
    coupon({ expiresAt: 1 }),
    coupon({ status: 'used' }),
    coupon({ status: 'locked' }),
  ])
    assert.equal(quoteOrder([line], c).discount, 0)
})
test('shipping excluded from minimum and added after discount', () => {
  const q = quoteOrder([{ ...line, price: 19000 }], coupon(), 2000)
  assert.equal(q.total, 21000)
  assert.equal(q.discount, 0)
})
test('restricted SKU discount applies only to eligible line', () =>
  assert.equal(
    quoteOrder(
      [line, { productId: 'mellow', price: 26800, quantity: 1 }],
      coupon({ kind: 'percent', rate: 90, productIds: ['classic'] }),
    ).discount,
    3980,
  ))
test('discount cannot exceed goods value or maximum', () => {
  assert.equal(quoteOrder([line], coupon({ amount: 999999 })).total, 0)
  assert.equal(
    quoteOrder([line], coupon({ kind: 'percent', rate: 50, maxDiscount: 1000 })).discount,
    1000,
  )
})
test('invalid quantity rejected rather than producing a negative payable', () => {
  for (const quantity of [0, -1, 1.1, 100])
    assert.throws(() => quoteOrder([{ ...line, quantity }], null))
})
test('future coupon is unavailable', () =>
  assert.equal(
    couponEligibility(coupon({ startsAt: Date.now() + 100000 }), [line]),
    '优惠券尚未生效',
  ))
