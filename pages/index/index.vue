<template>
  <PageShell title="金色酒业" active="index" dark brand left search :back-button="false">
    <view class="hero-home">
      <image class="hero-home-photo" src="/static/design/hero-product.jpg" mode="aspectFill" />
      <button class="city-row" @click="go('stores')">
        <AppIcon name="pin" tone="gold" :size="17" />
        <text>贵港⌄</text>
      </button>
      <view class="hero-copy">
        <text class="hero-title block">金色典藏</text>
        <text class="hero-subtitle block">53度酱香 · 500mL</text>
        <button class="hero-link text-button" @click="go('product', { id: 'classic' })">
          探索佳酿
          <AppIcon name="arrow" tone="gold" :size="21" />
        </button>
      </view>
      <view class="hero-dots">
        01 / 03
        <view class="hero-dots-line"><view /></view>
      </view>
    </view>
    <view class="quick-links">
      <button
        v-for="entry in entries"
        :key="entry.route"
        class="quick-link"
        @click="go(entry.route)"
      >
        <AppIcon :name="entry.icon" :size="29" />
        <text>{{ entry.name }}</text>
      </button>
    </view>
    <view class="section">
      <button class="coupon-banner" @click="go('campaign')">
        <AppIcon name="coupon" :size="34" tone="gold" />
        <view class="grow">
          <text class="coupon-banner-title block">节日领券</text>
          <text class="muted">领券享优惠　佳酿更尽兴</text>
        </view>
        <AppIcon name="chevron" :size="21" />
      </button>
      <view class="section-heading">
        <text class="section-title serif">精选好酒</text>
        <button class="text-button muted" @click="go('shop')">
          全部
          <AppIcon name="arrow" :size="16" />
        </button>
      </view>
      <view
        class="feature-product"
        role="button"
        aria-label="典藏酱香"
        @click="go('product', { id: 'classic' })"
      >
        <image src="/static/design/product-classic.jpg" mode="aspectFit" />
        <view class="column">
          <text class="serif">典藏酱香</text>
          <text class="muted">53度 500mL</text>
          <PriceTag :value="39800" :original="49800" />
        </view>
      </view>
      <button class="video-banner" @click="go('service', { type: 'channels' })">
        <AppIcon name="play" tone="light" :size="28" />
        <text>视频号精选</text>
        <AppIcon name="arrow" tone="light" :size="20" />
        <image src="/static/design/detail-landscape.jpg" mode="aspectFill" />
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import { go } from '../../services/navigation.js'
const entries = [
  { name: '扫码有礼', icon: 'scan', route: 'scan' },
  { name: '兑换网点', icon: 'shop', route: 'stores' },
  { name: '积分专区', icon: 'coin', route: 'points' },
  { name: 'VIP社群', icon: 'users', route: 'vip' },
]
</script>
