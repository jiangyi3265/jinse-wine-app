<template>
  <PageShell title="中秋活动">
    <view class="campaign-hero">
      <view class="moon" />
      <image src="/static/design/hero-product.jpg" mode="aspectFill" />
      <text class="hero-title block">中秋好礼</text>
      <text class="hero-subtitle block">节日优惠　精选礼赠</text>
    </view>
    <view class="campaign-coupon">
      <text class="serif block">全场9折券</text>
      <text class="muted">全场商品可用</text>
      <button class="btn" @click="claim">
        {{ claimed ? '查看我的优惠券' : '领取优惠券' }}
      </button>
    </view>
    <view class="section">
      <view class="section-heading"><text class="section-title serif">社群专享</text></view>
      <view class="group-offer">
        <view class="group-offer-value">
          <text class="serif block" style="font-size: 20px">2件起</text>
          <text class="serif">
            9.5
            <text style="font-size: 19px">折</text>
          </text>
        </view>
        <view class="group-offer-info">
          <image src="/static/design/hero-product.jpg" mode="aspectFill" />
          <view>
            <text class="strong block">会员社群活动</text>
            <text class="muted small">购买2件及以上可用</text>
            <button class="btn btn-small" @click="go('coupons', { category: 'group' })">
              查看活动
            </button>
          </view>
        </view>
      </view>
      <view class="section-heading"><text class="section-title serif">品牌服务</text></view>
      <view class="brand-services">
        <button class="link-row" @click="go('service', { type: 'official' })">
          <AppIcon name="wechat" :size="30" />
          <text class="strong">公众号</text>
          <text class="grow muted">查看品牌内容与活动消息</text>
          <AppIcon name="chevron" :size="16" />
        </button>
        <button class="link-row" @click="go('service', { type: 'channels' })">
          <AppIcon name="play" :size="30" />
          <text class="strong">视频号</text>
          <text class="grow muted">查看品牌内容与活动消息</text>
          <AppIcon name="chevron" :size="16" />
        </button>
      </view>
      <view class="center section-space">
        <button class="text-button" @click="go('rules', { type: 'campaign' })">
          活动规则
          <AppIcon name="arrow" :size="21" />
        </button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import { computed } from 'vue'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { state, claimCoupon } from '../../services/store.js'
import { go, run, toast } from '../../services/navigation.js'
const claimed = computed(() => state.claimedTemplates.includes('festival90'))
function claim() {
  if (claimed.value) return go('my-coupons')
  run(() => {
    claimCoupon('festival90')
    toast('领取成功')
  })
}
</script>
