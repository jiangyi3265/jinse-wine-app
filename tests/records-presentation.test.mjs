import test from 'node:test'
import assert from 'node:assert/strict'
import * as vue from 'vue'
import { loadPageScript } from './helpers/page-script.mjs'
import { money } from '../services/pricing.js'

function harness() {
  const routes = []
  const page = loadPageScript('records', {
    vue, '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../services/store.js': { state: {}, refreshDomain() {} },
    '../../services/member-list.js': { useMemberList: () => ({ rows: vue.ref([]), load() {} }) },
    '../../services/config.js': { isApiMode: () => true },
    '../../services/pricing.js': { money },
    '../../services/navigation.js': { go: (...args) => routes.push(args), dateLabel() {} },
  })
  return { page, routes }
}

test('draw results use compact labels instead of repeating long prize names', () => {
  const { page } = harness()
  const name = '门票本地体验（非真实门票）'
  for (const [kind, label] of Object.entries({ ticket: '已中门票', goods: '已中实物', coupon: '已中优惠券', none: '未中奖' })) {
    assert.equal(page.drawResult({ kind, title: name, value: name }), label)
  }
})

test('draw results retain cash and point values', () => {
  const { page } = harness()
  assert.equal(page.drawResult({ kind: 'cash', value: '¥0.01' }), '已中红包 ¥0.01')
  assert.equal(page.drawResult({ kind: 'cash', amount: 100 }), '已中红包 ¥1.00')
  assert.equal(page.drawResult({ kind: 'points', value: '50积分' }), '已中积分 · 50积分')
  assert.equal(page.drawResult({ kind: 'points' }), '已中积分')
})

test('draw rows continue to navigate to the corresponding prize', () => {
  const { page, routes } = harness()
  for (const kind of ['ticket', 'goods', 'coupon', 'points', 'cash', 'none']) page.open({ kind, rewardId: '88' })
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), [['awards'], ['awards'], ['my-coupons'], ['points'], ['redpacket', { id: '88' }]])
})
