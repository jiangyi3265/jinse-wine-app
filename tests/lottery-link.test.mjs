import test from 'node:test'
import assert from 'node:assert/strict'
import { lotteryCodeFromInput } from '../services/lottery-link.js'

const prefix = 'https://jiuyekl.oksja.cn/qr/lottery/'

test('official scene and configured ordinary QR link resolve to the same draw code', () => {
  const code = 'JS-20261006130000-ABC123DEF456'
  assert.equal(lotteryCodeFromInput(code, prefix), code)
  assert.equal(lotteryCodeFromInput(`${prefix}${code}`, prefix), code)
  assert.equal(lotteryCodeFromInput(encodeURIComponent(`${prefix}${code}`), prefix), code)
})

test('ordinary QR links reject other hosts, paths, queries, and encoded slashes', () => {
  assert.equal(lotteryCodeFromInput('https://other.example/qr/lottery/ABC', prefix), '')
  assert.equal(lotteryCodeFromInput('https://jiuyekl.oksja.cn/qr/other/ABC', prefix), '')
  assert.equal(lotteryCodeFromInput(`${prefix}ABC?source=other`, prefix), '')
  assert.equal(lotteryCodeFromInput(`${prefix}ABC%2FDEF`, prefix), '')
  assert.equal(lotteryCodeFromInput('https://jiuyekl.oksja.cn/qr/lottery/ABC', ''), '')
})
