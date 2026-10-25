import { reactive } from 'vue'

const env = import.meta.env || {}

// 浏览器/小程序默认走 Java 服务；部署到正式域名时用 VITE_MINI_API_BASE_URL 覆盖。
const isNodeRuntime = typeof process !== 'undefined' && Boolean(process.versions?.node)
export const config = reactive({
  mode: env.VITE_MINI_MODE || (isNodeRuntime ? 'demo' : 'api'),
  // Development addresses are injected by scripts/uni.mjs or bin/start-local.ps1.
  // Keep the fallback empty so a production bundle can never carry a localhost URL.
  apiBaseUrl: env.VITE_MINI_API_BASE_URL || '',
  lotteryQrPrefix: env.VITE_MINI_LOTTERY_QR_PREFIX || '',
  finderUserName: '',
  videoLiveFeedId: '',
  videoLiveNonceId: '',
  videoFeedId: '',
  videoNonceId: '',
  officialAccountQr: '',
  customerServiceQr: '',
  groupQr: '',
  brand: {},
  // 公开页面内容由后台维护，key 对应 /mini/content 返回的 contentKey。
  content: {},
})

export const isApiMode = () => config.mode === 'api'

// 线上模式不回退到本地示例数据，避免把演示内容误当成运营数据。
export const displayValue = (value, demoValue = '') => isApiMode() ? value || '' : value || demoValue

/** 读取页面内容；线上模式缺失时返回空值，禁止回退到本地演示素材。 */
export const contentValue = (key, field = 'content', demoValue = '') => {
  const item = config.content?.[key]
  const value = item?.[field] ?? (field === 'imageUrl' ? item?.image : undefined)
  return isApiMode() ? value || '' : value || demoValue
}

// API 模式下，服务端返回的相对媒体地址统一走后端地址。
export function mediaUrl(value) {
  if (!value) return ''
  if (!isApiMode() || /^([a-z]+:)?\/\//i.test(value) || value.startsWith('data:')) return value
  const base = config.apiBaseUrl?.replace(/\/$/, '')
  return value.startsWith('/') && base ? `${base}${value}` : value
}

// 设计稿中的本地路径仅作为演示键；线上模式统一映射到后台静态资源。
export function assetUrl(localPath, contentKey = '') {
  if (contentKey) {
    const configured = contentValue(contentKey, 'imageUrl')
    if (configured) return configured
  }
  if (!isApiMode()) return localPath
  return mediaUrl(localPath.replace('/static/', '/mini-assets/'))
}
