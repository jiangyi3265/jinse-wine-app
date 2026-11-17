import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentFailure } from '../services/payment-error.js'

test('failure details preserve native diagnostics without exposing payment credentials', () => {
  const error = paymentFailure({ errno: 102, errMsg: 'requestPayment:fail no permission; paySign=secret prepay_id=secret2' }, true)
  assert.match(error.message, /权限受限/)
  assert.match(error.paymentDetail, /no permission/)
  assert.match(error.paymentDetail, /错误码 102/)
  assert.match(error.paymentDetail, /勿重复付款/)
  assert.doesNotMatch(error.paymentDetail, /secret/)
})

test('unknown failures have a useful fallback and bounded details', () => {
  assert.match(paymentFailure(null).paymentDetail, /微信未返回具体原因/)
  assert.equal(paymentFailure({ errMsg: 'x'.repeat(1000) }).paymentDetail.length, 300)
})
