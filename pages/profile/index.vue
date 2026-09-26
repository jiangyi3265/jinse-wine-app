<template>
  <PageShell title="我的" dark brand left active="profile" :back-button="false">
    <view class="profile-hero">
      <button class="row" style="text-align: left" @click="go('profile-edit')">
        <image :src="displayValue(state.user.avatar, assetUrl('/static/design/avatar.jpg', 'brand.avatar'))" class="profile-avatar" mode="aspectFill" />
        <view class="column">
          <text class="profile-name">{{ state.user.name }}</text>
          <text class="member-badge">VIP会员　›</text>
        </view>
      </button>
      <text class="profile-slogan">品味时光 · 金色相伴</text>
      <view class="profile-stats">
        <button class="profile-stat" @click="go('points')">
          <text class="number">{{ state.points.toLocaleString() }}</text>
          <text class="label">积分</text>
        </button>
        <button class="profile-stat" @click="go('my-coupons')">
          <text class="number">{{ unused }}</text>
          <text class="label">优惠券</text>
        </button>
        <button class="profile-stat" @click="go('awards')">
          <text class="number">{{ state.awards.length }}</text>
          <text class="label">我的奖品</text>
        </button>
      </view>
    </view>
    <view class="profile-content">
      <view class="section-heading">
        <text class="section-title serif">我的订单</text>
        <button class="text-button muted" @click="go('orders')">
          全部
          <AppIcon name="arrow" :size="18" />
        </button>
      </view>
      <view class="order-shortcuts">
        <button
          v-for="item in orderLinks"
          :key="item.status"
          @click="go('orders', { status: item.status })"
        >
          <AppIcon :name="item.icon" :size="29" />
          <text>{{ item.name }}</text>
        </button>
      </view>
      <button class="vip-banner" @click="go('vip')">
        <view>
          <text class="serif block">VIP社群</text>
          <text class="small">与知味之人，共赴佳酿之约</text>
        </view>
        <text class="small">查看会员活动 →</text>
      </button>
      <button
        v-for="item in entries"
        :key="item.name"
        class="link-row"
        @click="go(item.route, item.query || {})"
      >
        <view class="grow">
          <AppIcon :name="item.icon" :size="20" />
          <text>{{ item.name }}</text>
        </view>
        <AppIcon name="chevron" :size="16" />
      </button>
      <button v-if="state.user.role === 'staff'" class="link-row" @click="go('verification')">
        <view class="grow">
          <AppIcon name="bag" :size="20" />
          <text>门店核销</text>
        </view>
        <AppIcon name="chevron" :size="16" />
      </button>
      <text class="profile-demo">{{ state.user.name === '微信用户' ? '请登录后查看完整会员权益' : '商品及权益以服务端数据为准' }}</text>
    </view>
  </PageShell>
</template>
<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { state, refreshDomain } from '../../services/store.js'
import { go, toast } from '../../services/navigation.js'
import { displayValue, assetUrl } from '../../services/config.js'
const unused = computed(
  () => state.coupons.filter((c) => c.status === 'unused' && c.expiresAt > Date.now()).length,
)
onShow(async () => {
  try { await Promise.all([refreshDomain('user'), refreshDomain('points'), refreshDomain('coupons'), refreshDomain('awards'), refreshDomain('orders')]) }
  catch (error) { toast(error.message) }
})
const orderLinks = [
  { status: 'pending', icon: 'wallet', name: '待付款' },
  { status: 'shipping', icon: 'truck', name: '待发货' },
  { status: 'receiving', icon: 'box', name: '待收货' },
  { status: 'complete', icon: 'order', name: '已完成' },
]
const entries = [
  {
    name: '抽奖记录',
    route: 'records',
    query: { type: 'draw' },
    icon: 'gift',
  },
  { name: '推广中心', route: 'promotion', icon: 'navigation' },
  { name: '兑换网点', route: 'stores', icon: 'pin' },
  { name: '收货地址', route: 'addresses', icon: 'box' },
  { name: '在线客服', route: 'service', icon: 'headset' },
]
</script>
