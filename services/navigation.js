const roots = ['index', 'shop', 'scan', 'promotion', 'profile']
export const route = (name, query = {}) =>
  `/pages/${name}/index${
    Object.keys(query).length
      ? '?' +
        Object.entries(query)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      : ''
  }`
export function go(name, query = {}) {
  const url = route(name, query)
  if (roots.includes(name) && !Object.keys(query).length) uni.reLaunch({ url })
  else uni.navigateTo({ url, fail: () => uni.redirectTo({ url }) })
}
export function back() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    // 部分开发者工具直达页面时路由栈不完整，返回失败时统一回到首页。
    uni.navigateBack({ delta: 1, fail: () => go('index') })
    return
  }
  go('index')
}
export function toast(title) {
  uni.showToast({ title, icon: 'none', duration: 2300 })
}
export async function confirm(title, content, confirmText = '确认') {
  const result = await uni.showModal({
    title,
    content,
    confirmText,
    cancelText: '取消',
    confirmColor: '#182D28',
  })
  return result.confirm
}
export async function run(action) {
  try {
    return await action()
  } catch (error) {
    toast(error.message)
    return false
  }
}
export function contact() {
  go('service')
}
export function callStore(store) {
  if (!store.phone) return toast('门店联系电话尚未配置')
  uni.makePhoneCall({
    phoneNumber: store.phone,
    fail: () => toast('未能拨打，请稍后重试'),
  })
}
export function hasStoreCoordinates(store) {
  if (!store || ![store.latitude, store.longitude].every((value) =>
    (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '')) return false
  const latitude = Number(store.latitude), longitude = Number(store.longitude)
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && (latitude !== 0 || longitude !== 0)
}
export function locateStore(store) {
  if (!hasStoreCoordinates(store)) return toast('门店导航位置尚未配置')
  uni.openLocation({
    latitude: Number(store.latitude),
    longitude: Number(store.longitude),
    name: store.name,
    address: store.address,
    fail: () => toast('无法打开地图，请检查定位权限'),
  })
}
export function dateLabel(time) {
  if (!time) return '—'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
export const statusLabels = {
  pending: '待付款',
  paid: '待发货',
  shipping: '待收货',
  receiving: '待收货',
  complete: '已完成',
  refunded: '已退款',
  cancelled: '已取消',
}
export function deliveryStatusLabel(status) {
  return ({ pending: '待发货', shipped: '已发货，待揽收', awaiting_collect: '已发货，待揽收',
    collected: '已揽收', in_transit: '运输中', delivering: '运输中', out_for_delivery: '派送中',
    awaiting_pickup: '到达驿站待取件', agent_signed: '已代签收，请核对取件', signed: '已签收，待确认收货', delivered: '已送达，待确认收货',
    returning: '退回中', returned: '已退回', refused: '已拒收', exception: '物流异常', cancelled: '运单已取消',
  })[status] || '物流待更新'
}
export function orderStatusLabel(order, deliveryStatus = order?.deliveryStatus) {
  if (!order) return '状态待确认'
  if (order.status === 'paid') return order.fulfillmentMode === 'pickup' ? '待到店自提' : '待发货'
  if (['shipping', 'receiving'].includes(order.status) && deliveryStatus) return deliveryStatusLabel(deliveryStatus)
  return statusLabels[order.status] || '状态待确认'
}
