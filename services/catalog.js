import { reactive } from 'vue'
import { config, isApiMode, mediaUrl } from './config.js'
import { get } from './api.js'

const demoProducts = [
  {
    id: 'classic',
    name: '典藏酱香',
    category: '酱香',
    spec: '53度 500mL',
    description: '53度酱香型　500mL',
    series: '金色典藏系列',
    price: 39800,
    originalPrice: 49800,
    image: '/static/design/product-classic.jpg',
    sales: 1286,
    stock: 99,
  },
  {
    id: 'mellow',
    name: '经典浓香',
    category: '浓香',
    spec: '52度 500mL',
    description: '52度浓香型　500mL',
    series: '金色经典系列',
    price: 26800,
    originalPrice: 32800,
    image: '/static/design/product-mellow.jpg',
    sales: 965,
    stock: 86,
  },
  {
    id: 'double',
    name: '双瓶礼盒',
    category: '礼盒',
    spec: '53度 500mL × 2',
    description: '53度酱香型　双瓶礼盒',
    series: '金色礼赠系列',
    price: 59800,
    originalPrice: 69800,
    image: '/static/design/product-double.jpg',
    sales: 658,
    stock: 50,
  },
  {
    id: 'gift',
    name: '珍藏礼盒',
    category: '礼盒',
    spec: '53度 500mL',
    description: '53度酱香型　珍藏礼盒',
    series: '金色珍藏系列',
    price: 89800,
    originalPrice: 99800,
    image: '/static/design/product-gift.jpg',
    sales: 328,
    stock: 30,
  },
]
const demoCouponTemplates = [
  {
    id: 'group95',
    name: '社群专享券',
    kind: 'percent',
    rate: 95,
    minQuantity: 2,
    minimum: 0,
    label: '9.5',
    unit: '折',
    description: '购买2件及以上可用',
    channel: '社群专享',
    memberOnly: true,
  },
  {
    id: 'full15',
    name: '满减优惠券',
    kind: 'fixed',
    amount: 1500,
    minimum: 20000,
    minQuantity: 1,
    label: '15',
    unit: '元',
    description: '满200元减15元',
    channel: '活动领取',
  },
  {
    id: 'festival90',
    name: '中秋全场券',
    kind: 'percent',
    rate: 90,
    minimum: 0,
    minQuantity: 1,
    label: '9',
    unit: '折',
    description: '全场商品可用',
    channel: '节日活动',
  },
  {
    id: 'voucher20',
    name: '20元代金券',
    kind: 'fixed',
    amount: 2000,
    minimum: 0,
    minQuantity: 1,
    label: '20',
    unit: '元',
    description: '购物抵扣，不可提现',
    channel: '积分兑换',
    pointsOnly: true,
  },
]
const demoExchangeProducts = [
  {
    id: 'voucher20',
    name: '20元代金券',
    points: 200,
    kind: 'coupon',
    image: '/static/design/voucher.jpg',
    templateId: 'voucher20',
    stock: 99,
  },
  {
    id: 'cup',
    name: '品鉴杯',
    points: 300,
    kind: 'goods',
    image: '/static/design/cup.jpg',
    spec: '精美陶瓷品鉴杯',
    stock: 30,
  },
  {
    id: 'cups',
    name: '双杯礼盒',
    points: 800,
    kind: 'goods',
    image: '/static/design/cups.jpg',
    spec: '金色酒业定制 · 双杯装',
    stock: 20,
  },
]
const demoStores = [
  {
    id: 'guigang',
    name: '金色酒业体验店',
    city: '贵港',
    district: '港北区',
    address: '贵港市港北区 示例门店地址',
    distance: 1.2,
    hours: '09:00 - 21:00',
    image: '/static/design/product-classic.jpg',
    phone: '',
    latitude: null,
    longitude: null,
    serviceQr: '',
    groupQr: '',
  },
  {
    id: 'partner',
    name: '金色酒业合作门店',
    city: '贵港',
    district: '港南区',
    address: '贵港市港南区 示例门店地址',
    distance: 3.6,
    hours: '09:00 - 21:00',
    image: '/static/design/product-classic.jpg',
    phone: '',
    latitude: null,
    longitude: null,
    serviceQr: '',
    groupQr: '',
  },
]
const demoRanks = [
  { name: '李先生', amount: 328000, initial: '李' },
  { name: '陈女士', amount: 256000, initial: '陈' },
  { name: '王先生', amount: 192000, initial: '王' },
  { name: '赵先生', amount: 168000, initial: '赵' },
  { name: '周女士', amount: 145000, initial: '周' },
]
const initial = (items) => isApiMode() ? [] : items
export const products = reactive(initial(demoProducts))
export const couponTemplates = reactive(initial(demoCouponTemplates))
export const exchangeProducts = reactive(initial(demoExchangeProducts))
export const stores = reactive(initial(demoStores))
export const ranks = reactive(initial(demoRanks))
// 首页轮播由内容中心维护，保留响应式引用以便已打开页面即时刷新。
export const homeHeroSlides = reactive([])

export const getProduct = (id) => products.find((product) => product.id === id)
export const getCouponTemplate = (id) => couponTemplates.find((coupon) => coupon.id === id)

const replace = (target, items) => target.splice(0, target.length, ...items)
const normalizeMedia = (item) => ({
  ...item,
  image: mediaUrl(item.image),
  serviceQr: mediaUrl(item.serviceQr),
  groupQr: mediaUrl(item.groupQr),
})
const couponDisplay = (coupon) => ({
  ...coupon,
  label: coupon.kind === 'percent' ? String(coupon.rate / 10) : String(coupon.amount / 100),
  unit: coupon.kind === 'percent' ? '折' : '元',
  description: coupon.description || (coupon.minQuantity > 1
    ? `购买${coupon.minQuantity}件及以上可用`
    : coupon.minimum > 0
      ? `满${coupon.minimum / 100}元可用`
      : '全场商品可用'),
})

const normalizeBrand = (brand = {}, content = {}) => {
  const image = (key) => content[key]?.imageUrl || ''
  const json = (value, fallback) => {
    if (value && typeof value === 'object') return value
    try { return value ? JSON.parse(value) : fallback } catch { return fallback }
  }
  return {
    ...brand,
    // 兼容运营配置的历史键名，并优先使用内容中心的公开图片地址。
    homeCouponTitle: brand.homeCouponTitle || brand.homeCampaignTitle || '',
    homeCouponSubtitle: brand.homeCouponSubtitle || brand.homeCampaignSubtitle || '',
    videoBannerTitle: brand.videoBannerTitle || brand.homeVideoTitle || '',
    videoBannerImage: brand.videoBannerImage || brand.homeVideoImage || image('home.detail'),
    campaignTitle: brand.campaignTitle || brand.homeCampaignTitle || '',
    campaignSubtitle: brand.campaignSubtitle || brand.homeCampaignSubtitle || '',
    campaignImage: brand.campaignImage || brand.homeCampaignImage || image('home.hero'),
    groupOfferImage: brand.groupOfferImage || brand.homeCampaignImage || image('home.hero'),
    storeHeroImage: brand.storeHeroImage || image('brand.store'),
    mapImage: brand.mapImage || image('brand.map'),
    avatarImage: brand.avatarImage || image('brand.avatar'),
    pointsImage: brand.pointsImage || image('home.detail'),
    rankingImage: brand.rankingImage || image('home.detail'),
    scanImage: brand.scanImage || image('home.detail'),
    homeNavigation: json(brand.homeNavigation || brand.homeQuickLinksJson || content['home.navigation']?.content, []),
    rules: json(brand.rules || brand.rulesJson, {}),
    ranking: json(brand.ranking || brand.rankingJson, []),
    pageContent: json(brand.pageContent || brand.pageContentJson, {}),
  }
}

// 目录数组保持同一个引用，已打开的页面会随服务端数据刷新。
let catalogTask
export async function loadCatalog() {
  if (!isApiMode()) return
  if (catalogTask) return catalogTask
  catalogTask = Promise.all([
    get('/mini/products'), get('/mini/stores'), get('/mini/coupons/templates'),
    get('/mini/exchanges'), get('/mini/brand'), get('/mini/content'),
  ]).then(([productData, storeData, couponData, exchangeData, brandData, contentData]) => {
    const contentItems = (contentData || []).map((item) => ({ ...item }))
    const content = contentItems.reduce((map, item) => {
      map[item.key] = item
      return map
    }, {})
    const brand = normalizeBrand(brandData || {}, content)
    replace(products, (productData || []).map(normalizeMedia))
    replace(stores, (storeData || []).map((item) => normalizeMedia({ ...item, distance: item.distance ?? '—' })))
    replace(couponTemplates, (couponData || []).map(couponDisplay))
    replace(exchangeProducts, (exchangeData || []).map(normalizeMedia))
    for (const item of contentItems) {
      item.imageUrl = mediaUrl(item.imageUrl)
    }
    // 兼容单条 home.hero 和可扩展的 home.hero.1/home.hero.2 配置。
    const slides = contentItems
      .filter((item) => item.type === 'banner' && (item.key === 'home.hero' || item.key.startsWith('home.hero.')))
      .sort((left, right) => Number(left.sort || 0) - Number(right.sort || 0) || Number(left.id || 0) - Number(right.id || 0))
      .filter((item) => item.imageUrl)
    replace(homeHeroSlides, slides)
    for (const key of ['homeHeroImage', 'homeCampaignImage', 'homeVideoImage', 'videoBannerImage',
      'campaignImage', 'groupOfferImage', 'storeHeroImage', 'mapImage', 'avatarImage',
      'pointsImage', 'rankingImage', 'scanImage']) {
      brand[key] = mediaUrl(brand[key])
    }
    brand.officialAccountQr = mediaUrl(brand.officialAccountQr)
    brand.groupQr = mediaUrl(brand.groupQr)
    Object.assign(config, {
      brand,
      content,
      finderUserName: brand.finderUserName || '',
      officialAccountQr: brand.officialAccountQr || '',
      groupQr: brand.groupQr || '',
    })
  }).finally(() => { catalogTask = null })
  return catalogTask
}
