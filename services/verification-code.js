export function verificationCodeFromScan(input) {
  let value = String(input || '').trim()
  if (!value) return ''
  const queryStart = value.indexOf('?')
  if (queryStart >= 0) {
    const query = value.slice(queryStart + 1).split('#')[0]
    for (const parameter of query.split('&')) {
      const separator = parameter.indexOf('=')
      if (separator < 0) continue
      const key = parameter.slice(0, separator)
      if (key === 'scene' || key === 'code' || key === 'orderNo') {
        value = parameter.slice(separator + 1)
        break
      }
    }
  }
  try { return decodeURIComponent(value.replace(/\+/g, '%20')).trim() }
  catch { return value.trim() }
}

export function isPickupOrderCode(value) {
  return /^JS[A-Z0-9]{20}$/.test(value)
}
