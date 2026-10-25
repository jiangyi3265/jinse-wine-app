import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Run WeChat's compiler locally; uni-app's build does not validate WXSS syntax.
const args = process.argv.slice(2)
const compilerOption = args.indexOf('--compiler')
const compiler = compilerOption >= 0 ? args.splice(compilerOption, 2)[1] : process.env.WCSC_PATH

const hasCompiler = compiler && existsSync(compiler)

function staticCheck(content) {
  const errors = []
  let braceDepth = 0
  let quote = ''
  let escaped = false
  for (const character of content) {
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '{') braceDepth++
    else if (character === '}') braceDepth--
    if (braceDepth < 0) {
      errors.push('closing brace appears before an opening brace')
      break
    }
  }
  if (quote) errors.push('unterminated string literal')
  if (braceDepth !== 0) errors.push(`unbalanced braces (${braceDepth > 0 ? 'missing closing' : 'extra closing'})`)
  const unsupported = [
    /:focus-within\b/,
    /:has\(/,
    // WeChat's native button reset pattern uses `button::after` and is
    // supported by WXSS. Keep checking the browser-only text pseudo-elements
    // and `::before`, but do not reject the valid button border reset.
    /::(?:before|first-letter|first-line)\b/,
    /@(?:supports|layer)\b/,
  ]
  if (unsupported.some((pattern) => pattern.test(content))) {
    errors.push('contains browser-only selector or at-rule')
  }
  return errors
}

function collectWxss(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectWxss(path) : entry.name.endsWith('.wxss') ? [path] : []
  })
}

let checked = 0
let failed = 0
if (!hasCompiler) {
  console.warn('WeChat wcsc not found; running static WXSS checks. Install the official compiler for compiler-level validation.')
}
for (const directory of args.length ? args : ['unpackage/dist/build/mp-weixin']) {
  const root = resolve(directory)
  if (!existsSync(join(root, 'app.wxss'))) {
    console.error(`Missing app.wxss in ${root}; build the mini program first.`)
    failed++
    continue
  }
  for (const path of collectWxss(root)) {
    const file = relative(root, path).replaceAll('\\', '/')
    checked++
    if (!hasCompiler) {
      const errors = staticCheck(readFileSync(path, 'utf8'))
      if (errors.length) {
        failed++
        console.error(`FAIL ${directory}/${file}\n${errors.join('; ')}`)
      } else {
        console.log(`PASS ${directory}/${file} (static)`)
      }
      continue
    }
    const result = spawnSync(resolve(compiler), ['-lc', file], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024,
    })
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
