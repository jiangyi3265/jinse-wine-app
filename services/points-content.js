import { get } from './api.js'
import { mediaUrl } from './config.js'
import { normalizeRuleContent } from './rules-content.js'

// These are presentation fields only. Price, stock and redemption eligibility
// always come from the exchange API and are checked again on redemption.
export function normalizeExchangeDetails(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : []
  return Object.fromEntries(items.filter(item => typeof item?.code === 'string' && item.code).map(item => [item.code, {
    venue: typeof item.venue === 'string' ? item.venue : '',
    sections: normalizeRuleContent(item.sections).sections,
    images: (Array.isArray(item.images) ? item.images : []).filter(image => typeof image?.url === 'string' && image.url).map(image => ({
      url: mediaUrl(image.url), caption: typeof image.caption === 'string' ? image.caption : '',
    })),
  }]))
}

export function rewardExchangeDetail(award, details) {
  if (award?.kind !== 'voucher' && award?.kind !== 'goods') return null
  // Match the full exchange code, rather than a product name or partial code.
  const code = Object.keys(details || {}).sort((a, b) => b.length - a.length)
    .find(key => String(award.code || '').startsWith(`EX-${key}-`))
  return code ? details[code] : null
}

export async function loadPointsContent() {
  const content = await get('/mini/content')
  const items = Array.isArray(content) ? content : []
  return {
    guide: normalizeRuleContent(items.find(item => item.key === 'rules.points')?.content).sections,
    details: normalizeExchangeDetails(items.find(item => item.key === 'exchange.details')?.content),
  }
}
