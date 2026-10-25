import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { loadEnv } from 'vite'
const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const mode = args[0] === 'build' ? 'build' : 'dev'
const platformIndex = args.indexOf('-p')
const platform = platformIndex >= 0 ? args[platformIndex + 1] : 'h5'
const outputDir = process.env.UNI_OUTPUT_DIR || path.resolve(root, 'unpackage', 'dist', mode, platform)
const viteMode = mode === 'build' ? 'production' : 'development'
const env = { ...loadEnv(viteMode, root, ''), ...process.env }
const miniMode = env.VITE_MINI_MODE || 'api'
const configuredApiBaseUrl = String(
  mode === 'dev' && platform === 'mp-weixin'
    ? env.VITE_MINI_MP_DEV_API_BASE_URL || env.VITE_MINI_API_BASE_URL || ''
    : env.VITE_MINI_API_BASE_URL || '',
).trim()
const configuredLotteryQrPrefix = String(env.VITE_MINI_LOTTERY_QR_PREFIX || '').trim()
const productionBuild = mode === 'build'

if (productionBuild && miniMode === 'demo') {
  console.error('正式构建不允许演示模式；请使用开发服务预览演示数据。')
  process.exit(1)
}
if (productionBuild && miniMode !== 'api') {
  console.error('正式构建仅支持 api 模式。')
  process.exit(1)
}

if (productionBuild && !configuredApiBaseUrl) {
  console.error('正式构建必须设置 VITE_MINI_API_BASE_URL；微信小程序需使用已加入 request 合法域名的 HTTPS 地址。')
  process.exit(1)
}
if (productionBuild && platform === 'mp-weixin' && !/^https:\/\//i.test(configuredApiBaseUrl)) {
  console.error('微信小程序正式构建的 VITE_MINI_API_BASE_URL 必须是 HTTPS 地址。')
  process.exit(1)
}
if (productionBuild && /^http:\/\//i.test(configuredApiBaseUrl)) {
  console.error('正式构建不能使用 HTTP 服务地址。')
  process.exit(1)
}
if (productionBuild && platform === 'h5'
  && !/^https:\/\//i.test(configuredApiBaseUrl)
  && (!configuredApiBaseUrl.startsWith('/') || configuredApiBaseUrl.startsWith('//'))) {
  console.error('H5 正式构建的 VITE_MINI_API_BASE_URL 必须是 HTTPS 地址或同源绝对路径。')
  process.exit(1)
}

const defaultMiniApiBaseUrl = mode === 'dev'
  ? platform === 'h5' ? '/dev-api' : 'http://127.0.0.1:8080'
  : ''
const miniEnv = {
  ...env,
  VITE_MINI_MODE: miniMode,
  VITE_MINI_API_BASE_URL: configuredApiBaseUrl || defaultMiniApiBaseUrl,
  VITE_MINI_DEV_CODE: platform === 'h5' && !productionBuild ? env.VITE_MINI_DEV_CODE || '' : '',
  VITE_MINI_LOTTERY_QR_PREFIX: configuredLotteryQrPrefix,
}
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js', import.meta.url)), ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', env: { ...miniEnv, UNI_INPUT_DIR: root, UNI_OUTPUT_DIR: outputDir },
})
let privateConfigTimer
if (mode === 'dev' && platform === 'mp-weixin') {
  const projectConfig = path.join(outputDir, 'project.config.json')
  const privateConfig = path.join(outputDir, 'project.private.config.json')
  privateConfigTimer = setInterval(() => {
    if (!fs.existsSync(projectConfig)) return
    const current = fs.existsSync(privateConfig) ? JSON.parse(fs.readFileSync(privateConfig, 'utf8')) : {}
    fs.writeFileSync(privateConfig, JSON.stringify({ ...current, setting: { ...current.setting, urlCheck: /^https:\/\//i.test(miniEnv.VITE_MINI_API_BASE_URL) } }, null, 2))
    clearInterval(privateConfigTimer)
    console.log(`微信开发工具项目：${outputDir}（接口 ${miniEnv.VITE_MINI_API_BASE_URL}）`)
  }, 500)
}
child.on('exit', code => { if (privateConfigTimer) clearInterval(privateConfigTimer); process.exit(code ?? 1) })
child.on('error', error => { console.error(error); process.exit(1) })
