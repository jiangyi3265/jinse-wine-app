<template>
  <PageShell title="门店详情">
    <view v-if="loading" class="store-loading" aria-label="正在加载门店信息">
      <view class="store-loading-hero" />
      <view class="store-loading-body">
        <view class="store-skeleton-line store-skeleton-line--title" />
        <view class="store-skeleton-line store-skeleton-line--meta" />
        <view class="store-skeleton-qr" />
        <view class="store-skeleton-line store-skeleton-line--wide" />
        <view class="store-skeleton-row" />
        <view class="store-skeleton-row" />
      </view>
    </view>
    <template v-else-if="store">
      <view class="store-hero">
        <image :src="displayValue(config.brand.storeHeroImage, assetUrl('/static/design/hero-product.jpg', 'brand.store'))" mode="aspectFill" />
        <view class="store-hero-copy">
          <text class="serif">金色酒业</text>
          <text class="store-hero-sub">传承酱香　酿造美好</text>
        </view>
      </view>
      <view class="store-qr-content">
        <text class="store-name">{{ store.name }}</text>
        <template v-if="store.serviceQr">
          <text class="muted center block">门店服务入口</text>
          <QrCode :src="store.serviceQr" />
          <text class="strong center block">扫码进入本店服务页</text>
        </template>
        <view class="service-pair">
          <button @click="contact">
            <AppIcon name="headset" :size="22" />
            联系客服
            <AppIcon name="chevron" :size="17" />
          </button>
          <button @click="go('vip', { store: store.id })">
            <AppIcon name="users" :size="23" />
            门店社群
            <AppIcon name="chevron" :size="17" />
          </button>
        </view>
        <view class="row muted small">
          <AppIcon name="pin" :size="20" />
          <text>{{ store.address }}</text>
        </view>
        <view class="row muted small store-contact-line">
          <AppIcon name="phone" :size="20" />
          <text>联系电话：{{ store.phone || '暂未配置' }}</text>
        </view>
        <view v-if="store.hours" class="row muted small store-contact-line">
          <AppIcon name="clock" :size="20" />
          <text>营业时间：{{ store.hours }}</text>
        </view>
        <text v-if="missingServiceInfo(store)" class="store-service-note">{{ missingServiceInfo(store) }}</text>
        <view class="store-actions">
          <button class="btn btn-outline" :class="{ 'is-unavailable': !store.phone }" :disabled="!store.phone" @click="callStore(store)">
            <AppIcon name="phone" :size="22" />
            拨打电话
          </button>
          <button class="btn" :class="{ 'is-unavailable': !hasStoreCoordinates(store) }" :disabled="!hasStoreCoordinates(store)" @click="locateStore(store)">
            <AppIcon name="navigation" tone="light" :size="22" />
            导航到店
          </button>
        </view>
        <view class="packet-support">
          <AppIcon name="info" :size="18" />
          奖品兑换请出示个人兑换码
        </view>
      </view>
    </template>
    <EmptyState v-else-if="loadError" title="门店信息暂不可用" description="检查网络后重试" button="重新加载" @action="loadStore" />
    <EmptyState v-else title="门店不存在或已停用" button="查看其他门店" @action="go('stores')" />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import EmptyState from '../../components/EmptyState.vue'
import { stores, loadStoreByCode } from '../../services/catalog.js'
import { go, contact, callStore, locateStore, hasStoreCoordinates } from '../../services/navigation.js'
import { config, displayValue, assetUrl, isApiMode } from '../../services/config.js'
const id = ref(isApiMode() ? '' : 'guigang')
const loading = ref(true)
const loadError = ref(false)
const resolvedStore = ref(null)
let storeTask
onLoad((q) => {
  id.value = q.id || (isApiMode() ? '' : 'guigang')
  if (id.value) loadStore()
  else loading.value = false
})
onShow(() => { if (id.value) loadStore() })
const store = computed(() => isApiMode() ? resolvedStore.value : stores.find((s) => s.id === id.value))
async function loadStore() {
  if (storeTask) return storeTask
  storeTask = (async () => {
    loading.value = true
    loadError.value = false
    resolvedStore.value = null
    try { resolvedStore.value = await loadStoreByCode(id.value) }
    catch (error) { loadError.value = Number(error.statusCode) !== 404 }
    finally { loading.value = false }
  })().finally(() => { storeTask = null })
  return storeTask
}
function missingServiceInfo(store) {
  const missing = []
  if (!store.phone) missing.push('联系电话')
  if (!hasStoreCoordinates(store)) missing.push('导航坐标')
  return missing.length ? `${missing.join('、')}暂未配置` : ''
}
</script>
<style scoped>
.store-contact-line { margin-top: 12px; }
.store-loading { min-height: calc(100vh - 102px); background: #fbfaf6; }
.store-loading-hero, .store-skeleton-line, .store-skeleton-qr, .store-skeleton-row { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: store-skeleton-shimmer 1.4s ease-in-out infinite; }
.store-loading-hero { height: 220px; }
.store-loading-body { display: flex; flex-direction: column; align-items: center; padding: 24px 18px 36px; }
.store-skeleton-line { height: 13px; border-radius: 7px; }
.store-skeleton-line--title { width: 48%; height: 23px; border-radius: 6px; }
.store-skeleton-line--meta { width: 30%; margin-top: 10px; }
.store-skeleton-qr { width: 170px; height: 170px; margin: 22px 0 14px; border-radius: 4px; }
.store-skeleton-line--wide { width: 55%; }
.store-skeleton-row { width: 100%; height: 48px; margin-top: 18px; border-radius: 5px; }
@keyframes store-skeleton-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
</style>
