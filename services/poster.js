import { money } from './pricing.js'

// Work with measured glyph widths so long Chinese names and emoji stay inside
// the same bounds as the page preview, without horizontally squeezing the text.
function linesFor(ctx, value, width, maxLines) {
  const chars = Array.from(String(value || ''))
  const lines = []
  let line = ''
  for (let i = 0; i < chars.length; i++) {
    const next = line + chars[i]
    if (ctx.measureText(next).width <= width) { line = next; continue }
    if (lines.length === maxLines - 1) {
      while (line && ctx.measureText(line + '…').width > width) line = Array.from(line).slice(0, -1).join('')
      lines.push(line + '…')
      return lines
    }
    lines.push(line)
    line = chars[i]
  }
  if (line) lines.push(line)
  return lines
}

export function drawPromotionPoster(ctx, { product, userName, productImage, qrImage, demo }) {
  ctx.setFillStyle('#102c22')
  ctx.fillRect(0, 0, 390, 236)
  ctx.setFillStyle('#ead1a2')
  ctx.setFontSize(20)
  ctx.fillText('金色酒业', 24, 40)
  ctx.setFillStyle('#b9c9bf')
  ctx.setFontSize(11)
  ctx.fillText('甄选佳酿  ·  GOLDEN CELLAR', 24, 65)
  ctx.setFillStyle('#f3efe4')
  ctx.setFontSize(26)
  linesFor(ctx, product.name, 342, 2).forEach((line, i) => ctx.fillText(line, 24, 109 + i * 33))
  ctx.setFillStyle('#d6c6a9')
  ctx.setFontSize(13)
  ctx.fillText(linesFor(ctx, product.spec, 342, 1)[0] || '', 24, 173)
  ctx.setFillStyle('#ead1a2')
  ctx.setFontSize(28)
  const price = `¥${money(product.price)}`
  ctx.fillText(price, 24, 213)
  const originalX = 24 + ctx.measureText(price).width + 12
  if (Number(product.originalPrice) > Number(product.price)) {
    ctx.setFillStyle('#b9c9bf')
    ctx.setFontSize(13)
    const original = `¥${money(product.originalPrice)}`
    const originalWidth = ctx.measureText(original).width
    if (originalX + originalWidth <= 366) {
      ctx.fillText(original, originalX, 210)
      ctx.setStrokeStyle('#b9c9bf')
      ctx.setLineWidth(1)
      ctx.beginPath()
      ctx.moveTo(originalX, 205)
      ctx.lineTo(originalX + originalWidth, 205)
      ctx.stroke()
    }
  }
  ctx.setFillStyle('#eee9df')
  ctx.fillRect(0, 236, 390, 284)
  const scale = Math.min(342 / productImage.width, 260 / productImage.height)
  const width = productImage.width * scale, height = productImage.height * scale
  ctx.drawImage(productImage.path, 24 + (342 - width) / 2, 248 + (260 - height) / 2, width, height)
  ctx.setFillStyle('#f3efe4')
  ctx.fillRect(0, 520, 390, 140)
  ctx.setFillStyle('#21382b')
  ctx.setFontSize(18)
  linesFor(ctx, `${userName || '酒友'}的精选推荐`, 228, 2).forEach((line, i) => ctx.fillText(line, 20, 553 + i * 25))
  ctx.setFillStyle('#77736d')
  ctx.setFontSize(12)
  ctx.fillText(demo ? '演示海报 · 二维码为示意' : '长按识别，进入金色酒业', 20, 605)
  ctx.setFontSize(10)
  ctx.fillText('展示价格仅供参考，以商品页及结算为准', 20, 641)
  ctx.drawImage(qrImage.path, 270, 535, 100, 100)
}
