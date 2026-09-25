import { reactive } from 'vue'
import { exchangeProducts, getProduct, getCouponTemplate } from './catalog.js'
import { quoteOrder } from './pricing.js'
import { config } from './config.js'

const KEY = 'jinse-frontend-v3-state-1'
const now = () => Date.now()
const uid = (prefix) => `${prefix}-${now()}-${Math.random().toString(36).slice(2, 7)}`
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
    addresses: [
      {
        id: 'address-1',
        name: '张先生',
        phone: '13800002688',
        region: '广西壮族自治区 贵港市 港北区',
        detail: '示例收货地址',
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
          detail: '示例收货地址',
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
      quantity: 1,
      couponId: coupons[0].id,
      addressId: 'address-1',
      requestId: uid('checkout'),
    },
  }
}
let saved
try {
  saved = uni.getStorageSync(KEY)
} catch {
  saved = null
}
export const state = reactive(saved?.version === 1 ? saved : initialState())
export function persist() {
  uni.setStorageSync(KEY, JSON.parse(JSON.stringify(state)))
}
export function assertDemo() {
  if (config.mode !== 'demo') throw new Error('请先配置并接入业务服务')
}
export function claimCoupon(templateId) {
  assertDemo()
  const template = getCouponTemplate(templateId)
  if (!template || template.pointsOnly) throw new Error('请通过积分兑换领取')
  if (template.memberOnly && !state.user.groupMember) throw new Error('此券仅限社群会员领取')
  if (state.claimedTemplates.includes(templateId)) throw new Error('您已领取过这张优惠券')
  state.coupons.push(makeCoupon(templateId))
  state.claimedTemplates.push(templateId)
  persist()
}
export function exchangeReward(id) {
  assertDemo()
  const item = exchangeProducts.find((reward) => reward.id === id)
  if (!item || !state.exchangeStock[id]) throw new Error('该奖品已兑完')
  if (state.points < item.points) throw new Error('积分不足，暂时无法兑换')
  state.points -= item.points
  state.exchangeStock[id] -= 1
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
export function prepareCheckout(productId, quantity = 1) {
  const product = getProduct(productId)
  if (!product) throw new Error('商品不存在')
  state.checkout = {
    productId,
    quantity,
    couponId:
      state.coupons.find((c) => c.templateId === 'full15' && c.status === 'unused')?.id || null,
    addressId: state.addresses.find((address) => address.isDefault)?.id || state.addresses[0]?.id,
    requestId: uid('checkout'),
  }
  persist()
}
export function submitOrder() {
  assertDemo()
  const draft = state.checkout
  if (!draft.requestId) throw new Error('请重新选择商品')
  const duplicate = state.orders.find((order) => order.requestId === draft.requestId)
  if (duplicate) return duplicate
  const product = getProduct(draft.productId),
    address = state.addresses.find((item) => item.id === draft.addressId)
  if (!product || draft.quantity > product.stock) throw new Error('商品库存不足')
  if (!address) throw new Error('请先填写收货地址')
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
export function verifyAward(code) {
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
