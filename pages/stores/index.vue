<template>
  <PageShell title="兑换网点">
    <view class="search-box">
      <AppIcon name="search" :size="21" />
      <input v-model="keyword" placeholder="搜索门店或地址" aria-label="搜索门店或地址" />
    </view>
    <view class="store-map">
      <view v-if="loading" class="map-empty">
        <AppIcon name="location" tone="gold" :size="28" />
        <text class="map-empty-title">正在读取门店资料</text>
        <text class="map-empty-copy">地图和营业状态马上就绪</text>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <map
        v-else-if="mapCenter && mapStores.length"
        class="map-canvas"
        :latitude="mapCenter.latitude"
        :longitude="mapCenter.longitude"
        :scale="12"
        :markers="mapMarkers"
        :show-location="!!currentLocation"
        @markertap="openMapStore"
      />
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <view v-else-if="mapCenter && mapStores.length" class="map-preview" aria-label="门店地图预览">
        <view class="map-preview-grid" />
        <button
          v-for="(store, index) in mapStores"
          :key="store.id"
          class="map-pin"
          :style="pinStyle(index)"
          :aria-label="`查看${store.name}`"
          @click="locateStore(store)"
        >
          <AppIcon name="location" tone="gold" :size="22" />
          <text class="map-pin-label">{{ store.name }}</text>
        </button>
      </view>
      <!-- #endif -->
      <view v-else class="map-empty">
        <AppIcon name="location" tone="gold" :size="28" />
        <text class="map-empty-title">{{ loadError ? '门店资料暂不可用' : '门店地图暂不可用' }}</text>
        <text class="map-empty-copy">{{ loadError || '门店位置正在完善，您可以先查看地址或致电门店' }}</text>
      </view>
      <button v-if="!loading && mapCenter && mapStores.length" class="map-locate" :disabled="locating" aria-label="定位当前" @click="retryLocation">
        <AppIcon name="location" :size="26" />
      </button>
      <text v-if="!loading && mapStores.length" class="map-caption">{{ currentLocation ? '按直线距离由近到远排列' : `已收录 ${mapStores.length} 家可导航门店` }}</text>
    </view>
    <view class="section">
      <view class="section-heading">
        <text class="section-title serif">合作门店</text>
        <button class="region-filter-toggle" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen">
          <text>{{ regionPath.length ? regionPath.join(' / ') : '筛选地区' }}</text>
          <AppIcon name="chevron" :size="16" />
        </button>
      </view>
      <view v-if="filtersOpen" class="store-region-filter"><RegionSelect v-model="regionPath" clearable /></view>
      <view class="store-location-status" :class="{ 'has-location': currentLocation }">
        <view class="column grow">
          <text>{{ locating ? '正在获取当前位置…' : currentLocation ? '已按距离由近到远排列' : '开启定位，查看附近兑换网点' }}</text>
          <text class="small muted">{{ locationError || (currentLocation ? '距离为直线估算，实际路程以导航为准' : '未定位时按默认顺序显示') }}</text>
        </view>
        <button class="location-retry" :disabled="locating" @click="retryLocation">{{ currentLocation ? '刷新位置' : '开启定位' }}</button>
      </view>
      <view v-if="loading" class="store-list-skeleton" aria-label="正在加载门店">
        <view v-for="item in 2" :key="item" class="store-skeleton-item">
          <view class="store-skeleton-photo" />
          <view class="store-skeleton-copy"><view class="store-skeleton-line" /><view class="store-skeleton-line narrow" /><view class="store-skeleton-line short" /></view>
        </view>
      </view>
      <view v-else v-for="store in filtered" :key="store.id" class="store-item">
        <view class="row">
          <image :src="store.image" class="store-photo" mode="aspectFill" />
          <view class="grow column">
            <view class="between">
              <text class="store-name">{{ store.name }}</text>
              <text class="store-distance">{{ distanceLabel(store) }}</text>
            </view>
            <text class="muted small">{{ storeAddress(store) }}</text>
            <text class="muted small">联系电话：{{ store.phone || '暂未配置' }}</text>
            <view class="row">
              <text class="badge" :class="storeReady(store) ? 'badge-green' : 'badge-muted'">
                {{ storeReady(store) ? '营业中' : '资料待完善' }}
              </text>
              <text class="muted small">{{ store.hours }}</text>
            </view>
          </view>
        </view>
        <text v-if="missingServiceInfo(store)" class="store-service-note">{{ missingServiceInfo(store) }}</text>
        <view class="store-actions">
          <button class="btn btn-outline" :class="{ 'is-unavailable': !store.phone }" :disabled="!store.phone" @click="callStore(store)">
            <AppIcon name="phone" :size="21" />
            拨打电话
          </button>
          <button class="btn btn-outline" :class="{ 'is-unavailable': !hasStoreCoordinates(store) }" :disabled="!hasStoreCoordinates(store)" @click="locateStore(store)">
            <AppIcon name="navigation" :size="21" />
            导航到店
          </button>
          <button class="btn btn-outline" @click="go('store-detail', { id: store.id })">
            <AppIcon :name="store.serviceQr ? 'qr' : 'chevron'" :size="22" />
            {{ store.serviceQr ? '二维码' : '详情' }}
          </button>
        </view>
      </view>
      <EmptyState
        v-if="!loading && !filtered.length"
        :title="loadError ? '门店暂时无法加载' : '没有找到门店'"
        :description="loadError || '试试门店名称或切换区域'"
        :button="loadError ? '重新加载' : '重置筛选'"
        @action="loadError ? loadStores() : resetFilters()"
      />
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import RegionSelect from '../../components/RegionSelect.vue'
import { resolveRegion } from '../../services/regions.js'
import { distanceMetres, formatDistance, browserLocationToGcj02 } from '../../services/store-distance.js'
import { stores, loadStoreCatalog } from '../../services/catalog.js'
import { go, toast, callStore, locateStore, hasStoreCoordinates } from '../../services/navigation.js'
const keyword = ref(''),
  regionPath = ref([]),
  filtersOpen = ref(false),
  currentLocation = ref(null),
  mapCenter = ref(null),
  loading = ref(true),
  loadError = ref(''),
  locating = ref(false),
  locationError = ref('')
let locationAttempted = false
let locatedAt = 0
let locationRequest = 0
let locationTimer
onUnload(() => { locationRequest++; clearTimeout(locationTimer) })
async function loadStores() {
  loading.value = true
  loadError.value = ''
  try { await loadStoreCatalog() } catch (error) {
    loadError.value = error.message || '门店资料暂时无法获取，请稍后重试'
  } finally { loading.value = false }
}
onShow(() => {
  loadStores()
  if (!locationAttempted || (currentLocation.value && Date.now() - locatedAt > 60000)) locate()
})
const filtered = computed(() => {
  const rows = loadError.value ? [] : stores.filter(
    (s) =>
      (!regionPath.value.length || regionPath.value.every((name, index) => resolveRegion(s)[index] === name)) &&
      `${s.name}${storeAddress(s)}`.includes(keyword.value.trim()),
  ).map(store => ({ ...store, distanceMetres: distanceMetres(store, currentLocation.value) }))
  // Unknown locations stay after all measured stores. Equal distances preserve catalog order.
  if (currentLocation.value) rows.sort((a, b) => (a.distanceMetres ?? Infinity) - (b.distanceMetres ?? Infinity))
  return rows
})
const mapStores = computed(() => filtered.value.filter(hasStoreCoordinates))
const mapMarkers = computed(() => mapStores.value.map((store, index) => ({
  id: index + 1,
  latitude: Number(store.latitude),
  longitude: Number(store.longitude),
  title: store.name,
  callout: { content: store.name, display: 'BYCLICK', padding: 8, borderRadius: 4 },
})))
watch(mapStores, (rows) => {
  if (!rows.length) { mapCenter.value = null; return }
  if (currentLocation.value) {
    if (!mapCenter.value) mapCenter.value = currentLocation.value
  } else mapCenter.value = { latitude: Number(rows[0].latitude), longitude: Number(rows[0].longitude) }
}, { immediate: true })
function locate() {
  if (locating.value) return
  locating.value = true
  locationAttempted = true
  locationError.value = ''
  const request = ++locationRequest
  // A browser or device may leave its permission prompt pending indefinitely.
  locationTimer = setTimeout(() => {
    if (request !== locationRequest) return
    locationRequest++
    locating.value = false
    currentLocation.value = null
    locationError.value = '定位超时，请允许位置权限后点击重试'
  }, 12000)
  let type = 'gcj02'
  // #ifdef H5
  type = 'wgs84'
  // #endif
  uni.getLocation({
    type,
    success: (location) => {
      if (request !== locationRequest) return
      if (!hasStoreCoordinates(location)) {
        currentLocation.value = null
        locationError.value = '未能获取有效位置，请重试'
        return
      }
      let point = { latitude: Number(location.latitude), longitude: Number(location.longitude) }
      // #ifdef H5
      point = browserLocationToGcj02(point)
      // #endif
      currentLocation.value = point
      locatedAt = Date.now()
      mapCenter.value = currentLocation.value
    },
    fail: () => {
      if (request !== locationRequest) return
      currentLocation.value = null
      locationError.value = '定位暂不可用，请检查定位权限和手机定位服务后重试'
    },
    complete: () => {
      if (request !== locationRequest) return
      clearTimeout(locationTimer)
      locating.value = false
    },
  })
}
function retryLocation() {
  if (locating.value) return
  // #ifdef MP-WEIXIN
  uni.getSetting({
    success: ({ authSetting }) => {
      if (authSetting['scope.userLocation'] === false) {
        uni.showModal({
          title: '开启位置权限', content: '用于计算您与兑换网点的距离，并按由近到远排列。', confirmText: '去设置',
          success: ({ confirm }) => {
            if (confirm) uni.openSetting({
              success: ({ authSetting: settings }) => { if (settings['scope.userLocation']) locate() },
              fail: () => toast('请在微信小程序设置中开启位置权限'),
            })
          },
        })
      } else locate()
    },
    fail: () => locate(),
  })
  // #endif
  // #ifndef MP-WEIXIN
  locate()
  // #endif
}
function distanceLabel(store) {
  if (!currentLocation.value) return locating.value ? '定位中' : '待定位'
  return formatDistance(store.distanceMetres)
}
function openMapStore(event) {
  const store = mapStores.value[event.detail.markerId - 1]
  if (store) locateStore(store)
}
function pinStyle(index) {
  const positions = [[28, 34], [68, 58], [48, 25], [78, 28]]
  const [left, top] = positions[index % positions.length]
  return { left: `${left}%`, top: `${top}%` }
}
function resetFilters() {
  keyword.value = ''
  regionPath.value = []
}
function storeAddress(store) {
  const address = String(store.address || '').trim()
  return !address || /示例|sample|example/i.test(address) ? '门店地址待完善' : address
}
function missingServiceInfo(store) {
  const missing = []
  if (!store.phone) missing.push('联系电话')
  if (!hasStoreCoordinates(store)) missing.push('导航坐标')
  return missing.length ? `${missing.join('、')}暂未配置` : ''
}
function storeReady(store) {
  return store.status === undefined || String(store.status) === '0'
    ? Boolean(storeAddress(store) !== '门店地址待完善'
      && store.phone
      && hasStoreCoordinates(store))
    : false
}
</script>
<style scoped>
.region-filter-toggle { display: flex; align-items: center; gap: 5px; max-width: 65%; min-width: 0; padding: 6px 0 6px 8px; color: #365746; font-size: 13px; }
.region-filter-toggle text { display: block; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.region-filter-toggle::after { border: none; }
.store-region-filter { margin-bottom: 18px; }
.store-location-status { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding: 14px; background: #f5f2e9; border-radius: 10px; font-size: 13px; line-height: 1.7; }
.store-location-status.has-location { background: #edf4ef; }
.location-retry { flex-shrink: 0; padding: 6px 11px; border: 1px solid #c8d3c9; border-radius: 16px; background: #fff; color: #234a38; font-size: 12px; line-height: 1.6; }
.location-retry::after { border: none; }
.store-list-skeleton { display: flex; flex-direction: column; gap: 14px; }
.store-skeleton-item { display: flex; gap: 14px; padding: 14px 0 18px; border-bottom: 1px solid #ebe8e1; }
.store-skeleton-photo, .store-skeleton-line { background: linear-gradient(90deg, #f0eee8 25%, #f8f7f3 50%, #f0eee8 75%); background-size: 200% 100%; animation: store-skeleton-shimmer 1.35s ease-in-out infinite; }
.store-skeleton-photo { width: 104px; height: 104px; flex: 0 0 104px; border-radius: 6px; }
.store-skeleton-copy { flex: 1; padding-top: 8px; }
.store-skeleton-line { width: 82%; height: 14px; border-radius: 7px; }
.store-skeleton-line.narrow { width: 96%; height: 11px; margin-top: 12px; }
.store-skeleton-line.short { width: 38%; height: 11px; margin-top: 14px; }
@keyframes store-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.map-preview { position: relative; height: 100%; overflow: hidden; background: #dce8e2; }
.map-preview-grid { position: absolute; inset: -20%; background: linear-gradient(28deg, transparent 46%, #c4d5cc 47%, #c4d5cc 49%, transparent 50%), linear-gradient(112deg, transparent 40%, #c9d9d0 41%, #c9d9d0 43%, transparent 44%), linear-gradient(0deg, transparent 70%, #eaf0ec 71%, #eaf0ec 72%, transparent 73%); transform: rotate(-7deg) scale(1.12); opacity: .88; }
.map-pin { position: absolute; z-index: 1; display: flex; align-items: center; gap: 4px; max-width: 150px; padding: 5px 8px 5px 5px; border: 1px solid #d3b77e; border-radius: 16px; background: #fffdf7; color: #183c30; box-shadow: 0 5px 12px #17382a20; transform: translate(-50%, -50%); font-size: 11px; white-space: nowrap; }
.map-pin-label { overflow: hidden; text-overflow: ellipsis; }
</style>
