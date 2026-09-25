// All monetary calculations use integer cents. Actual payment must use a server quote.
export const money = (cents, decimals = false) =>
  (Number(cents || 0) / 100).toFixed(decimals ? 2 : Number(cents) % 100 ? 2 : 0)
export function couponEligibility(coupon, lines, now = Date.now()) {
  if (!coupon || coupon.status !== 'unused') return '优惠券不可用'
  if (coupon.expiresAt <= now) return '优惠券已过期'
  if (coupon.startsAt && coupon.startsAt > now) return '优惠券尚未生效'
  const eligible = lines.filter(
    (line) => !coupon.productIds?.length || coupon.productIds.includes(line.productId),
  )
  if (!eligible.length) return '不适用于所选商品'
  const subtotal = eligible.reduce((total, line) => total + line.price * line.quantity, 0)
  if (eligible.reduce((total, line) => total + line.quantity, 0) < (coupon.minQuantity || 1))
    return `购买${coupon.minQuantity}件及以上可用`
  if (subtotal < (coupon.minimum || 0)) return `满${money(coupon.minimum)}元可用`
  return ''
}
export function quoteOrder(lines, coupon, shipping = 0, now = Date.now()) {
  if (
    lines.some(
      (line) =>
        !Number.isSafeInteger(line.price) ||
        line.price < 0 ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 99,
    )
  )
    throw new Error('商品数量或价格无效')
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const reason = coupon ? couponEligibility(coupon, lines, now) : ''
  const eligibleSubtotal = lines
    .filter((line) => !coupon?.productIds?.length || coupon.productIds.includes(line.productId))
    .reduce((sum, line) => sum + line.price * line.quantity, 0)
  let discount = 0
  if (coupon && !reason)
    discount =
      coupon.kind === 'fixed'
        ? coupon.amount
        : Math.round((eligibleSubtotal * (100 - coupon.rate)) / 100)
  discount = Math.max(0, Math.min(discount, coupon?.maxDiscount ?? subtotal, eligibleSubtotal))
  return {
    subtotal,
    shipping,
    discount,
    total: Math.max(0, subtotal - discount + shipping),
    reason,
  }
}
