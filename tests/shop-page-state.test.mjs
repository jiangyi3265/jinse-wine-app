import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'

test('shop distinguishes a catalog failure from an empty result and recovers on retry', async () => {
  const products = vue.reactive([])
  let attempts = 0
  let onShowHandler
  const page = loadPageScript('shop', {
    vue,
    '@dcloudio/uni-app': { onShow: handler => { onShowHandler = handler } },
    '../../services/catalog.js': {
      products,
      loadProductCatalog: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('网络暂时不可用')
        products.push({ id: 'classic', name: '典藏酱香', spec: '53度', category: '酱香', sales: 0, price: 39800 })
      },
    },
    '../../services/navigation.js': { go() {} },
  })

  await onShowHandler()
  assert.equal(page.loading.value, false)
  assert.equal(page.loadError.value, '网络暂时不可用')
  assert.equal(page.filtered.value.length, 0)

  await page.reload()
  assert.equal(page.loadError.value, '')
  assert.equal(page.filtered.value.length, 1)
  assert.equal(page.filtered.value[0].name, '典藏酱香')
})
