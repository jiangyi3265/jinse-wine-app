import { readdirSync, existsSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Run WeChat's compiler locally; uni-app's build does not validate WXSS syntax.
const args = process.argv.slice(2)
const compilerOption = args.indexOf('--compiler')
const compiler = compilerOption >= 0 ? args.splice(compilerOption, 2)[1] : process.env.WCSC_PATH

if (!compiler || !existsSync(compiler)) {
  console.error('Provide the WeChat wcsc executable with --compiler <path> or WCSC_PATH.')
  process.exit(1)
}

function collectWxss(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectWxss(path) : entry.name.endsWith('.wxss') ? [path] : []
  })
}

let checked = 0
let failed = 0
for (const directory of args.length ? args : ['dist/build/mp-weixin']) {
  const root = resolve(directory)
  if (!existsSync(join(root, 'app.wxss'))) {
    console.error(`Missing app.wxss in ${root}; build the mini program first.`)
    failed++
    continue
  }
  for (const path of collectWxss(root)) {
    const file = relative(root, path).replaceAll('\\', '/')
    const result = spawnSync(resolve(compiler), ['-lc', file], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024,
    })
    checked++
    if (result.error || result.status !== 0) {
      failed++
      console.error(
        `FAIL ${directory}/${file}\n${result.error?.message || result.stderr || result.stdout}`,
      )
    } else {
      console.log(`PASS ${directory}/${file}`)
    }
  }
}
console.log(`WeChat WXSS compiler: ${checked} files checked, ${failed} failures.`)
process.exitCode = failed ? 1 : 0
