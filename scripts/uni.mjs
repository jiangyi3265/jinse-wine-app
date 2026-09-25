import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js', import.meta.url)), ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', env: { ...process.env, UNI_INPUT_DIR: root },
})
child.on('exit', code => process.exit(code ?? 1))
child.on('error', error => { console.error(error); process.exit(1) })
