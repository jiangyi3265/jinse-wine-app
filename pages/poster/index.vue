<template>
  <PageShell title="推广海报">
    <view class="poster-card">
      <view class="poster-photo">
        <image src="/static/design/detail-scene-clean.jpg" mode="aspectFill" />
        <view class="column">
          <text class="vip-brand">金色酒业</text>
          <text class="poster-product-name">典藏酱香</text>
          <text class="serif" style="font-size: 20px">53度 500mL</text>
          <text class="serif" style="font-size: 32px">¥398</text>
        </view>
      </view>
      <view class="poster-bottom">
        <view class="grow column">
          <text class="serif strong" style="font-size: 20px">{{ state.user.name }}的精选推荐</text>
          <text class="muted small">长按识别，查看商品</text>
        </view>
        <QrCode />
      </view>
    </view>
    <view class="section poster-actions">
      <button class="btn btn-outline" :disabled="saving" @click="savePoster">
        {{ saving ? '生成中…' : '保存海报' }}
      </button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="btn" open-type="share">分享给好友</button>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <button class="btn" @click="shareLink">分享给好友</button>
      <!-- #endif -->
    </view>
    <text class="profile-demo">演示海报 · 二维码为示意</text>
    <canvas
      canvas-id="posterCanvas"
      id="posterCanvas"
      style="position: fixed; left: -2000px; top: 0; width: 390px; height: 620px"
    />
  </PageShell>
</template>
<script setup>
import { ref, getCurrentInstance } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import QrCode from '../../components/QrCode.vue'
import { state } from '../../services/store.js'
import { toast } from '../../services/navigation.js'
const saving = ref(false),
  instance = getCurrentInstance()
onShareAppMessage(() => ({
  title: '金色酒业 · 典藏酱香',
  path: '/pages/product/index?id=classic',
}))
function shareLink() {
  // #ifdef H5
  uni.setClipboardData({
    data: `${window.location.origin}/#/pages/product/index?id=classic`,
    success: () => toast('商品链接已复制，可粘贴分享'),
  })
  // #endif
}
async function savePoster() {
  if (saving.value) return
  saving.value = true
  try {
    const ctx = uni.createCanvasContext('posterCanvas', instance.proxy)
    ctx.setFillStyle('#102c22')
    ctx.fillRect(0, 0, 390, 510)
    ctx.drawImage('/static/design/detail-scene-clean.jpg', 0, 190, 390, 320)
    ctx.setFillStyle('#ead1a2')
    ctx.setFontSize(26)
    ctx.fillText('金色酒业', 25, 48)
    ctx.setFontSize(38)
    ctx.fillText('典藏酱香', 25, 109)
    ctx.setFontSize(20)
    ctx.fillText('53度 500mL', 25, 145)
    ctx.setFontSize(29)
    ctx.fillText('¥398', 25, 187)
    ctx.setFillStyle('#f3efe4')
    ctx.fillRect(0, 510, 390, 110)
    ctx.setFillStyle('#21382b')
    ctx.setFontSize(20)
    ctx.fillText(`${state.user.name}的精选推荐`, 20, 551)
    ctx.setFontSize(13)
    ctx.fillText('演示海报 · 二维码为示意', 20, 581)
    ctx.drawImage('/static/design/qr-demo.png', 290, 522, 87, 87)
    await new Promise((resolve) => ctx.draw(false, resolve))
    const image = await uni.canvasToTempFilePath(
      {
        canvasId: 'posterCanvas',
        width: 390,
        height: 620,
        destWidth: 780,
        destHeight: 1240,
        fileType: 'png',
      },
      instance.proxy,
    )
    // #ifdef H5
    const link = document.createElement('a')
    link.href = image.tempFilePath
    link.download = '金色酒业-推广海报.png'
    link.click()
    toast('海报已生成')
    // #endif
    // #ifdef MP-WEIXIN
    await uni.saveImageToPhotosAlbum({ filePath: image.tempFilePath })
    toast('海报已保存到相册')
    // #endif
  } catch (e) {
    toast('保存未完成，请检查相册权限后重试')
  } finally {
    saving.value = false
  }
}
</script>
