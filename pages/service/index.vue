<template>
  <PageShell :title="title">
    <view class="section">
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
        <QrCode :src="config.officialAccountQr" />
        <text class="center block muted">
          {{ config.officialAccountQr ? '长按识别，查看公众号' : '公众号二维码待配置' }}
        </text>
      </template>
      <button v-else-if="type === 'channels'" class="btn" @click="openChannels">
        打开视频号主页
      </button>
      <template v-else>
        <!-- #ifdef MP-WEIXIN -->
        <button class="btn" open-type="contact">联系在线客服</button>
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <button class="btn" @click="toast('请在微信小程序中使用在线客服')">联系在线客服</button>
        <!-- #endif -->
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
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import { config } from '../../services/config.js'
import { go, toast } from '../../services/navigation.js'
const type = ref('customer')
onLoad((q) => {
  type.value = q.type || 'customer'
})
const title = computed(() =>
  type.value === 'official' ? '品牌公众号' : type.value === 'channels' ? '品牌视频号' : '在线客服',
)
function openChannels() {
  if (!config.finderUserName) return toast('品牌视频号尚未配置')
  // #ifdef MP-WEIXIN
  wx.openChannelsUserProfile({
    finderUserName: config.finderUserName,
    fail: () => toast('暂时无法打开视频号，请稍后重试'),
  })
  // #endif
  // #ifdef H5
  toast('请在微信小程序中查看视频号')
  // #endif
}
</script>
