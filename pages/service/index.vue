<template>
  <PageShell :title="title">
    <view class="section">
      <view v-if="loadError" class="service-error notice">
        <AppIcon name="info" :size="18" />
        <text class="grow">{{ loadError }}</text>
        <button class="text-button" @click="loadService">重试</button>
      </view>
      <view class="service-intro">
        <AppIcon
          :name="type === 'channels' ? 'play' : type === 'official' ? 'wechat' : 'headset'"
          :size="52"
          tone="gold"
        />
        <text class="section-title serif">{{ title }}</text>
        <text class="muted">
          {{
            type === 'customer' ? '为您解答商品、订单与活动问题' : '查看金色酒业品牌内容与活动消息'
          }}
        </text>
      </view>
      <template v-if="type === 'official'">
        <QrCode :src="serviceData.officialQr" />
        <text class="center block muted">
          {{ loading ? '正在确认公众号二维码' : loadError || (serviceData.officialQr ? '长按识别，查看公众号' : '公众号二维码待配置') }}
        </text>
      </template>
      <template v-else-if="type === 'channels'">
        <button class="btn" :disabled="loading || !!loadError || !serviceData.finderUserName" @click="openChannels">打开视频号主页与橱窗</button>
        <button v-if="serviceData.finderUserName && serviceData.videoLiveFeedId" class="btn channel-action" @click="openLive">进入视频号直播</button>
        <button v-if="serviceData.finderUserName && serviceData.videoFeedId && serviceData.videoNonceId" class="btn channel-action" @click="openVideo">观看短视频</button>
        <text v-if="!loading && !loadError && !serviceData.finderUserName" class="center block muted channel-note">视频号主页尚未配置</text>
        <text v-else-if="!loading && !loadError && !serviceData.videoLiveFeedId && !serviceData.videoFeedId" class="center block muted channel-note">直播与短视频入口尚未配置</text>
      </template>
      <template v-else>
        <!-- #ifdef MP-WEIXIN -->
        <button class="btn" open-type="contact">联系在线客服</button>
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <button class="btn" @click="toast('请在微信小程序中使用在线客服')">联系在线客服</button>
        <!-- #endif -->
        <view class="customer-qr">
          <QrCode v-if="serviceData.customerServiceQr" :src="serviceData.customerServiceQr" />
          <text class="center block muted">{{ loading ? '正在确认客服二维码' : loadError || (serviceData.customerServiceQr ? '长按识别客服二维码' : '客服二维码待配置') }}</text>
        </view>
        <button class="link-row section-space" @click="go('orders')">
          <text class="grow">查询我的订单</text>
          <AppIcon name="chevron" :size="17" />
        </button>
        <button class="link-row" @click="go('stores')">
          <text class="grow">联系附近门店</text>
          <AppIcon name="chevron" :size="17" />
        </button>
        <button class="link-row" @click="go('rules', { type: 'coupon' })">
          <text class="grow">优惠券使用帮助</text>
          <AppIcon name="chevron" :size="17" />
        </button>
        <button class="link-row" @click="go('records', { type: 'cash' })">
          <text class="grow">查看红包领取记录</text>
          <AppIcon name="chevron" :size="17" />
        </button>
      </template>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import { config, isApiMode, mediaUrl } from '../../services/config.js'
import { get } from '../../services/api.js'
import { go, toast } from '../../services/navigation.js'
const type = ref('customer')
const serviceData = ref({})
const loading = ref(false)
const loadError = ref('')
onLoad((q) => {
  type.value = q.type || 'customer'
})
async function loadService() {
  if (loading.value) return
  serviceData.value = {}
  loadError.value = ''
  if (!isApiMode()) {
    serviceData.value = {
      officialQr: config.officialAccountQr, customerServiceQr: config.customerServiceQr,
      finderUserName: config.finderUserName, videoLiveFeedId: config.videoLiveFeedId,
      videoLiveNonceId: config.videoLiveNonceId, videoFeedId: config.videoFeedId,
      videoNonceId: config.videoNonceId,
    }
    return
  }
  loading.value = true
  try {
    if (type.value === 'official') {
      const brand = await get('/mini/brand') || {}
      serviceData.value = { officialQr: mediaUrl(brand.officialAccountQr || '') }
    } else {
      const channels = await get('/mini/channel') || {}
      serviceData.value = {
        customerServiceQr: mediaUrl(channels['wechat.customer.serviceQr'] || ''),
        finderUserName: channels['wechat.video.finderUserName'] || '',
        videoLiveFeedId: channels['wechat.video.liveFeedId'] || '',
        videoLiveNonceId: channels['wechat.video.liveNonceId'] || '',
        videoFeedId: channels['wechat.video.feedId'] || '',
        videoNonceId: channels['wechat.video.nonceId'] || '',
      }
    }
  } catch (error) { loadError.value = error.message || '服务资料暂时无法加载' }
  finally { loading.value = false }
}
onShow(loadService)
const title = computed(() =>
  type.value === 'official' ? '品牌公众号' : type.value === 'channels' ? '品牌视频号' : '在线客服',
)
function openChannels() {
  if (!serviceData.value.finderUserName) return toast('品牌视频号尚未配置')
  // #ifdef MP-WEIXIN
  wx.openChannelsUserProfile({
    finderUserName: serviceData.value.finderUserName,
    fail: () => toast('暂时无法打开视频号，请稍后重试'),
  })
  // #endif
  // #ifdef H5
  toast('请在微信小程序中查看视频号')
  // #endif
}
function openLive() {
  if (!serviceData.value.finderUserName || !serviceData.value.videoLiveFeedId) return toast('视频号直播信息尚未配置')
  // #ifdef MP-WEIXIN
  wx.openChannelsLive({
    finderUserName: serviceData.value.finderUserName,
    feedId: serviceData.value.videoLiveFeedId,
    nonceId: serviceData.value.videoLiveNonceId || undefined,
    fail: () => toast('暂时无法打开视频号直播，请检查视频号配置'),
  })
  // #endif
  // #ifdef H5
  toast('请在微信小程序中查看视频号直播')
  // #endif
}
function openVideo() {
  if (!serviceData.value.finderUserName || !serviceData.value.videoFeedId || !serviceData.value.videoNonceId) return toast('短视频信息尚未配置')
  // #ifdef MP-WEIXIN
  wx.openChannelsActivity({
    finderUserName: serviceData.value.finderUserName,
    feedId: serviceData.value.videoFeedId,
    nonceId: serviceData.value.videoNonceId,
    fail: () => toast('暂时无法打开短视频，请检查视频号配置'),
  })
  // #endif
  // #ifdef H5
  toast('请在微信小程序中查看视频号短视频')
  // #endif
}
</script>
<style scoped>
.channel-action { margin-top: 10px; }
.channel-note { margin-top: 14px; }
.customer-qr { display: flex; flex-direction: column; align-items: center; margin: 18px 0 6px; }
.service-error { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 12px; font-size: 13px; }
.service-error .text-button { flex: 0 0 auto; }
.btn:disabled { box-shadow: none; }
</style>
