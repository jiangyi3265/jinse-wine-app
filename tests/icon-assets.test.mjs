import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'

function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    return entry.isDirectory() ? vueFiles(path) : entry.name.endsWith('.vue') ? [path] : []
  })
}

test('literal AppIcon names have local and backend MinIO seed assets for every tone', () => {
  let checked = 0
  for (const file of ['pages/', 'components/'].flatMap(path => vueFiles(new URL('../' + path, import.meta.url)))) {
    const { descriptor } = parse(readFileSync(file, 'utf8'))
    function visit(node) {
      if (node.tag === 'AppIcon') {
        const name = node.props.find(prop => prop.type === 6 && prop.name === 'name')?.value?.content
        if (name) {
          for (const tone of ['ink', 'light', 'muted', 'gold']) {
            const asset = `${name}-${tone}.png`
            assert.ok(existsSync(new URL('../static/icons/' + asset, import.meta.url)), `${file.pathname}: missing local icon ${asset}`)
            assert.ok(existsSync(new URL('../../jinse-wine-backend/ruoyi-admin/src/main/resources/static/mini-assets/icons/' + asset, import.meta.url)), `${file.pathname}: missing MinIO seed ${asset}`)
          }
          checked++
        }
      }
      for (const child of node.children || []) visit(child)
    }
    if (descriptor.template?.ast) visit(descriptor.template.ast)
  }
  assert.ok(checked > 50, 'Expected to inspect the current page and component icon references')
})
