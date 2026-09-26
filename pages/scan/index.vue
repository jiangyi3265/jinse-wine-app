<template>
  <PageShell title="扫码有礼" dark left :back-button="false" active="scan">
    <view class="scan-hero">
      <image :src="assetUrl('/static/design/detail-scene-clean.jpg', 'brand.scan')" mode="aspectFill" />
      <view class="scan-hero-copy">
        <text class="hero-title block">开启一份好礼</text>
        <text class="hero-subtitle block">扫描瓶身活动码参与抽奖</text>
      </view>
      <view class="scanner-frame" />
    </view>
    <view class="scan-content">
      <button class="btn" @click="scan">
        <AppIcon name="scan" tone="light" :size="30" />
        扫一扫
      </button>
      <view class="section-heading">
        <text class="section-title serif">本期好礼</text>
        <text class="small muted">更多惊喜，敬请期待</text>
      </view>
      <view class="prize-preview-grid">
        <button class="prize-preview" @click="go('redpacket')">
          <AppIcon name="coupon" tone="gold" :size="38" />
          <text class="strong">现金红包</text>
          <text class="small muted">随机金额，微信到账</text>
        </button>
        <button class="prize-preview" @click="go('awards')">
          <image :src="assetUrl('/static/design/cup.jpg', 'brand.cup')" mode="aspectFill" />
          <text class="strong">实物礼品</text>
          <text class="small muted">品鉴杯等精美礼品</text>
        </button>
      </view>
      <view class="scan-links">
        <button class="text-button" @click="go('rules', { type: 'draw' })">
          活动规则
          <AppIcon name="arrow" :size="17" />
        </button>
        <button class="text-button" @click="go('records', { type: 'draw' })">
          抽奖记录
          <AppIcon name="arrow" :size="17" />
        </button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { previewDraw, drawCode } from '../../services/store.js'
import { isApiMode, assetUrl } from '../../services/config.js'
import { go, toast, confirm } from '../../services/navigation.js'
async function demo() {
  if (
    !(await confirm(
      '前端抽奖演示',
      '选择一种奖励以预览页面。演示奖励仅保存在本机，不代表真实中奖。',
      '继续预览',
    ))
  )
    return
  uni.showActionSheet({
    itemList: ['现金红包', '积分奖励', '20元代金券', '实物品鉴杯'],
    success: (r) => {
      const kind = ['cash', 'points', 'coupon', 'goods'][r.tapIndex]
      const reward = previewDraw(kind)
      if (kind === 'cash') go('redpacket', { id: reward.rewardId })
      else {
        toast('演示奖励已发放')
        go(kind === 'points' ? 'points' : kind === 'coupon' ? 'my-coupons' : 'awards')
      }
    },
  })
}
async function handleCode(code) {
  if (!isApiMode()) {
    const reward = previewDraw(code)
    if (code === 'cash') go('redpacket', { id: reward.rewardId })
    else { toast('演示奖励已发放'); go(code === 'points' ? 'points' : code === 'coupon' ? 'my-coupons' : 'awards') }
    return
  }
  try {
    const reward = await drawCode(code)
    if (reward?.kind === 'cash') go('redpacket', { id: reward.id })
    else if (reward?.kind === 'goods') go('awards')
    else if (reward?.kind === 'coupon') go('my-coupons')
    else if (reward?.kind === 'points') go('points')
    else toast(reward?.message || '活动码已提交，结果以服务端为准')
  } catch (error) { toast(error.message) }
}
function scan() {
  // #ifdef H5
  if (isApiMode()) return toast('请在微信小程序中使用扫码活动')
  demo()
  // #endif
  // #ifdef MP-WEIXIN
  uni.showActionSheet({
    itemList: ['扫描活动码', '预览演示奖励'],
    success: (r) => {
      if (r.tapIndex === 1) return demo()
      uni.scanCode({
        onlyFromCamera: true,
        success: (result) => handleCode(result.result),
        fail: (e) => {
          if (!e.errMsg?.includes('cancel')) toast('无法扫码，请检查相机权限')
        },
      })
    },
  })
  // #endif
}
</script>
