<template>
  <view class="qr-block">
    <image
      :src="src || assetUrl('/static/design/qr-demo.png', 'brand.qr')"
      class="qr-image"
      mode="aspectFit"
      :show-menu-by-longpress="!!src"
    />
    <view v-if="!src" class="qr-demo-label">示意</view>
  </view>
</template>
<script setup>
import { assetUrl } from '../services/config.js'
defineProps({ src: String })
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
</style>
