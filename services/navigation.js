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
    confirmColor: '#782D3B',
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
export function hasVerifiedStoreCoordinates(store) {
  return !store?.locationSimulated && hasStoreCoordinates(store)
}
export function canLocateStore(store) {
  return hasVerifiedStoreCoordinates(store) || Boolean(String(store?.address || '').trim())
}
// H5 opens the map provider's public page; it does not need an embedded map SDK key.
export function storeMapUrl(store) {
  if (hasVerifiedStoreCoordinates(store)) {
    return `https://uri.amap.com/marker?position=${Number(store.longitude)},${Number(store.latitude)}&name=${encodeURIComponent(store.name || store.address || '门店')}&coordinate=gaode&src=xiongsen-wine&callnative=1`
  }
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(String(store?.address || '').trim())}&city=${encodeURIComponent(store?.city || '')}&view=list&src=xiongsen-wine&callnative=1`
}
function mapFailure(store, error, retry) {
  const message = String(error?.errMsg || '')
  if (/cancel/i.test(message)) return
  const permissionDenied = /auth deny|auth denied|authorize.*fail|permission denied/i.test(message)
  uni.showModal({
    title: permissionDenied ? '需要地图位置权限' : '地图暂时无法打开',
    content: `${store.address || store.name}\n${permissionDenied ? '开启位置权限后，可以在地图中查找门店。' : '您可以复制地址，在微信或地图应用中搜索门店。'}`,
    confirmText: permissionDenied ? '去设置' : '复制地址', cancelText: '关闭',
    success: ({ confirm }) => {
      if (!confirm) return
      if (permissionDenied) uni.openSetting({
        success: ({ authSetting }) => { if (authSetting?.['scope.userLocation']) retry() },
        fail: () => toast('请在小程序设置中开启位置权限'),
      })
      else uni.setClipboardData({ data: store.address || store.name })
    },
  })
}
function openStorePoint(point, store) {
  uni.openLocation({
    latitude: Number(point.latitude), longitude: Number(point.longitude),
    name: point.name || '所选位置', address: point.address || '', scale: 17,
    fail: error => mapFailure(store, error, () => openStorePoint(point, store)),
  })
}
export function locateStore(store) {
  if (!canLocateStore(store)) return toast('门店地址和导航位置尚未配置')
  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.location.assign(storeMapUrl(store))
    return
  }
  // #endif
  if (hasVerifiedStoreCoordinates(store)) return openStorePoint(store, store)
  // WeChat chooseLocation cannot prefill a keyword. Copy the address for pasting
  // into its search box. Never send a simulated point to a real navigation route.
  const choose = () => uni.chooseLocation({
    success: point => {
      if (!hasStoreCoordinates(point)) return toast('未取得有效位置，请重新选择')
      // Keep the selected POI's own name/address, and never persist it as the store.
      openStorePoint(point, store)
    },
    fail: error => mapFailure(store, error, choose),
  })
  uni.setClipboardData({ data: String(store.address).trim(), showToast: false, complete: choose })
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
