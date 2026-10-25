<template>
  <PageShell :title="displayValue(campaignBrand.campaignTitle, '中秋活动')">
    <view v-if="loadError" class="notice campaign-error">
      <AppIcon name="info" :size="19" />
      <view class="grow column">
        <text>{{ loadError }}</text>
        <button class="text-button" @click="loadCampaign">重新加载</button>
      </view>
    </view>
    <view class="campaign-hero">
      <view class="moon" />
      <image :src="campaignBrand.campaignImage || assetUrl('/static/design/hero-product.jpg')" mode="aspectFill" />
      <text class="hero-title block">{{ displayValue(campaignBrand.campaignHeroTitle, '中秋好礼') }}</text>
      <text class="hero-subtitle block">{{ displayValue(campaignBrand.campaignHeroSubtitle, '节日优惠　精选礼赠') }}</text>
    </view>
    <view class="campaign-coupon">
      <text class="serif block">{{ campaignCoupon?.name || (couponLoading ? '正在确认活动券' : loadError ? '活动券暂不可用' : isApiMode() ? '暂无活动券' : '全场9折券') }}</text>
      <text class="muted">{{ campaignCoupon?.description || (loadError ? '请重新加载活动优惠券' : isApiMode() ? '活动券由服务端配置' : '全场商品可用') }}</text>
      <button class="btn" :disabled="!couponReady || !campaignCoupon || claiming" @click="claim">
        {{ claiming ? '领取中…' : couponLoading ? '正在确认优惠券' : claimed ? '查看我的优惠券' : campaignCoupon ? '领取优惠券' : '暂无可领取优惠券' }}
      </button>
    </view>
    <view class="section">
      <view class="section-heading"><text class="section-title serif">{{ groupCoupon?.channel || (isApiMode() ? '社群活动' : '社群专享') }}</text></view>
      <view v-if="!couponReady" class="campaign-group-unavailable">{{ couponLoading ? '正在确认社群优惠券' : '社群优惠券暂不可用，请重新加载' }}</view>
      <view v-else-if="groupCoupon" class="group-offer">
        <view class="group-offer-value">
          <text class="serif block" style="font-size: 20px">{{ groupCoupon.minQuantity || 1 }}件起</text>
          <text class="serif">{{ groupBenefit.value }}<text style="font-size: 19px">{{ groupBenefit.unit }}</text></text>
        </view>
        <view class="group-offer-info">
          <image :src="campaignBrand.groupOfferImage || assetUrl('/static/design/hero-product.jpg')" mode="aspectFill" />
          <view>
            <text class="strong block">{{ groupCoupon.name }}</text>
            <text class="muted small">{{ groupCoupon.description || '具体使用条件以结算报价为准' }}</text>
            <button class="btn btn-small" @click="go('coupons', { category: 'group' })">
              查看活动
            </button>
          </view>
        </view>
      </view>
      <view v-else class="campaign-group-unavailable">暂无社群优惠券</view>
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
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { claimCoupon, couponClaimLimitReached, refreshDomain } from '../../services/store.js'
import { couponTemplates, loadCouponCatalog } from '../../services/catalog.js'
import { config, displayValue, isApiMode, assetUrl, mediaUrl } from '../../services/config.js'
import { get } from '../../services/api.js'
import { go, toast } from '../../services/navigation.js'
const campaignBrand = ref(isApiMode() ? {
  campaignTitle: '活动专区', campaignHeroTitle: '会员活动', campaignHeroSubtitle: '优惠与好礼',
} : config.brand)
const couponReady = ref(!isApiMode())
const couponLoading = ref(false)
const claiming = ref(false)
const campaignCoupon = computed(() => couponReady.value ? couponTemplates.find((item) => item.channel === '节日活动') : null)
const groupCoupon = computed(() => couponReady.value ? couponTemplates.find((item) => item.channel === '社群专享') : null)
const groupBenefit = computed(() => groupCoupon.value?.kind === 'percent'
  ? { value: String(Number(groupCoupon.value.rate || 0) / 10), unit: '折' }
  : { value: String(Number(groupCoupon.value?.amount || 0) / 100), unit: '元' })
const claimed = computed(() => campaignCoupon.value?.id && couponClaimLimitReached(campaignCoupon.value.id))
const loadError = ref('')
async function loadCampaign() {
  if (couponLoading.value) return
  couponLoading.value = true
  couponReady.value = false
  loadError.value = ''
  try {
    await loadCouponCatalog()
    if (isApiMode()) await refreshDomain('coupons')
    couponReady.value = true
  }
  catch (error) { loadError.value = error.message || '活动信息暂时无法获取，请稍后重试' }
  finally { couponLoading.value = false }
}
async function loadCampaignBrand() {
  if (!isApiMode()) return
  try {
    const brand = await get('/mini/brand') || {}
    campaignBrand.value = {
      campaignTitle: brand.campaignTitle || brand.homeCampaignTitle || '活动专区',
      campaignHeroTitle: brand.campaignHeroTitle || brand.homeCampaignTitle || '会员活动',
      campaignHeroSubtitle: brand.campaignHeroSubtitle || brand.homeCampaignSubtitle || '优惠与好礼',
      campaignImage: mediaUrl(brand.campaignImage || brand.homeCampaignImage || ''),
      groupOfferImage: mediaUrl(brand.groupOfferImage || brand.homeCampaignImage || ''),
    }
  } catch { campaignBrand.value = { campaignTitle: '活动专区', campaignHeroTitle: '会员活动', campaignHeroSubtitle: '优惠与好礼' } }
}
onShow(() => { void loadCampaign(); void loadCampaignBrand() })
async function claim() {
  if (claiming.value) return
  if (!couponReady.value) return toast('请先确认活动优惠券')
  if (claimed.value) return go('my-coupons')
  if (!campaignCoupon.value?.id) return toast('暂无可领取活动券')
  claiming.value = true
  try {
    await claimCoupon(campaignCoupon.value.id)
    toast('领取成功')
  } catch (error) { toast(error.message) }
  finally { claiming.value = false }
}
</script>
<style scoped>
.campaign-error { margin: 12px 16px 0; align-items: flex-start; }
.campaign-group-unavailable { padding: 17px 14px; color: #68766e; background: #f3f5f1; font-size: 13px; }
@media (max-width: 360px) {
  .campaign-hero .hero-title { max-width: 52%; font-size: 32px; line-height: 1.15; }
  .campaign-hero .hero-subtitle { max-width: 53%; font-size: 12px; line-height: 1.5; letter-spacing: 0; }
}
</style>
