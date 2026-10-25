<template>
  <PageShell title="VIP社群">
    <view class="vip-card">
      <view class="vip-card-inner">
        <text class="vip-brand block">金色酒业</text>
        <text class="small">酿造美好生活</text>
        <text class="vip-title block">VIP社群</text>
        <text>以酒会友 · 臻享不凡</text>
        <view class="vip-benefits">
          <view class="row">
            <AppIcon name="gift" tone="light" :size="24" />
            新品与促销活动
          </view>
          <view class="row">
            <AppIcon name="bell" tone="light" :size="24" />
            优惠券与积分兑换提醒
          </view>
        </view>
        <QrCode :src="groupQr" />
        <text class="small block">
          {{ groupQrLoading ? '正在确认社群二维码' : groupQrError || (groupQr ? '长按识别二维码进群' : '社群二维码待配置') }}
        </text>
        <button v-if="groupQrError" class="group-qr-retry" :disabled="groupQrLoading" @click="loadGroupQr">重新获取群码</button>
      </view>
    </view>
    <view class="section subscribe-section">
      <view class="subscribe-copy">
        <text class="section-title">活动提醒</text>
        <text class="small block">开启后，促销、优惠券和积分活动会通过微信服务通知送达</text>
      </view>
      <button class="subscribe-button" :disabled="subscribing" @click="subscribeNotifications">{{ subscribing ? '处理中…' : '开启活动提醒' }}</button>
    </view>
    <view class="section">
      <text class="section-title serif">社群动态</text>
      <view v-if="campaignLoading" class="campaign-loading" aria-label="正在加载社群动态">
        <view v-for="item in 2" :key="item" class="campaign-loading-row" />
      </view>
      <view v-else-if="campaignError" class="campaign-error notice">
        <AppIcon name="info" tone="muted" :size="18" />
        <view class="grow">
          <text class="block">社群动态加载失败</text>
          <text class="small muted">{{ campaignError }}</text>
        </view>
        <button class="text-button ink" @click="loadCampaigns">重试</button>
      </view>
      <view v-else-if="campaigns.length" class="campaign-list">
        <view v-for="item in campaigns" :key="item.id" class="campaign-item">
          <view class="campaign-heading"><text class="campaign-title">{{ item.title }}</text><text class="campaign-type">{{ campaignType(item.type) }}</text></view>
          <text class="campaign-content">{{ item.content }}</text>
          <button v-if="item.couponTemplateId" class="campaign-link" @click="go('coupons', { templateId: item.couponCode })">查看优惠券</button>
          <button v-else-if="item.type === 'points'" class="campaign-link" @click="go('points')">查看积分兑换</button>
        </view>
      </view>
      <view v-else class="campaign-empty">暂无最新活动</view>
      <button class="link-row" @click="go('coupons', { category: 'group' })">
        <view class="grow">
          <AppIcon name="gift" />
          会员专享优惠券
        </view>
        <AppIcon name="chevron" :size="16" />
      </button>
      <button class="link-row" @click="go('points')">
        <view class="grow">
          <AppIcon name="bell" />
          积分与好礼兑换
        </view>
        <AppIcon name="chevron" :size="16" />
      </button>
      <button class="packet-support" @click="contact">
        <AppIcon name="headset" />
        联系客服
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import { config, isApiMode, mediaUrl } from '../../services/config.js'
import { go, contact, toast } from '../../services/navigation.js'
import { get, post } from '../../services/api.js'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { newRequestId } from '../../services/store.js'

const campaigns = ref([])
const campaignLoading = ref(false)
const campaignError = ref('')
const groupQr = ref('')
const groupQrLoading = ref(false)
const groupQrError = ref('')
const subscribing = ref(false)
let subscribeRequestId = ''
const campaignType = type => ({ promotion: '促销', coupon: '优惠券', points: '积分' })[type] || '活动'

async function loadCampaigns() {
  campaignLoading.value = true
  campaignError.value = ''
  try {
    if (isApiMode()) campaigns.value = await get('/mini/social/campaigns') || []
    else campaigns.value = []
  } catch (error) {
    campaignError.value = error.message || '请稍后重试'
  } finally {
    campaignLoading.value = false
  }
}

async function loadGroupQr() {
  groupQr.value = ''
  groupQrError.value = ''
  if (!isApiMode()) { groupQr.value = config.groupQr; return }
  groupQrLoading.value = true
  try {
    const channels = await get('/mini/channel') || {}
    groupQr.value = channels['wechat.work.groupQrExpired'] === 'true'
      ? '' : mediaUrl(channels['wechat.work.groupQr'] || '')
  } catch (error) {
    groupQrError.value = error.message || '社群二维码暂时无法加载'
  } finally { groupQrLoading.value = false }
}

onShow(() => { void loadCampaigns(); void loadGroupQr() })

async function subscribeNotifications() {
  if (subscribing.value) return
  if (!isApiMode()) return toast('请在正式小程序中开启活动提醒')
  subscribing.value = true
  try {
    const settings = await get('/mini/social/subscribe-config', true)
    if (!settings?.enabled || !settings?.templateId) return toast('活动通知暂未配置')
    // #ifdef MP-WEIXIN
    const result = await new Promise((resolve, reject) => uni.requestSubscribeMessage({
      tmplIds: [settings.templateId], success: resolve, fail: reject,
    }))
    if (!subscribeRequestId) subscribeRequestId = newRequestId('social-subscribe')
    const accepted = result?.[settings.templateId] || 'reject'
    await post('/mini/social/subscribe', { templateId: settings.templateId, result: accepted, requestId: subscribeRequestId }, true, subscribeRequestId)
    subscribeRequestId = ''
    toast(accepted === 'accept' ? '已开启活动提醒' : '未开启活动提醒')
    // #endif
    // #ifndef MP-WEIXIN
    toast('请在微信小程序中开启活动提醒')
    // #endif
  } catch (error) {
    toast(error.message || '开启活动提醒失败')
  } finally {
    subscribing.value = false
  }
}
</script>
<style scoped>
.subscribe-section { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.subscribe-copy { min-width: 0; flex: 1; }
.subscribe-button { flex: 0 0 auto; margin: 0; padding: 0 18px; min-height: 40px; color: #fff; background: #245a4a; border-radius: 6px; font-size: 14px; }
.subscribe-button::after { border: 0; }
.campaign-list { display: grid; gap: 10px; margin: 14px 0 8px; }
.campaign-loading { display: grid; gap: 10px; margin: 14px 0 8px; }
.campaign-loading-row { height: 74px; border-top: 1px solid #e8ece7; background: linear-gradient(100deg, transparent 20%, rgba(226, 232, 225, .72) 38%, transparent 56%); background-size: 300% 100%; animation: campaign-shimmer 1.4s ease-in-out infinite; }
.campaign-error { display: flex; align-items: center; gap: 10px; margin: 14px 0 8px; padding: 12px 0; border-top: 1px solid #e8ece7; }
.campaign-error .small { margin-top: 3px; }
@keyframes campaign-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
.campaign-item { padding: 12px 0; border-top: 1px solid #e8ece7; }
.campaign-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.campaign-title { min-width: 0; color: #263c32; font-size: 15px; font-weight: 600; }
.campaign-type { flex: 0 0 auto; color: #8b6440; font-size: 12px; }
.campaign-content { display: block; margin-top: 6px; color: #68766e; font-size: 13px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; }
.campaign-empty { padding: 16px 0 8px; color: #98a19c; font-size: 13px; }
.campaign-link { margin: 10px 0 0; padding: 0; color: #245a4a; background: transparent; font-size: 13px; text-align: left; line-height: 1.5; }
.campaign-link::after { border: 0; }
.group-qr-retry { width: auto; margin: 8px auto 0; padding: 5px 12px; border: 1px solid #bca16f; border-radius: 5px; color: #e6d1a1; background: transparent; font-size: 12px; line-height: 1.5; }
.group-qr-retry::after { border: 0; }
@media (max-width: 360px) { .subscribe-section { align-items: stretch; flex-direction: column; } .subscribe-button { width: 100%; } }
</style>
