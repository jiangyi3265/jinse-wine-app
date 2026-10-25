const SCENE = /^P([0-9a-z]{1,13})-([0-9a-z]{1,13})$/
const MAX_LONG = '9223372036854775807'

function decimalFromBase36(value) {
  let digits = [0]
  for (const char of value) {
    let carry = parseInt(char, 36)
    for (let i = digits.length - 1; i >= 0; i--) {
      carry += digits[i] * 36
      digits[i] = carry % 10
      carry = Math.floor(carry / 10)
    }
    while (carry) {
      digits.unshift(carry % 10)
      carry = Math.floor(carry / 10)
    }
  }
  return digits.join('').replace(/^0+(?=\d)/, '')
}

export function productIdFromScene(value) {
  let scene = String(value || '')
  try { scene = decodeURIComponent(scene) } catch { return '' }
  const match = SCENE.exec(scene)
  if (!match || scene.length > 32) return ''
  const memberId = decimalFromBase36(match[1])
  const productId = decimalFromBase36(match[2])
  const valid = id => id !== '0' && (id.length < MAX_LONG.length || (id.length === MAX_LONG.length && id <= MAX_LONG))
  return valid(memberId) && valid(productId) ? productId : ''
}
