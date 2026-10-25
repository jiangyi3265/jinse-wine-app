import { setPendingInviteCode, applyPendingInvitation } from './api.js'
import { productIdFromScene } from './product-scene.js'

export function invitationFromEntry(options) {
  const query = options?.query || {}
  // Product-poster scenes also carry attribution. Draw and pickup scenes do not.
  const path = String(options?.path || '').replace(/^\//, '')
  const productScene = path === 'pages/product/index' && productIdFromScene(query.scene)
  let value = query.inviteCode || (productScene || !path || path === 'pages/index/index' ? query.scene : '') || ''
  try { value = decodeURIComponent(value) } catch { return '' }
  const code = String(value).trim()
  if (/^[A-Za-z0-9_-]{1,2}-\d{14}-[A-Fa-f0-9]{12}$/.test(code)) return ''
  return /^[A-Za-z0-9_-]{3,128}$/.test(code) ? code : ''
}

export async function acceptEntryInvitation(options) {
  const code = invitationFromEntry(options)
  if (!code) return
  setPendingInviteCode(code)
  return applyPendingInvitation()
}
