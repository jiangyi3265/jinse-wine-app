import { config, isApiMode } from './config.js'
import { offerProfileCompletion } from './profile-completion.js'

const TOKEN_KEY = 'jinse-mini-token-v1'
const AUTH_PATH = '/mini/auth/wechat'
let loginTask
let invitationTask
let pendingInviteCode = ''

export function setPendingInviteCode(value) {
  const code = String(value || '').trim()
  if (/^[A-Za-z0-9_-]{3,128}$/.test(code)) pendingInviteCode = code
}

function token() {
  try {
    const value = uni.getStorageSync(TOKEN_KEY) || ''
    // 小程序会话由服务端生成的 URL-safe 随机串，不是管理员使用的 JWT。
    if (isSessionToken(value)) return value
    if (value) uni.removeStorageSync(TOKEN_KEY)
    return ''
  } catch {
    return ''
  }
}

// 页面可以据此决定是否展示游客态，避免打开小程序时为了加载个人中心
// 就自动唤起微信登录。真正需要会员数据的操作仍由 request(auth: true) 保护。
export function hasSession() {
  return Boolean(token())
}

function isSessionToken(value) {
  return typeof value === 'string' && value.length >= 40 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value)
}

function saveToken(value) {
  if (!value) throw new Error('登录服务未返回令牌')
  uni.setStorageSync(TOKEN_KEY, value)
}

function url(path) {
  const base = config.apiBaseUrl?.replace(/\/$/, '')
  // 生产包默认使用同源接口；本地 H5 通过 /dev-api 代理到 8080。
  return `${base}${path}`
}

function toError(result, statusCode) {
  const error = statusCode === 401 || result?.code === 401
    ? new Error('登录已失效，请重新进入小程序')
    : statusCode === 404
      ? new Error('该业务接口尚未接入')
      : statusCode >= 500
        ? new Error('服务暂时不可用，请稍后重试')
        : new Error(result?.message || result?.msg || `请求失败（${statusCode}）`)
  error.statusCode = result?.code || statusCode
  return error
}

async function send(path, { method = 'GET', data, authorized = false, requestId } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const authToken = authorized ? token() : ''
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (requestId) headers['Idempotency-Key'] = requestId
  let response
  try {
    response = await uni.request({ url: url(path), method, data, header: headers, timeout: 15000 })
  } catch {
    throw new Error('网络连接失败，请检查服务地址或网络')
  }
  const { data: body, statusCode } = response
  if (statusCode < 200 || statusCode >= 300 || body?.code !== 0)
    throw toError(body, statusCode)
  return body.data
}

async function wechatCode() {
  // H5 开发身份由服务端单独配置；发布包不写入任何账号或密钥。
  // #ifdef H5
  const devCode = import.meta.env?.DEV && import.meta.env?.VITE_MINI_DEV_CODE
  if (devCode) return devCode
  // #endif
  // #ifdef MP-WEIXIN
  const result = await uni.login({ provider: 'weixin' })
  if (result.code) return result.code
  // #endif
  throw new Error('请在微信小程序中登录，或配置本机开发身份')
}

export async function login() {
  if (!isApiMode()) throw new Error('当前为演示模式')
  if (!loginTask) {
    loginTask = (async () => {
      const code = await wechatCode()
      const result = await send(AUTH_PATH, {
        method: 'POST',
        // Authentication must remain available even when an invitation is
        // invalid, cyclic, or belongs to a different existing parent.
        data: { code },
      })
      saveToken(result?.token)
      offerProfileCompletion(result?.user)
      return result
    })().finally(() => { loginTask = null })
  }
  return loginTask
}

export async function applyPendingInvitation() {
  if (!isApiMode()) return
  if (!token()) await login()
  let outcome
  while (pendingInviteCode) {
    if (!invitationTask) {
      const code = pendingInviteCode
      invitationTask = (async () => {
        try {
          const bind = () => send('/mini/promotion/bind', { method: 'POST', data: { code }, authorized: true })
          try { await bind() }
          catch (error) {
            if (error.statusCode !== 401) throw error
            uni.removeStorageSync(TOKEN_KEY)
            await login()
            await bind()
          }
          if (pendingInviteCode === code) pendingInviteCode = ''
          return { status: 'bound' }
        } catch (error) {
          if ([400, 409].includes(Number(error.statusCode))) {
            if (pendingInviteCode === code) pendingInviteCode = ''
            return { status: 'rejected', message: error.message }
          }
          // Keep the invitation on transient failure and prevent a business
          // write from proceeding without its intended attribution.
          throw error
        }
      })().finally(() => { invitationTask = null })
    }
    outcome = await invitationTask
  }
  return outcome
}

export async function request(path, options = {}) {
  if (!isApiMode()) throw new Error('当前为演示模式')
  if (options.auth) await applyPendingInvitation()
  try {
    return await send(path, { ...options, authorized: !!options.auth })
  } catch (error) {
    if (options.auth && error.message.includes('登录已失效')) {
      uni.removeStorageSync(TOKEN_KEY)
      await login()
      await applyPendingInvitation()
      return send(path, { ...options, authorized: true })
    }
    throw error
  }
}

export const get = (path, auth = false) => request(path, { auth })
export const post = (path, data, auth = true, requestId) =>
  request(path, { method: 'POST', data, auth, requestId })
export const patch = (path, data) => request(path, { method: 'PATCH', data, auth: true })

export async function upload(path, filePath, fieldName = 'file') {
  if (!isApiMode()) throw new Error('当前为演示模式')
  await applyPendingInvitation()
  const authToken = token()
  if (!authToken) throw new Error('登录已失效，请重新进入小程序')
  let response
  try {
    response = await uni.uploadFile({
      url: url(path),
      filePath,
      name: fieldName,
      header: { Authorization: `Bearer ${authToken}` },
      timeout: 30000,
    })
  } catch {
    throw new Error('头像上传失败，请检查网络后重试')
  }
  let body = response.data
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  if (response.statusCode < 200 || response.statusCode >= 300 || body?.code !== 0)
    throw toError(body, response.statusCode)
  return body.data
}
