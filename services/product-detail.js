import { companyStory, purchaseNotices } from './product-common.js'

// Descriptions refer only to the supplied photos and confirmed catalog specs.
// Do not infer ingredients, vintage, aroma or production methods from packaging.
const riceProducts = {
  'XS-zhuangyuan-500': { title: '状元红', volume: '500', unit: '瓶' },
  'XS-zhuangyuan-1500': { title: '状元红', volume: '1500', unit: '坛' },
  'XS-nver-500': { title: '女儿红', volume: '500', unit: '瓶' },
  'XS-nver-1500': { title: '女儿红', volume: '1500', unit: '坛' },
}

export function productDetail(product, photos = [], editorial = null) {
  if (!product) return null
  return { ...productSpecificDetail(product, photos, editorial), story: editorial?.featurePosters?.length ? null : companyStory, purchaseNotices }
}

function productSpecificDetail(product, photos, editorial) {
  if (editorial?.spec === product.spec) return editableDetail(product, photos, editorial)
  const profile = riceProducts[product?.id]
  if (!profile) return editableDetail(product, photos)
  // A future catalog spec change must not retain mismatched editorial content.
  const spec = String(product.spec || '').replace(/\s/g, '')
  if (spec !== `52度${profile.volume}mL/${profile.unit}`) return editableDetail(product, photos)
  const { title, volume, unit } = profile
  const size = `${volume}mL${unit}装`
  const mixedNote = `图中为同系列不同规格展示；本商品每件为${volume}mL × 1${unit}，不含其他规格及拍摄道具。`
  const images = [...new Set(photos)].map((src, index) => {
    const file = src.split('?')[0].split('/').pop()
    let heading = `${size} · 商品实拍`
    let caption = `红色${unit}身搭配金色题字，${title}外观与比例见实拍。每件含1${unit}。`
    if (/9612|9658/.test(file)) {
      heading = '系列包装 · 瓶盒同框'
      caption = mixedNote
    } else if (/9632|9689/.test(file)) {
      heading = '酒体实拍 · 近距离看细节'
      caption = `倒酒场景与杯中酒体展示。${mixedNote}`
    } else if (/9629|9682/.test(file)) {
      heading = `${volume === '500' ? '500mL瓶装' : '系列外观'} · 细节展示`
      caption = `前景为500mL瓶装，背景为1500mL坛装。${mixedNote}`
    } else if (index > 0) {
      heading = '商品实拍 · 更多角度'
      caption = mixedNote
    }
    return { src, heading, caption }
  })
  return {
    title, volume, unit, size,
    facts: [
      { value: '52', unit: '%vol', label: '酒精度' },
      { value: volume, unit: 'mL', label: '净含量' },
      { value: '1', unit, label: '每件数量' },
    ],
    intro: `${title}，红色瓶坛与金色题字的经典搭配。本页为${size}，单件1${unit}；从外观、包装到酒体，向下查看完整实拍。`,
    parameters: [
      ['商品名称', product.name], ['品牌', '雄森'], ['产品类别', product.category],
      ['酒精度', '52%vol'], ['净含量', `${volume}mL / ${unit}`],
      ['每件数量', `1${unit}`], ['生产企业', '广西雄森酒业有限公司'],
    ],
    images,
    selection: `本页所选为${size}，每件1${unit}。系列实拍含500mL与1500mL两种规格，图片中的多瓶陈列不代表组合销售。`,
  }
}

function editableDetail(product, photos, editorial = {}) {
  const rows = Array.isArray(editorial.parameters) ? editorial.parameters : []
  const facts = Array.isArray(editorial.facts) ? editorial.facts : []
  const sections = Array.isArray(editorial.images) ? editorial.images : []
  return {
    title: product.name,
    size: product.spec,
    intro: product.description || '',
    highlights: Array.isArray(editorial.highlights) ? editorial.highlights.filter(item => item && typeof item.title === 'string' && typeof item.text === 'string') : [],
    facts: facts.filter(fact => fact && typeof fact.value === 'string' && typeof fact.label === 'string').slice(0, 3),
    parameters: [
      ['商品名称', product.name],
      ['产品规格', product.spec],
      ['商品分类', product.category],
      ...rows.filter(row => Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string')),
    ],
    images: [...new Set(photos)].map(src => {
      const file = src.split('?')[0].split('/').pop()
      const section = sections.find(item => item && item.file === file)
      return {
        src,
        heading: typeof section?.heading === 'string' ? section.heading : '商品实拍',
        caption: typeof section?.caption === 'string' ? section.caption : '',
      }
    }),
    selection: typeof editorial.selection === 'string' ? editorial.selection : `本商品所选规格为${product.spec}。`,
    ending: `${product.name} · ${product.spec}`,
    featurePosters: Array.isArray(editorial.featurePosters)
      ? editorial.featurePosters.filter(value => typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value))).slice(0, 6)
      : [],
  }
}
