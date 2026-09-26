<template>
  <PageShell :title="displayValue(config.brand.campaignTitle, '中秋活动')">
    <view class="campaign-hero">
      <view class="moon" />
      <image :src="displayValue(config.brand.campaignImage, assetUrl('/static/design/hero-product.jpg'))" mode="aspectFill" />
      <text class="hero-title block">{{ displayValue(config.brand.campaignHeroTitle, '中秋好礼') }}</text>
      <text class="hero-subtitle block">{{ displayValue(config.brand.campaignHeroSubtitle, '节日优惠　精选礼赠') }}</text>
    </view>
    <view class="campaign-coupon">
      <text class="serif block">{{ campaignCoupon?.name || (isApiMode() ? '暂无活动券' : '全场9折券') }}</text>
      <text class="muted">{{ campaignCoupon?.description || (isApiMode() ? '活动券由服务端配置' : '全场商品可用') }}</text>
      <button class="btn" @click="claim">
        {{ claimed ? '查看我的优惠券' : '领取优惠券' }}
      </button>
    </view>
    <view class="section">
      <view class="section-heading"><text class="section-title serif">{{ groupCoupon?.channel || (isApiMode() ? '社群活动' : '社群专享') }}</text></view>
      <view class="group-offer">
        <view class="group-offer-value">
          <text class="serif block" style="font-size: 20px">{{ groupCoupon?.minQuantity || 2 }}件起</text>
          <text class="serif">
            {{ groupCoupon?.rate ? groupCoupon.rate / 10 : (isApiMode() ? '—' : '9.5') }}
            <text style="font-size: 19px">折</text>
          </text>
        </view>
        <view class="group-offer-info">
          <image :src="displayValue(config.brand.groupOfferImage, assetUrl('/static/design/hero-product.jpg'))" mode="aspectFill" />
          <view>
            <text class="strong block">{{ groupCoupon?.name || (isApiMode() ? '社群活动待配置' : '会员社群活动') }}</text>
            <text class="muted small">{{ groupCoupon?.description || (isApiMode() ? '活动规则由服务端配置' : '购买2件及以上可用') }}</text>
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
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { state, claimCoupon, refreshDomain } from '../../services/store.js'
import { couponTemplates, loadCatalog } from '../../services/catalog.js'
import { config, displayValue, isApiMode, assetUrl } from '../../services/config.js'
import { go, toast } from '../../services/navigation.js'
const campaignCoupon = computed(() => couponTemplates.find((item) => item.channel === '节日活动'))
const groupCoupon = computed(() => couponTemplates.find((item) => item.channel === '社群专享'))
const claimed = computed(() => campaignCoupon.value?.id && state.claimedTemplates.includes(campaignCoupon.value.id))
onShow(async () => {
  try { await loadCatalog(); if (isApiMode()) await refreshDomain('coupons') }
  catch (error) { toast(error.message) }
})
async function claim() {
  if (claimed.value) return go('my-coupons')
  try {
    if (!campaignCoupon.value?.id) return toast('暂无可领取活动券')
    await claimCoupon(campaignCoupon.value.id)
    toast('领取成功')
  } catch (error) { toast(error.message) }
}
</script>
