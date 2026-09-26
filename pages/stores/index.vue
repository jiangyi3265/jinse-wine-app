<template>
  <PageShell title="兑换网点">
    <view class="search-box">
      <AppIcon name="search" :size="21" />
      <input v-model="keyword" placeholder="搜索门店或地址" aria-label="搜索门店或地址" />
    </view>
    <view class="store-map">
      <image :src="displayValue(config.brand.mapImage, assetUrl('/static/design/map.jpg', 'brand.map'))" mode="aspectFill" />
      <text class="map-caption">{{ isApiMode() ? '门店位置由服务端配置' : '示意地图 · 距离为演示数据' }}</text>
      <button class="map-locate" aria-label="定位当前" @click="locate">
        <AppIcon name="location" :size="26" />
      </button>
    </view>
    <view class="section">
      <view class="section-heading">
        <text class="section-title serif">附近门店</text>
        <button class="text-button" @click="citySheet">{{ district }}⌄</button>
      </view>
      <view v-for="store in filtered" :key="store.id" class="store-item">
        <view class="row">
          <image :src="store.image" class="store-photo" mode="aspectFill" />
          <view class="grow column">
            <view class="between">
              <text class="store-name">{{ store.name }}</text>
              <text class="store-distance">{{ store.distance === '—' ? '距离待计算' : `${store.distance}km` }}</text>
            </view>
            <text class="muted small">{{ store.address }}</text>
            <view class="row">
              <text class="badge badge-green">营业中</text>
              <text class="muted small">{{ store.hours }}</text>
            </view>
          </view>
        </view>
        <view class="store-actions">
          <button class="btn btn-outline" @click="callStore(store)">
            <AppIcon name="phone" :size="21" />
            拨打电话
          </button>
          <button class="btn btn-outline" @click="locateStore(store)">
            <AppIcon name="navigation" :size="21" />
            导航到店
          </button>
          <button class="btn btn-outline" @click="go('store-detail', { id: store.id })">
            <AppIcon name="qr" :size="22" />
            门店二维码
          </button>
        </view>
      </view>
      <EmptyState
        v-if="!filtered.length"
        title="没有找到门店"
        description="试试门店名称或切换区域"
        button="重置筛选"
        @action="resetFilters"
      />
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { stores, loadCatalog } from '../../services/catalog.js'
import { go, toast, callStore, locateStore } from '../../services/navigation.js'
import { config, displayValue, isApiMode, assetUrl } from '../../services/config.js'
const keyword = ref(''),
  district = ref(isApiMode() ? '' : '贵港')
onShow(() => loadCatalog().catch((error) => toast(error.message)))
const filtered = computed(() =>
  stores.filter(
    (s) =>
      (!district.value || s.city === district.value || s.district === district.value) &&
      `${s.name}${s.address}`.includes(keyword.value.trim()),
  ),
)
function citySheet() {
  uni.showActionSheet({
    itemList: ['全部', ...new Set(stores.flatMap((item) => [item.city, item.district]).filter(Boolean))],
    success: (r) => {
      district.value = ['全部', ...new Set(stores.flatMap((item) => [item.city, item.district]).filter(Boolean))][r.tapIndex] || ''
    },
  })
}
function locate() {
  toast('当前为示意地图，门店坐标待配置')
}
function resetFilters() {
  keyword.value = ''
  district.value = isApiMode() ? '' : '贵港'
}
</script>
