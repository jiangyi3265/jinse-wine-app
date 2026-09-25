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
  if (getCurrentPages().length > 1) uni.navigateBack()
  else go('index')
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
export function run(action) {
  try {
    return action()
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
export function locateStore(store) {
  if (store.latitude == null || store.longitude == null) return toast('门店导航位置尚未配置')
  uni.openLocation({
    latitude: store.latitude,
    longitude: store.longitude,
    name: store.name,
    address: store.address,
    fail: () => toast('无法打开地图，请检查定位权限'),
  })
}
export function dateLabel(time) {
  const date = new Date(time)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
export const statusLabels = {
  pending: '待付款',
  shipping: '待发货',
  receiving: '待收货',
  complete: '已完成',
  cancelled: '已取消',
}
