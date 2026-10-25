const CODE = /^[A-Za-z0-9_-]{1,64}$/

export function lotteryCodeFromInput(value, prefix) {
  const input = String(value || '').trim()
  if (CODE.test(input)) return input
  if (!prefix || !input) return ''
  let link
  try { link = decodeURIComponent(input) } catch { return '' }
  const root = String(prefix).trim()
  if (!root.endsWith('/') || !link.startsWith(root)) return ''
  const code = link.slice(root.length)
  return CODE.test(code) ? code : ''
}
