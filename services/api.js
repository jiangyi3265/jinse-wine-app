import { config, isApiMode } from './config.js'

const TOKEN_KEY = 'jinse-mini-token-v1'
const AUTH_PATH = '/mini/auth/wechat'
let loginTask

function token() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
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
  if (statusCode === 401 || result?.code === 401) return new Error('登录已失效，请重新进入小程序')
  if (statusCode === 404) return new Error('该业务接口尚未接入')
  if (statusCode >= 500) return new Error('服务暂时不可用，请稍后重试')
  return new Error(result?.message || result?.msg || `请求失败（${statusCode}）`)
}

async function send(path, { method = 'GET', data, authorized = false, requestId } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (authorized) headers.Authorization = `Bearer ${token()}`
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
  const devCode = import.meta.env?.DEV && import.meta.env?.VITE_MINI_DEV_CODE
  if (devCode) return devCode
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
      const result = await send(AUTH_PATH, { method: 'POST', data: { code } })
      saveToken(result?.token)
      return result
    })().finally(() => { loginTask = null })
  }
  return loginTask
}

export async function request(path, options = {}) {
  if (!isApiMode()) throw new Error('当前为演示模式')
  if (options.auth && !token()) await login()
  try {
    return await send(path, { ...options, authorized: !!options.auth })
  } catch (error) {
    if (options.auth && error.message.includes('登录已失效')) {
      uni.removeStorageSync(TOKEN_KEY)
      await login()
      return send(path, { ...options, authorized: true })
    }
    throw error
  }
}

export const get = (path, auth = false) => request(path, { auth })
export const post = (path, data, auth = true, requestId) =>
  request(path, { method: 'POST', data, auth, requestId })
export const patch = (path, data) => request(path, { method: 'PATCH', data, auth: true })
