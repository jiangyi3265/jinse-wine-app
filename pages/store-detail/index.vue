<template>
  <PageShell title="门店二维码">
    <template v-if="store">
      <view class="store-hero">
        <image :src="displayValue(config.brand.storeHeroImage, assetUrl('/static/design/hero-product.jpg', 'brand.store'))" mode="aspectFill" />
        <view class="store-hero-copy">
          <text class="serif">金色酒业</text>
          <text class="store-hero-sub">传承酱香　酿造美好</text>
        </view>
      </view>
      <view class="store-qr-content">
        <text class="store-name">{{ store.name }}</text>
        <text class="muted center block">门店服务入口</text>
        <QrCode :src="store.serviceQr" />
        <text class="strong center block">扫码进入本店服务页</text>
        <text class="muted small center block">门店信息 · 活动与服务</text>
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
        <view class="store-actions">
          <button class="btn btn-outline" @click="callStore(store)">
            <AppIcon name="phone" :size="22" />
            拨打电话
          </button>
          <button class="btn" @click="locateStore(store)">
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
    <EmptyState v-else title="门店不存在" button="查看其他门店" @action="go('stores')" />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import EmptyState from '../../components/EmptyState.vue'
import { stores } from '../../services/catalog.js'
import { go, contact, callStore, locateStore } from '../../services/navigation.js'
import { config, displayValue, assetUrl } from '../../services/config.js'
const id = ref('guigang')
onLoad((q) => {
  id.value = q.id || 'guigang'
})
const store = computed(() => stores.find((s) => s.id === id.value))
</script>
