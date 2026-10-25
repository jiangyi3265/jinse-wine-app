import { reactive } from 'vue'
import { exchangeProducts, getProduct, getCouponTemplate, loadExchangeCatalog } from './catalog.js'
import { quoteOrder } from './pricing.js'
import { config, mediaUrl } from './config.js'
import { get, post, patch, request, upload } from './api.js'
import { offerProfileCompletion } from './profile-completion.js'

const KEY = 'jinse-frontend-v3-state-1'
const REQUEST_KEY = 'jinse-mini-request-ids-v1'
const now = () => Date.now()
const uid = (prefix) => `${prefix}-${now()}-${Math.random().toString(36).slice(2, 7)}`
const dayKey = (value = Date.now()) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const newRequestId = (prefix = 'request') => uid(prefix)
function requestStore() {
  try {
    const value = uni.getStorageSync(REQUEST_KEY)
    return value && typeof value === 'object' ? value : {}
  } catch { return {} }
}
function operationRequestId(scope, subject = '') {
  const key = `${scope}:${subject}`
  const values = requestStore()
  if (!values[key]) {
    values[key] = uid(scope)
    try { uni.setStorageSync(REQUEST_KEY, values) } catch { /* storage is best effort */ }
  }
  return values[key]
}
function clearOperationRequestId(scope, subject = '') {
  const values = requestStore()
  const key = `${scope}:${subject}`
  if (!values[key]) return
  delete values[key]
  try { uni.setStorageSync(REQUEST_KEY, values) } catch { /* storage is best effort */ }
}
function paymentAwaiting(id) {
  return !!requestStore()[`pay-awaiting:${id}`]
}
function markPaymentAwaiting(id) {
  const values = requestStore()
  values[`pay-awaiting:${id}`] = Date.now()
  try { uni.setStorageSync(REQUEST_KEY, values) } catch { /* storage is best effort */ }
  const order = state.orders.find(item => item.id === id)
  if (order) order.paymentAwaiting = true
}
function clearPaymentAwaiting(id) {
  const values = requestStore()
  delete values[`pay-awaiting:${id}`]
  try { uni.setStorageSync(REQUEST_KEY, values) } catch { /* storage is best effort */ }
  clearOperationRequestId('pay', id)
}
const makeCoupon = (id) => ({
  ...getCouponTemplate(id),
  id: uid('coupon'),
  templateId: id,
  status: 'unused',
  expiresAt: now() + 30 * 86400000,
})
function initialState() {
  const coupons = ['full15', 'voucher20', 'festival90'].map(makeCoupon)
  return {
    version: 1,
    user: {
      name: '张先生',
      phone: '13800002688',
      vip: true,
      role: 'staff',
      groupMember: true,
    },
    points: 1280,
    coupons,
    claimedTemplates: ['full15', 'festival90'],
    exchangeStock: Object.fromEntries(exchangeProducts.map((item) => [item.id, item.stock])),
    cart: [],
    addresses: [
      {
        id: 'address-1',
        name: '张先生',
        phone: '13800002688',
        region: '广西壮族自治区 贵港市 港北区',
        detail: '金港大道 888 号 2 栋 101 室',
        isDefault: true,
      },
    ],
    orders: [
      {
        id: 'JS202609110628',
        productId: 'classic',
        quantity: 1,
        subtotal: 39800,
        discount: 0,
        shipping: 0,
        total: 39800,
        status: 'pending',
        createdAt: now(),
        address: {
          name: '张先生',
          phone: '13800002688',
          region: '广西贵港市',
          detail: '金港大道 888 号 2 栋 101 室',
        },
      },
      {
        id: 'JS202609100626',
        productId: 'double',
        quantity: 1,
        subtotal: 59800,
        discount: 0,
        shipping: 0,
        total: 59800,
        status: 'shipping',
        createdAt: now() - 86400000,
      },
      {
        id: 'JS202609080618',
        productId: 'mellow',
        quantity: 1,
        subtotal: 26800,
        discount: 0,
        shipping: 0,
        total: 26800,
        status: 'complete',
        createdAt: now() - 3 * 86400000,
      },
    ],
    awards: [
      {
        id: 'prize-0628',
        name: '典藏酱香',
        spec: '500mL 单瓶',
        image: '/static/design/product-classic.jpg',
        kind: 'goods',
        status: 'pending',
        code: 'JS-DEMO-0628',
        createdAt: now(),
      },
      {
        id: 'prize-cup',
        name: '品鉴杯',
        spec: '精美陶瓷品鉴杯',
        image: '/static/design/cup.jpg',
        kind: 'goods',
        status: 'pending',
        code: 'JS-DEMO-0629',
        createdAt: now(),
      },
    ],
    redPackets: [
      {
        id: 'redpack-1',
        amount: 888,
        status: 'pending',
        createdAt: now(),
      },
    ],
    pointRecords: [
      {
        id: 'points-1',
        title: '活动积分奖励',
        change: 1280,
        createdAt: now(),
      },
    ],
    drawRecords: [
      {
        id: 'draw-1',
        title: '现金红包',
        value: '¥8.88',
        kind: 'cash',
        rewardId: 'redpack-1',
        createdAt: now(),
      },
    ],
    verificationRecords: [],
    checkout: {
      productId: 'classic',
      skuCode: '',
      quantity: 1,
      couponId: coupons[0].id,
      addressId: 'address-1',
      requestId: uid('checkout'),
      cartRequestId: '',
      cartRequestSignature: '',
    },
  }
}
let saved
try {
  saved = uni.getStorageSync(KEY)
} catch {
  saved = null
}
function apiState() {
  return {
    version: 1,
    user: { name: '微信用户', phone: '', vip: false, role: 'customer', groupMember: false },
    points: 0,
    coupons: [], claimedTemplates: [], exchangeStock: {}, addresses: [], orders: [],
    awards: [], awardTotal: null, redPackets: [], pointRecords: [], drawRecords: [], verificationRecords: [], cart: [],
    promotion: { total: 0, pending: 0, settled: 0, teamCount: 0, records: [] },
    team: [], ranking: [], rankingMe: {},
    checkout: { productId: '', skuCode: '', quantity: 1, couponId: null, addressId: null, fulfillmentMode: 'delivery', pickupStoreId: null, requestId: '', cartRequestId: '', cartRequestSignature: '' },
  }
}
export const state = reactive(config.mode === 'api' ? apiState() : saved?.version === 1 ? saved : initialState())
let profileRevision = 0
export function persist() {
  if (config.mode !== 'demo') return
  uni.setStorageSync(KEY, JSON.parse(JSON.stringify(state)))
}
export function assertDemo() {
  if (config.mode !== 'demo') throw new Error('请先配置并接入业务服务')
}
export function couponClaimLimitReached(templateId) {
  const configured = Number(getCouponTemplate(templateId)?.claimLimit)
  const limit = Number.isSafeInteger(configured) && configured > 0 ? configured : 1
  return state.coupons.filter(coupon => coupon.templateId === templateId).length >= limit
}
const memberListPaths = {
  orders: '/mini/orders', awards: '/mini/rewards', redPackets: '/mini/rewards/cash',
  pointRecords: '/mini/points/records', drawRecords: '/mini/draws',
  verificationRecords: '/mini/staff/redemptions', pickupRecords: '/mini/staff/orders',
  commissionRecords: '/mini/promotion/records',
}

export async function loadMemberPage(domain, params = {}) {
  const path = memberListPaths[domain]
  if (!path) throw new Error('请选择有效的记录类型')
  const query = { pageNum: 1, pageSize: 20, ...params }
  const page = await request(path, { auth: true, data: query })
  if (!Array.isArray(page?.rows) || !Number.isSafeInteger(page.total) || page.total < 0
    || !Number.isSafeInteger(page.pageNum) || page.pageNum < 1
    || !Number.isSafeInteger(page.pageSize) || page.pageSize < 1 || page.pageSize > 100
    || page.rows.length > page.pageSize || page.rows.length > page.total
    || page.pageNum !== query.pageNum || page.pageSize !== query.pageSize) throw new Error('记录数据不完整，请重新加载')
  return { ...page, rows: page.rows.map(item => domain === 'orders' ? normalizeOrder(item)
    : domain === 'awards' ? { ...item, image: mediaUrl(item.image) } : item) }
}

export async function refreshDomain(domain, pageOptions) {
  if (config.mode !== 'api') return
  const endpoints = {
    user: '/mini/me', addresses: '/mini/addresses', orders: '/mini/orders',
    coupons: '/mini/coupons', points: '/mini/points', pointRecords: '/mini/points/records',
    awards: '/mini/rewards', promotion: '/mini/promotion', team: '/mini/promotion/team',
    ranking: '/mini/promotion/ranking', verificationRecords: '/mini/staff/redemptions',
    drawRecords: '/mini/draws', redPackets: '/mini/rewards/cash',
  }
  const path = endpoints[domain]
  if (!path) throw new Error(`未知业务数据：${domain}`)
  const revision = profileRevision
  const page = pageOptions ? await loadMemberPage(domain, pageOptions) : null
  const data = page ? page.rows : await get(path, true)
  if (domain === 'user') {
    if (revision !== profileRevision) return
    Object.assign(state.user, data || {})
    offerProfileCompletion(data)
  }
  else if (domain === 'points') state.points = Number(typeof data === 'number' ? data : data?.balance || 0)
  else if (domain === 'promotion') {
    const promotion = data || apiState().promotion
    state.promotion = {
      ...promotion,
      records: (promotion.records || []).map((item) => ({
        ...item,
        name: item.name || item.title || '推广订单',
        image: mediaUrl(item.image),
        spec: item.spec || '',
        amount: Number(item.amount || item.amountCent || 0),
      })),
    }
  }
  else if (domain === 'coupons') {
    state.coupons = (data || []).map(normalizeCoupon)
    state.claimedTemplates = [...new Set(state.coupons.map((item) => item.templateId))]
  } else if (domain === 'orders') state.orders = (data || []).map(normalizeOrder)
  else if (domain === 'awards') {
    state.awards = (data || []).map((item) => ({ ...item, image: mediaUrl(item.image) }))
    state.awardTotal = page ? page.total : state.awards.length
  }
  else if (domain === 'team') {
    const rows = Array.isArray(data) ? data : data?.items || []
    state.team = rows.map((item) => ({
      ...item,
      avatar: mediaUrl(item.avatar),
    }))
  }
  else if (domain === 'ranking') {
    state.ranking = Array.isArray(data) ? data : data?.items || []
    state.rankingMe = data?.me || {}
  }
  else state[domain] = data || []
}

const asTime = (value) => value == null ? null : typeof value === 'number' ? value : new Date(value).getTime()
function normalizeCoupon(item) {
  const templateId = item.templateId || item.templateCode || item.couponTemplateCode
  const template = getCouponTemplate(templateId) || {}
  return {
    ...template, ...item, templateId,
    id: String(item.id || item.couponId || item.couponCode),
    startsAt: asTime(item.startsAt || item.startTime) || 0,
    expiresAt: asTime(item.expiresAt || item.endTime) || Number.MAX_SAFE_INTEGER,
  }
}
function normalizeOrder(item) {
  const id = String(item.id || item.orderId)
  if (item.status !== 'pending' && paymentAwaiting(id)) clearPaymentAwaiting(id)
  const items = Array.isArray(item.items)
    ? item.items.map((line) => ({
      ...line,
      productId: line.productId || line.productCode,
      image: mediaUrl(line.image),
      price: Number(line.price || line.unitPrice || 0),
      quantity: Number(line.quantity || 0),
      subtotal: Number(line.subtotal || line.total || 0),
    }))
    : []
  return {
    ...item,
    id,
    paymentAwaiting: item.status === 'pending' && paymentAwaiting(id),
    productId: item.productId || item.productCode,
    items,
    createdAt: asTime(item.createdAt),
  }
}

export async function refreshOrder(id) {
  if (config.mode !== 'api') return state.orders.find((item) => item.id === id)
  const order = normalizeOrder(await get(`/mini/orders/${encodeURIComponent(id)}`, true))
  state.orders = [order, ...state.orders.filter((item) => item.id !== order.id)]
  return order
}

export async function syncPaymentOrder(id) {
  if (config.mode !== 'api') throw new Error('当前为演示模式')
  const order = normalizeOrder(await post(`/mini/orders/${encodeURIComponent(id)}/pay-sync`, {}, true))
  state.orders = [order, ...state.orders.filter((item) => item.id !== order.id)]
  return order
}

export function updateProfile(name, phone) {
  const normalizedName = String(name || '').trim()
  const normalizedPhone = phone == null ? undefined : String(phone).trim()
  if (!normalizedName) return Promise.reject(new Error('请输入昵称'))
  if (normalizedPhone && !/^1[3-9]\d{9}$/.test(normalizedPhone)) return Promise.reject(new Error('请输入正确的11位手机号码'))
  if (config.mode !== 'api') {
    assertDemo()
    state.user.name = normalizedName
    if (normalizedPhone !== undefined) state.user.phone = normalizedPhone
    persist()
    return Promise.resolve(state.user)
  }
  return patch('/mini/me', { name: normalizedName, ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}) }).then((user) => {
    profileRevision++
    Object.assign(state.user, user || {})
    return state.user
  })
}

export function quoteCheckout() {
  if (config.mode !== 'api') return null
  const { productId, skuCode, quantity, couponId, addressId, fulfillmentMode, pickupStoreId } = state.checkout
  if (!productId || (fulfillmentMode === 'pickup' ? !pickupStoreId : !addressId)) return Promise.reject(new Error(fulfillmentMode === 'pickup' ? '请选择自提门店' : '请先选择商品和收货地址'))
  return post('/mini/orders/quote', {
    productId, skuCode: skuCode || '', quantity, couponId, addressId, fulfillmentMode, pickupStoreId, requestId: state.checkout.requestId,
  })
}

export async function loadDrawPrizes() {
  if (config.mode !== 'api') return []
  const data = await get('/mini/draws/prizes', true)
  return (data || []).map((activity) => ({
    ...activity,
    prizes: (activity.prizes || []).map((prize) => ({ ...prize, image: mediaUrl(prize.image) })),
  }))
}

export function updateAvatar(filePath) {
  if (config.mode !== 'api') {
    assertDemo()
    state.user.avatar = filePath
    persist()
    return Promise.resolve(state.user)
  }
  return upload('/mini/me/avatar', filePath).then((user) => {
    profileRevision++
    state.user.avatar = user?.avatar || ''
    persist()
    return state.user
  })
}

export async function loadPickupCode(id) {
  if (config.mode !== 'api') throw new Error('当前为演示模式')
  return mediaUrl(await get(`/mini/orders/${encodeURIComponent(id)}/pickup-code`, true))
}

export const lookupPickupOrder = (orderNo) => post('/mini/staff/orders/lookup', { orderNo }, true)
export const loadPickupRedemptions = async () => (await loadMemberPage('pickupRecords', { pageNum: 1, pageSize: 5 })).rows
export function confirmPickupOrder(orderNo, requestId = uid('pickup')) {
  return post('/mini/staff/orders/confirm', { orderNo }, true, requestId)
}

export async function payOrder(id) {
  if (config.mode !== 'api') throw new Error('当前为演示模式')
  if (paymentAwaiting(id)) return refreshOrder(id)
  const requestId = operationRequestId('pay', id)
  const params = await post(`/mini/orders/${encodeURIComponent(id)}/pay`, { requestId }, true, requestId)
  if (!params?.timeStamp || !params?.nonceStr || !params?.package || !params?.paySign)
    throw new Error('微信支付参数尚未配置')
  try {
    await uni.requestPayment(params)
  } catch (error) {
    const cancelled = String(error?.errMsg || '').includes('cancel')
    let order
    try { order = await refreshOrder(id) }
    catch {
      markPaymentAwaiting(id)
      throw new Error('支付结果暂未核实，请稍后查询订单状态')
    }
    if (order.status !== 'pending') return order
    if (cancelled) { clearPaymentAwaiting(id); return { ...order, paymentCancelled: true } }
    markPaymentAwaiting(id)
    throw new Error('支付结果暂未核实，请稍后查询订单状态')
  }
  // 微信界面返回成功不等于服务端支付回调已确认。
  markPaymentAwaiting(id)
  try { return await refreshOrder(id) }
  catch { throw new Error('支付结果暂未核实，请稍后查询订单状态') }
}

export async function refreshRedPacket(id) {
  if (config.mode !== 'api') return state.redPackets.find((item) => item.id === id)
  const packet = await get(`/mini/rewards/cash/${encodeURIComponent(id)}`, true)
  state.redPackets = [packet, ...state.redPackets.filter((item) => item.id !== packet.id)]
  return packet
}

export const loadRewardCodeQr = async (id) => {
  if (config.mode !== 'api') return ''
  const result = await get(`/mini/rewards/${encodeURIComponent(id)}/redeem-code`, true)
  return mediaUrl(result?.qrCode || '')
}

export async function drawCode(code) {
  if (config.mode !== 'api') throw new Error('当前为演示模式')
  const requestId = operationRequestId('draw', code)
  const result = await post('/mini/draws', { code }, true, requestId)
  clearOperationRequestId('draw', code)
  if (result) {
    const record = {
      ...result,
      id: `draw-${requestId}`,
      title: result.title || result.name || '谢谢参与',
      value: result.value || (result.kind === 'cash' ? `¥${(Number(result.amount) / 100).toFixed(2)}` : result.name),
      rewardId: ['cash', 'goods', 'ticket'].includes(result.kind) ? result.id : undefined,
      couponId: result.kind === 'coupon' ? result.id : undefined,
    }
    state.drawRecords = [record, ...state.drawRecords.filter(value => String(value.id) !== record.id)]
    const balance = Number(result.pointBalance)
    if (result.pointBalance != null && Number.isSafeInteger(balance)) state.points = balance
    if (['goods', 'ticket'].includes(result.kind)) state.awards = [{ ...result, image: mediaUrl(result.image) }, ...state.awards.filter(value => String(value.id) !== String(result.id))]
    if (result.kind === 'coupon' && result.templateId) {
      const coupon = normalizeCoupon(result)
      state.coupons = [coupon, ...state.coupons.filter(value => String(value.id) !== coupon.id)]
      state.claimedTemplates = [...new Set([...state.claimedTemplates, coupon.templateId])]
    }
  }
  void Promise.allSettled([refreshDomain('awards', { pageNum: 1, pageSize: 20 }), refreshDomain('points'), refreshDomain('coupons'),
    result?.kind === 'cash' ? refreshRedPacket(result.id) : Promise.resolve()])
  return result
}

export const lookupAward = (code) =>
  post('/mini/staff/redemptions/lookup', { code }, true)

export const createPromotionCode = productCode => post('/mini/promotion/code', productCode == null ? {} : { productCode }, true, uid('promotion-code'))

export function claimCoupon(templateId) {
  if (config.mode === 'api') {
    const requestId = operationRequestId('claim', templateId)
    return post(`/mini/coupons/${encodeURIComponent(templateId)}/claim`, { requestId }, true, requestId)
      .then(result => {
        clearOperationRequestId('claim', templateId)
        if (result?.id != null) {
          const coupon = normalizeCoupon(result)
          state.coupons = [coupon, ...state.coupons.filter(value => String(value.id) !== coupon.id)]
          state.claimedTemplates = [...new Set([...state.claimedTemplates, coupon.templateId || templateId])]
        }
        void Promise.allSettled([refreshDomain('coupons')])
        return result
      })
  }
  assertDemo()
  const template = getCouponTemplate(templateId)
  if (!template || template.pointsOnly) throw new Error('请通过积分兑换领取')
  if (template.memberOnly && !state.user.groupMember) throw new Error('此券仅限社群会员领取')
  if (couponClaimLimitReached(templateId)) throw new Error('已达到每人领取上限')
  state.coupons.push(makeCoupon(templateId))
  state.claimedTemplates.push(templateId)
  persist()
}
export function exchangeReward(id) {
  if (config.mode === 'api') {
    const item = exchangeProducts.find((value) => value.id === id)
    if (!item) throw new Error('该奖品不存在')
    const requestId = operationRequestId('exchange', id)
    return post(`/mini/exchanges/${encodeURIComponent(id)}/redeem`, {}, true, requestId)
      .then(result => {
        clearOperationRequestId('exchange', id)
        const balance = Number(result?.pointBalance)
        if (result?.pointBalance != null && Number.isSafeInteger(balance)) state.points = balance
        if (Number(item.stock) > 0) item.stock = Number(item.stock) - 1
        if (result?.id != null) {
          const entitlement = item.kind === 'coupon' ? normalizeCoupon(result) : { ...result, image: mediaUrl(result.image) }
          const key = item.kind === 'coupon' ? 'coupons' : 'awards'
          state[key] = [entitlement, ...state[key].filter(value => String(value.id) !== String(entitlement.id))]
        }
        // The server mutation is authoritative; follow-up reads may fail independently.
        void Promise.allSettled([refreshDomain('points'), refreshDomain('pointRecords', { pageNum: 1, pageSize: 20 }),
          refreshDomain(item.kind === 'coupon' ? 'coupons' : 'awards', item.kind === 'coupon' ? undefined : { pageNum: 1, pageSize: 20 }), loadExchangeCatalog()])
        return item.kind
      })
  }
  assertDemo()
  const item = exchangeProducts.find((reward) => reward.id === id)
  const stock = Number(state.exchangeStock[id])
  if (!item || !(stock === -1 || stock > 0)) throw new Error('该奖品已兑完')
  if (state.points < item.points) throw new Error('积分不足，暂时无法兑换')
  state.points -= item.points
  if (state.exchangeStock[id] > 0) state.exchangeStock[id] -= 1
  state.pointRecords.unshift({
    id: uid('points'),
    title: `兑换${item.name}`,
    change: -item.points,
    createdAt: now(),
  })
  if (item.kind === 'coupon') state.coupons.push(makeCoupon(item.templateId))
  else
    state.awards.unshift({
      ...item,
      id: uid('prize'),
      status: 'pending',
      code: uid('JS-DEMO'),
      createdAt: now(),
    })
  persist()
  return item.kind
}
export function prepareCheckout(productId, quantity = 1, skuCode = '') {
  const product = getProduct(productId)
  if (!product) throw new Error('商品不存在')
  state.checkout = {
    productId,
    skuCode,
    quantity,
    couponId: config.mode === 'demo'
      ? state.coupons.find((c) => c.templateId === 'full15' && c.status === 'unused')?.id || null
      : null,
    addressId: state.addresses.find((address) => address.isDefault)?.id || state.addresses[0]?.id,
    fulfillmentMode: 'delivery',
    pickupStoreId: null,
    requestId: uid('checkout'),
    cartRequestId: '',
    cartRequestSignature: '',
  }
  persist()
}
export function submitOrder() {
  if (config.mode === 'api') {
    const draft = state.checkout
    if (!draft.productId || !draft.requestId) throw new Error('请重新选择商品')
    if (draft.fulfillmentMode === 'pickup' ? !draft.pickupStoreId : !draft.addressId) throw new Error(draft.fulfillmentMode === 'pickup' ? '请选择自提门店' : '请先填写收货地址')
    return post('/mini/orders', {
      productId: draft.productId, quantity: draft.quantity,
      skuCode: draft.skuCode || '',
      couponId: draft.couponId, addressId: draft.addressId, fulfillmentMode: draft.fulfillmentMode || 'delivery', pickupStoreId: draft.pickupStoreId, requestId: draft.requestId,
    }, true, draft.requestId).then((data) => {
      const order = normalizeOrder(data)
      state.orders = [order, ...state.orders.filter((item) => item.id !== order.id)]
      const coupon = state.coupons.find(item => item.id === draft.couponId)
      if (coupon) { coupon.status = 'locked'; coupon.orderId = order.id }
      void Promise.allSettled([refreshDomain('coupons')])
      return order
    })
  }
  assertDemo()
  const draft = state.checkout
  if (!draft.requestId) throw new Error('请重新选择商品')
  const duplicate = state.orders.find((order) => order.requestId === draft.requestId)
  if (duplicate) return duplicate
  const product = getProduct(draft.productId),
    address = state.addresses.find((item) => item.id === draft.addressId)
  if (!product || draft.quantity > product.stock) throw new Error('商品库存不足')
  if (draft.fulfillmentMode !== 'pickup' && !address) throw new Error('请先填写收货地址')
  const coupon = state.coupons.find((item) => item.id === draft.couponId)
  const quote = quoteOrder(
    [
      {
        productId: product.id,
        price: product.price,
        quantity: draft.quantity,
      },
    ],
    coupon,
  )
  if (quote.reason) throw new Error(quote.reason)
  const order = {
    id: uid('JS'),
    ...draft,
    ...quote,
    address: { ...address },
    status: 'pending',
    createdAt: now(),
  }
  state.orders.unshift(order)
  if (coupon) {
    coupon.status = 'locked'
    coupon.orderId = order.id
  }
  persist()
  return order
}
export function setOrderStatus(id, status) {
  if (config.mode === 'api') {
    const action = status === 'cancelled' ? 'cancel' : status === 'complete' ? 'receive' : ''
    if (!action) throw new Error('订单状态由支付回调和服务端更新')
    const requestId = operationRequestId(action, id)
    return post(`/mini/orders/${encodeURIComponent(id)}/${action}`, { requestId }, true, requestId)
      .then((data) => {
        const order = normalizeOrder(data)
        state.orders = [order, ...state.orders.filter(item => item.id !== order.id)]
        const coupon = state.coupons.find(item => item.orderId === order.id)
        if (coupon) {
          coupon.status = action === 'cancel' ? 'unused' : 'used'
          if (action === 'cancel') coupon.orderId = null
        }
        clearOperationRequestId(action, id)
        void Promise.allSettled([refreshOrder(id), refreshDomain('coupons')])
        return order
      })
  }
  assertDemo()
  const order = state.orders.find((item) => item.id === id)
  if (!order) throw new Error('订单不存在')
  const allowed = {
    pending: ['shipping', 'cancelled'],
    receiving: ['complete'],
  }
  if (!allowed[order.status]?.includes(status)) throw new Error('订单状态已变化，请刷新后重试')
  const coupon = state.coupons.find((item) => item.orderId === id)
  if (coupon) coupon.status = status === 'cancelled' ? 'unused' : 'used'
  order.status = status
  persist()
}
export function receiveRedPacket(id) {
  if (config.mode === 'api') {
    const requestId = operationRequestId('cash', id)
    return post(`/mini/rewards/cash/${encodeURIComponent(id)}/claim`, {}, true, requestId)
      .then((result) => { clearOperationRequestId('cash', id); return result })
  }
  assertDemo()
  const packet = state.redPackets.find((item) => item.id === id)
  if (!packet || packet.status !== 'pending') throw new Error('红包状态已更新')
  packet.status = 'received'
  packet.receivedAt = now()
  persist()
}
export function previewDraw(kind) {
  assertDemo()
  const id = uid('reward')
  let record
  if (kind === 'cash') {
    state.redPackets.unshift({
      id,
      amount: 888,
      status: 'pending',
      createdAt: now(),
    })
    record = { title: '现金红包', value: '¥8.88', rewardId: id }
  } else if (kind === 'points') {
    state.points += 50
    state.pointRecords.unshift({
      id,
      title: '扫码活动积分',
      change: 50,
      createdAt: now(),
    })
    record = { title: '积分奖励', value: '50积分' }
  } else if (kind === 'coupon') {
    state.coupons.push(makeCoupon('voucher20'))
    record = { title: '20元代金券', value: '¥20' }
  } else {
    state.awards.unshift({
      id,
      name: '品鉴杯',
      spec: '精美陶瓷品鉴杯',
      kind: 'goods',
      image: '/static/design/cup.jpg',
      status: 'pending',
      code: uid('JS-DEMO'),
      createdAt: now(),
    })
    record = { title: '品鉴杯', value: '实物奖品' }
  }
  state.drawRecords.unshift({ id, kind, ...record, createdAt: now() })
  persist()
  return record
}
export function verifyAward(code, requestId = uid('redeem')) {
  if (config.mode === 'api') {
    return post('/mini/staff/redemptions/confirm', { code }, true, requestId)
      .then((result) => {
        state.awards = state.awards.map(item => item.code === result.code
          ? { ...item, ...result, image: mediaUrl(result.image || item.image) }
          : item)
        void Promise.allSettled([refreshDomain('awards', { pageNum: 1, pageSize: 20 }), refreshDomain('verificationRecords', { pageNum: 1, pageSize: 20 })])
        return result
      })
  }
  assertDemo()
  if (state.user.role !== 'staff') throw new Error('当前账户没有核销权限')
  const award = state.awards.find((item) => item.code === code)
  if (!award) throw new Error('未找到对应奖品，请核对兑换码')
  if (award.status !== 'pending') throw new Error('该奖品已核销，请勿重复操作')
  award.status = 'redeemed'
  award.redeemedAt = now()
  state.verificationRecords.unshift({
    id: uid('verify'),
    name: award.name,
    code,
    createdAt: now(),
  })
  persist()
}
export function saveAddress(address) {
  if (!address.name?.trim()) throw new Error('请填写收货人姓名')
  if (!/^1[3-9]\d{9}$/.test(address.phone || '')) throw new Error('请填写正确的手机号码')
  if (!address.region?.trim() || !address.detail?.trim())
    throw new Error('请补全所在地区和详细地址')
  if (config.mode === 'api') {
    const payload = {
      name: address.name.trim(), phone: address.phone,
      region: address.region.trim(), detail: address.detail.trim(),
      province: address.province || '', city: address.city || '', district: address.district || '',
      isDefault: !!address.isDefault,
    }
    const task = address.id
      ? patch(`/mini/addresses/${encodeURIComponent(address.id)}`, payload)
      : post('/mini/addresses', payload)
    return task.then((saved) => {
      const next = { ...address, ...saved }
      const index = state.addresses.findIndex(item => String(item.id) === String(next.id))
      if (next.isDefault) state.addresses.forEach(item => { item.isDefault = false })
      if (index < 0) state.addresses.push(next)
      else state.addresses[index] = next
      state.checkout.addressId = next.id
      void Promise.allSettled([refreshDomain('addresses')])
      return saved
    })
  }
  const saved = { ...address, id: address.id || uid('address') }
  if (saved.isDefault)
    state.addresses.forEach((item) => {
      item.isDefault = false
    })
  const index = state.addresses.findIndex((item) => item.id === saved.id)
  if (index < 0) state.addresses.push(saved)
  else state.addresses[index] = saved
  state.checkout.addressId = saved.id
  persist()
}

export function quoteCartOrder() {
  const mode = state.checkout.fulfillmentMode || 'delivery'
  const addressId = (state.addresses.find(address => address.id === state.checkout.addressId)
    || state.addresses.find(address => address.isDefault) || state.addresses[0])?.id
  return post('/mini/orders/cart/quote', {
    addressId,
    couponId: state.checkout.couponId || null,
    fulfillmentMode: mode,
    pickupStoreId: state.checkout.pickupStoreId,
  }, true)
}

export function submitCartOrder() {
  const mode = state.checkout.fulfillmentMode || 'delivery'
  const addressId = state.checkout.addressId || state.addresses.find(address => address.isDefault)?.id || state.addresses[0]?.id
  const pickupStoreId = state.checkout.pickupStoreId
  if (mode === 'pickup' ? !pickupStoreId : !addressId) throw new Error(mode === 'pickup' ? '请选择自提门店' : '请先填写收货地址')
  if (config.mode !== 'api') {
    throw new Error('演示模式请从商品详情下单')
  }
  const couponId = state.checkout.couponId || null
  const cartSignature = JSON.stringify({
    items: (state.cart || []).map(item => ({ id: item.id, productId: item.productId, skuCode: item.skuCode || '', quantity: item.quantity })).sort((left, right) => String(left.id).localeCompare(String(right.id))),
    mode, addressId: addressId || null, pickupStoreId: pickupStoreId || null, couponId,
  })
  // 保留同一购物车结算请求号，网络结果未知时重试不会重复创建订单；结算内容变化后自动换新请求号。
  if (state.checkout.cartRequestSignature !== cartSignature || !state.checkout.cartRequestId) {
    state.checkout.cartRequestSignature = cartSignature
    state.checkout.cartRequestId = uid('cart-order')
  }
  const requestId = state.checkout.cartRequestId
  return post('/mini/orders/cart', { addressId, couponId, requestId, fulfillmentMode: mode, pickupStoreId }, true, requestId)
    .then(orderData => {
      const order = normalizeOrder(orderData)
      state.orders = [order, ...state.orders.filter(item => item.id !== order.id)]
      const coupon = state.coupons.find(item => item.id === couponId)
      if (coupon) { coupon.status = 'locked'; coupon.orderId = order.id }
      state.cart = []
      state.checkout.cartRequestId = ''
      state.checkout.cartRequestSignature = ''
      void Promise.allSettled([refreshDomain('coupons'), loadCart()])
      return order
    })
}

export function loadCart() {
  if (config.mode !== 'api') return Promise.resolve(state.cart || [])
  return get('/mini/cart', true).then(items => { state.cart = items || []; return state.cart })
}

export function addCartItem(productId, quantity = 1, skuCode = '') {
  state.checkout.cartRequestId = ''
  state.checkout.cartRequestSignature = ''
  if (config.mode !== 'api') {
    const product = getProduct(productId)
    if (!product || quantity < 1) throw new Error('商品数量无效')
    if (!state.cart) state.cart = []
    const existing = state.cart.find(item => item.productId === productId && item.skuCode === skuCode)
    if (existing) existing.quantity += quantity
    else state.cart.push({ id: uid('cart'), productId, skuCode, name: product.name, spec: product.spec, image: product.image, price: product.price, quantity })
    persist()
    return Promise.resolve(state.cart)
  }
  return post('/mini/cart', { productId, quantity, skuCode }, true, uid('cart'))
}

export function removeCartItem(id) {
  if (config.mode !== 'api') { state.cart = (state.cart || []).filter(item => item.id !== id); persist(); return Promise.resolve(true) }
  return request(`/mini/cart/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }).then(result => { state.checkout.cartRequestId = ''; state.checkout.cartRequestSignature = ''; return result })
}

export function updateCartItem(id, quantity) {
  if (config.mode !== 'api') { const item = (state.cart || []).find(value => value.id === id); if (!item || quantity < 1) throw new Error('购物车商品不存在'); item.quantity = quantity; persist(); return Promise.resolve(state.cart) }
  return request(`/mini/cart/${encodeURIComponent(id)}`, { method: 'PUT', data: { quantity }, auth: true }).then(result => { state.checkout.cartRequestId = ''; state.checkout.cartRequestSignature = ''; return result })
}

export function bindPromotionCode(code) {
  if (config.mode !== 'api') throw new Error('推广关系需要连接服务端')
  return post('/mini/promotion/bind', { code }, true, uid('bind'))
}

export function withdrawCommission(amount) {
  if (config.mode !== 'api') throw new Error('佣金提现需要连接服务端')
  const requestId = operationRequestId('withdraw')
  return post('/mini/promotion/withdraw', { amount }, true, requestId)
    .then((result) => {
      clearOperationRequestId('withdraw')
      if (['pending', 'processing'].includes(result.status)) {
        state.promotion.settled = 0
        state.promotion.records = (state.promotion.records || []).map(record =>
          record.status === 'settled' ? { ...record, status: 'processing' } : record)
      }
      return result
    })
}

export function signInPoints() {
  if (config.mode !== 'api') {
    const today = dayKey()
    if (state.pointRecords.some(record => record.source === 'daily_sign' && dayKey(new Date(record.createdAt)) === today)) throw new Error('今天已经签到')
    state.points += 10; state.pointRecords.unshift({ id: uid('points'), title: '每日签到', change: 10, source: 'daily_sign', createdAt: now() }); persist(); return Promise.resolve({ balance: state.points })
  }
  const day = dayKey()
  const requestId = operationRequestId('signin', day)
  return post('/mini/points/signin', { requestId }, true, requestId).then(result => {
    clearOperationRequestId('signin', day)
    const balance = Number(result?.balance)
    if (result?.balance != null && Number.isSafeInteger(balance)) state.points = balance
    void Promise.allSettled([refreshDomain('points'), refreshDomain('pointRecords', { pageNum: 1, pageSize: 20 })])
    return result
  })
}

export function requestRefund(orderId, amount, reason) {
  if (config.mode !== 'api') throw new Error('退款需要连接服务端')
  const normalizedReason = String(reason || '').trim()
  if (!normalizedReason || normalizedReason.length > 200) throw new Error('请填写退款原因（1-200个字符）')
  const requestId = operationRequestId('refund', orderId)
  return post(`/mini/orders/${encodeURIComponent(orderId)}/refund`, { amount, reason: normalizedReason }, true, requestId)
    .then((result) => {
      clearOperationRequestId('refund', orderId)
      const order = state.orders.find(item => item.id === orderId)
      if (order) {
        const refunds = order.refunds || []
        const previous = refunds.find(item => String(item.id) === String(result.id))
        const refundAmount = Number(result.amount ?? amount)
        const oldRequested = previous?.status !== 'rejected' && previous ? Number(previous.amount || 0) : 0
        const newRequested = result.status !== 'rejected' ? refundAmount : 0
        const oldRefunded = previous?.status === 'refunded' ? Number(previous.amount || 0) : 0
        const newRefunded = result.status === 'refunded' ? refundAmount : 0
        order.refunds = [result, ...refunds.filter(item => String(item.id) !== String(result.id))]
        order.refundSummary = {
          ...order.refundSummary,
          requested: Number(order.refundSummary?.requested || 0) + newRequested - oldRequested,
          refunded: Number(order.refundSummary?.refunded || 0) + newRefunded - oldRefunded,
          processing: order.refunds.some(item => ['pending', 'approved'].includes(item.status)),
          remaining: Math.max(0, Number(order.refundSummary?.remaining ?? order.total ?? 0)
            - newRequested + oldRequested),
        }
      }
      return result
    })
}

export function loadOrderDelivery(orderId) {
  if (config.mode !== 'api') return Promise.resolve(null)
  return get(`/mini/orders/${encodeURIComponent(orderId)}/delivery`, true)
}
