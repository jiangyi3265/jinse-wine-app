import { hasStoreCoordinates } from './navigation.js'

// All store coordinates and WeChat locations use GCJ-02. Distances are straight-line metres.
export function distanceMetres(store, location) {
  if (!hasStoreCoordinates(store) || !hasStoreCoordinates(location)) return null
  const rad = value => Number(value) * Math.PI / 180
  const deltaLat = rad(store.latitude) - rad(location.latitude)
  const deltaLng = rad(store.longitude) - rad(location.longitude)
  const a = Math.min(1, Math.max(0, Math.sin(deltaLat / 2) ** 2
    + Math.cos(rad(location.latitude)) * Math.cos(rad(store.latitude)) * Math.sin(deltaLng / 2) ** 2))
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(metres) {
  if (!Number.isFinite(metres) || metres < 0) return '距离暂不可用'
  if (metres < 1) return '不足1米'
  if (metres < 1000) return `约${Math.round(metres)}米`
  return `约${(metres / 1000).toFixed(1)}公里`
}

// H5 browser geolocation is WGS-84; convert it before comparing with store GCJ-02 points.
export function browserLocationToGcj02(location) {
  const lat = Number(location.latitude), lng = Number(location.longitude)
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return { latitude: lat, longitude: lng }
  const x = lng - 105, y = lat - 35, pi = Math.PI
  let dLat = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  dLat += (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3
  dLat += (20 * Math.sin(y * pi) + 40 * Math.sin(y * pi / 3)) * 2 / 3
  dLat += (160 * Math.sin(y * pi / 12) + 320 * Math.sin(y * pi / 30)) * 2 / 3
  let dLng = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  dLng += (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3
  dLng += (20 * Math.sin(x * pi) + 40 * Math.sin(x * pi / 3)) * 2 / 3
  dLng += (150 * Math.sin(x * pi / 12) + 300 * Math.sin(x * pi / 30)) * 2 / 3
  const radLat = lat / 180 * pi
  const magic = 1 - 0.006693421622965943 * Math.sin(radLat) ** 2
  const sqrtMagic = Math.sqrt(magic)
  dLat = dLat * 180 / ((6378245 * (1 - 0.006693421622965943)) / (magic * sqrtMagic) * pi)
  dLng = dLng * 180 / (6378245 / sqrtMagic * Math.cos(radLat) * pi)
  return { latitude: lat + dLat, longitude: lng + dLng }
}
