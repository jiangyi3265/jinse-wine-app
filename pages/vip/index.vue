<template>
  <PageShell title="VIP社群">
    <view class="vip-card">
      <view class="vip-card-inner">
        <text class="vip-brand block">金色酒业</text>
        <text class="small" style="letter-spacing: 5px">酿造美好生活</text>
        <text class="vip-title block">VIP社群</text>
        <text style="letter-spacing: 3px">以酒会友 · 臻享不凡</text>
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
        <QrCode :src="config.groupQr" />
        <text class="small block">
          {{ config.groupQr ? '长按识别二维码进群' : '社群二维码待配置' }}
        </text>
      </view>
    </view>
    <view class="section">
      <text class="section-title serif">社群动态</text>
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
import { config } from '../../services/config.js'
import { go, contact } from '../../services/navigation.js'
</script>
