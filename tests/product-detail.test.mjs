import test from 'node:test'
import assert from 'node:assert/strict'
import { productDetail } from '../services/product-detail.js'

test('rice detail specs match each confirmed product and never imply a mixed-size bundle', () => {
  for (const prefix of ['zhuangyuan', 'nver']) {
    for (const volume of ['500', '1500']) {
      const unit = volume === '500' ? '瓶' : '坛'
      const product = { id: `XS-${prefix}-${volume}`, name: prefix, spec: `52度 ${volume}mL/${unit}`, category: '高度米酒系列' }
      const result = productDetail(product, ['/cover.jpg', '/zhuangyuan-9612.jpg', '/zhuangyuan-9632.jpg'])
      assert.ok(result)
      assert.equal(result.parameters.find(row => row[0] === '净含量')[1], `${volume}mL / ${unit}`)
      assert.equal(result.parameters.find(row => row[0] === '每件数量')[1], `1${unit}`)
      assert.ok(result.images[1].caption.includes(`${volume}mL × 1${unit}`))
      assert.ok(result.images[2].caption.includes('不含其他规格及拍摄道具'))
      assert.ok(result.selection.includes('不代表组合销售'))
      const changed = productDetail({ ...product, spec: '38度 2500mL/坛' }, ['/cover.jpg', '/side.jpg'])
      assert.equal(changed.parameters.find(row => row[0] === '产品规格')[1], '38度 2500mL/坛')
      assert.deepEqual(changed.facts, [])
      assert.equal(changed.images.length, 2)
    }
  }
  assert.ok(productDetail({ id: 'classic', spec: '52度 500mL/瓶' }))
  assert.equal(productDetail(null), null)
})

test('editable details show their own alcohol content and discard stale spec-specific content', () => {
  const product = { id: 'XS-bugu-2500', name: '补骨酒（坛装）', spec: '38度 2500mL/坛', description: '当前商品描述', category: '植物配方酒' }
  const editorial = {
    spec: product.spec,
    facts: [{ value: '38', unit: '%vol', label: '酒精度' }],
    parameters: [['生产企业', '广西雄森酒业有限公司']],
    images: [{ file: 'jar.jpg', heading: '坛装与木盒', caption: '2500mL坛装实拍。' }],
    selection: '每件1坛。',
  }
  const detail = productDetail(product, ['https://example.test/jar.jpg?v=1', '/pour.jpg'], editorial)
  assert.equal(detail.facts[0].value, '38')
  assert.equal(detail.intro, product.description)
  assert.equal(detail.images[0].heading, '坛装与木盒')
  assert.equal(detail.images[1].heading, '商品实拍')
  assert.equal(detail.parameters.length, 4)
  const edited = productDetail({ ...product, spec: '40度 1000mL/瓶' }, ['/jar.jpg', '/pour.jpg'], editorial)
  assert.deepEqual(edited.facts, [])
  assert.equal(edited.parameters[1][1], '40度 1000mL/瓶')
  assert.equal(edited.images.length, 2)
  assert.equal(edited.images[0].caption, '')
})

test('photo descriptions remain bound to the image, with no duplicate photos or guessed provenance', () => {
  const product = { id: 'XS-nver-500', spec: '52度 500mL/瓶' }
  const detail = productDetail(product, ['/nverhong-9682.jpg', '/nverhong-9658.jpg', '/nverhong-9689.jpg', '/nverhong-9658.jpg'])
  assert.equal(detail.images.length, 3)
  assert.ok(detail.images[0].caption.includes('前景为500mL瓶装'))
  assert.ok(detail.images[1].heading.includes('系列包装'))
  assert.ok(detail.images[2].heading.includes('酒体实拍'))
  const { story, purchaseNotices, ...specificDetail } = detail
  assert.doesNotMatch(JSON.stringify(specificDetail), /酱香|窖藏|纯粮|养生|保健/)
})

test('shared company and purchasing information survives new products, stale specs and missing galleries', () => {
  const cases = [
    [{ id: 'new-item', name: '新商品', spec: '盒装' }, null],
    [{ id: 'XS-zhuangyuan-500', name: '状元红', spec: '52度 500mL/瓶' }, null],
    [{ id: 'updated-item', name: '商品', spec: '1000mL/瓶' }, { spec: '500mL/瓶', story: { title: '旧介绍', text: '旧内容' } }],
    [{ id: 'configured-item', name: '商品', spec: '500mL/瓶' }, { spec: '500mL/瓶', story: { title: '旧介绍', text: '旧内容' } }],
  ]
  for (const [product, editorial] of cases) {
    const detail = productDetail(product, [], editorial)
    assert.equal(detail.story.title, '企业介绍')
    assert.equal(detail.story.imageUrl, '/profile/upload/2026/11/11/7d5941801c19431fbaf77dd9919834e2.jpg')
    assert.equal(detail.story.text.split('\n\n').length, 5)
    assert.match(detail.story.text, /始创于1990年/)
    assert.match(detail.story.text, /行业口碑与品牌影响力/)
    assert.deepEqual(detail.purchaseNotices.map(n => n.title), ['关于发票', '关于退换', '收货验货', '退回与保价'])
    assert.doesNotMatch(JSON.stringify(detail.purchaseNotices), /习酒|2026年2月14日/)
  }
})

test('a product with its own feature posters does not repeat the winery introduction', () => {
  const posters = ['/profile/upload/xdf-poster-gold.jpg', '/profile/upload/xdf-poster-liver.jpg', 'javascript:alert(1)', '/profile/upload/xdf-poster-people.jpg']
  const detail = productDetail(
    { id: 'PRO_xdf', name: '熊胆粉（4瓶装）', spec: '0.3克 × 4瓶/盒', category: '林业产品', description: '每瓶0.3克' },
    ['/cover.jpg'],
    { spec: '0.3克 × 4瓶/盒', featurePosters: posters },
  )
  assert.equal(detail.story, null)
  assert.deepEqual(detail.featurePosters, posters.filter(value => value.startsWith('/profile/')))
  assert.equal(detail.purchaseNotices.length, 4)
})
