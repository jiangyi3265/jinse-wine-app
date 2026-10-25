<template>
  <view class="qr-block">
    <image
      v-if="displaySrc"
      :src="displaySrc"
      class="qr-image"
      mode="aspectFit"
      :show-menu-by-longpress="!!displaySrc"
    />
    <view v-else class="qr-empty">
      <AppIcon name="qr" tone="muted" :size="30" />
      <text>{{ isApiMode() ? '二维码未配置' : '二维码示意' }}</text>
    </view>
    <view v-if="!src && !isApiMode()" class="qr-demo-label">示意</view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { assetUrl, isApiMode } from '../services/config.js'
const props = defineProps({ src: String })
const displaySrc = computed(() => {
  if (props.src) return props.src
  // API pages must pass the business-specific QR URL; never show a generic brand code for a redeemable item.
  if (isApiMode()) return ''
  return assetUrl('/static/design/qr-demo.png', 'brand.qr')
})
</script>
<style scoped>
.qr-block {
  position: relative;
  width: 176px;
  height: 176px;
  margin: 12px auto;
  background: #fafaf7;
  padding: 5px;
}
.qr-image {
  width: 100%;
  height: 100%;
}
.qr-demo-label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #183c30;
  color: #f7f7f2;
  border: 4px solid #fafaf7;
  border-radius: 8px;
  padding: 11px 7px;
  font-size: 17px;
}
.qr-empty {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #87928a;
  font-size: 13px;
}
</style>
