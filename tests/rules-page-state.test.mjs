import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { normalizeRuleContent } from '../services/rules-content.js'

test('rules read public content without catalog and hide stale rules on failure', async () => {
  let route
  let brand = {}
  let items = [{ key: 'rules.coupon', content: [{ title: '使用规则', text: '每单限用一张' }] }]
  const paths = []
  const page = loadPageScript('rules', {
    vue,
    '@dcloudio/uni-app': { onLoad: callback => { route = callback }, onShow() {} },
    '../../services/catalog.js': { getCouponTemplate: () => null },
    '../../services/config.js': { isApiMode: () => true },
    '../../services/rules-content.js': { normalizeRuleContent },
    '../../services/api.js': { get: async path => {
      paths.push(path)
      if (path === '/mini/brand') {
        if (brand instanceof Error) throw brand
        return brand
      }
      if (path === '/mini/content') {
        if (items instanceof Error) throw items
        return items
      }
      throw new Error(`Unexpected catalog read: ${path}`)
    } },
  })

  route({ type: 'coupon' })
  await page.loadRules()
  assert.deepEqual(page.content.value.map(section => section.lines[0]), ['每单限用一张'])
  assert.deepEqual(paths, ['/mini/brand', '/mini/content'])

  brand = new Error('品牌读取失败')
  items = new Error('内容读取失败')
  await page.loadRules()
  assert.equal(page.content.value.length, 0)
  assert.ok(page.loadError.value)

  brand = { rulesJson: JSON.stringify({ coupon: [{ heading: '品牌规则', lines: ['以后台配置为准'] }] }) }
  await page.loadRules()
  assert.equal(page.content.value[0].heading, '品牌规则')
  assert.equal(page.loadError.value, '')

  items = [{ key: 'rules.coupon', content: { sections: [{ heading: '新版规则', lines: ['后台最新内容'] }], table: { columns: ['优惠', '说明'], rows: [['9折', '两件起']] } } }]
  await page.loadRules()
  assert.equal(page.content.value[0].heading, '新版规则')
  assert.equal(page.remoteTable.value.rows[0][0], '9折')
})
