import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { parse, compileScript, babelParse } from '@vue/compiler-sfc'

// Compile actual page handlers; only imported service/platform boundaries are mocked.
export function loadPageScript(page, modules, globals = {}) {
  const filename = new URL(`../../pages/${page}/index.vue`, import.meta.url)
  return loadVueScript(filename, page, modules, globals)
}

export function loadComponentScript(name, modules, globals = {}) {
  return loadVueScript(new URL(`../../components/${name}.vue`, import.meta.url), name, modules, globals)
}

function loadVueScript(filename, page, modules, globals) {
  const { descriptor } = parse(readFileSync(filename, 'utf8'))
  let code = compileScript(descriptor, { id: page, genDefaultAs: 'component' }).content
  const imports = babelParse(code, { sourceType: 'module' }).program.body.filter(n => n.type === 'ImportDeclaration')
  for (const node of imports.reverse()) {
    const source = node.source.value
    if (source.endsWith('.vue')) modules[source] = { default: {} }
    for (const item of node.specifiers) {
      const key = item.type === 'ImportDefaultSpecifier' ? 'default' : item.imported.name
      assert.ok(modules[source] && key in modules[source], `Missing mock import ${source}:${key}`)
    }
    const bindings = node.specifiers.map(item => `${item.type === 'ImportDefaultSpecifier' ? 'default' : item.imported.name}: ${item.local.name}`).join(', ')
    code = code.slice(0, node.start) + `const { ${bindings} } = modules[${JSON.stringify(source)}];` + code.slice(node.end)
  }
  return runInNewContext(`${code}; component.setup({}, { expose() {} })`, { modules, ...globals })
}
