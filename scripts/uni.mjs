import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const mode = args[0] === 'build' ? 'build' : 'dev'
const platformIndex = args.indexOf('-p')
const platform = platformIndex >= 0 ? args[platformIndex + 1] : 'h5'
const outputDir = process.env.UNI_OUTPUT_DIR || path.resolve(root, 'unpackage', 'dist', mode, platform)
// 微信开发工具不能使用 H5 的 /dev-api 代理，默认把本机 Java 地址直接编译进小程序包。
const defaultMiniApiBaseUrl = platform === 'h5' ? '/dev-api' : 'http://127.0.0.1:8080'
const miniEnv = {
  ...process.env,
  VITE_MINI_MODE: process.env.VITE_MINI_MODE || 'api',
  VITE_MINI_API_BASE_URL: process.env.VITE_MINI_API_BASE_URL || defaultMiniApiBaseUrl,
}
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js', import.meta.url)), ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', env: { ...miniEnv, UNI_INPUT_DIR: root, UNI_OUTPUT_DIR: outputDir },
})
child.on('exit', code => process.exit(code ?? 1))
child.on('error', error => { console.error(error); process.exit(1) })
