<template>
  <view class="page-shell" :class="[{ 'with-tabs': active, 'with-footer': footer }, pageClass]">
    <view class="app-header" :class="{ 'header-dark': dark }">
      <view class="status-bar" :style="{ height: statusHeight + 'px' }">
        <!-- #ifdef H5 -->
        <text>9:41</text>
        <view class="status-symbols">
          <view class="signal">
            <view />
            <view />
            <view />
            <view />
          </view>
          <view class="wifi" />
          <view class="battery"><view /></view>
        </view>
        <!-- #endif -->
      </view>
      <view class="navigation-bar" :style="{ height: navigationHeight + 'px' }">
        <button v-if="backButton" class="icon-button back-button" aria-label="返回" @click="back">
          <AppIcon name="back" :size="25" :tone="dark ? 'light' : 'ink'" />
        </button>
        <text class="nav-title" :class="{ 'nav-brand': brand, 'nav-left': left }">{{ title }}</text>
        <button
          v-if="search"
          class="icon-button nav-search"
          aria-label="搜索商品"
          @click="go('shop')"
        >
          <AppIcon name="search" :tone="dark ? 'light' : 'ink'" />
        </button>
        <!-- #ifdef H5 -->
        <view class="wechat-capsule" aria-hidden="true">
          <text class="capsule-dots">•••</text>
          <view class="capsule-divider" />
          <view class="capsule-ring"><view /></view>
        </view>
        <!-- #endif -->
      </view>
    </view>
    <slot />
    <view v-if="active" class="tab-bar">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="tab-item"
        :class="{ selected: active === item.id }"
        :aria-label="item.label"
        @click="go(item.id)"
      >
        <view class="tab-icon" :class="{ 'tab-icon-active': active === item.id }">
          <AppIcon :name="item.icon" :tone="active === item.id ? 'ink' : 'muted'" :size="24" />
        </view>
        <text>{{ item.label }}</text>
      </button>
    </view>
  </view>
</template>
<script setup>
import AppIcon from './AppIcon.vue'
import { back, go } from '../services/navigation.js'
defineProps({
  title: String,
  active: String,
  pageClass: String,
  dark: Boolean,
  brand: Boolean,
  left: Boolean,
  search: Boolean,
  footer: Boolean,
  backButton: { type: Boolean, default: true },
})
let statusHeight = 30,
  navigationHeight = 60
// #ifdef MP-WEIXIN
const info = uni.getSystemInfoSync()
statusHeight = info.statusBarHeight || 20
const capsule = uni.getMenuButtonBoundingClientRect()
navigationHeight = (capsule.top - statusHeight) * 2 + capsule.height
// #endif
const tabs = [
  { id: 'index', label: '首页', icon: 'home' },
  { id: 'shop', label: '商城', icon: 'bag' },
  { id: 'scan', label: '扫码', icon: 'scan' },
  { id: 'promotion', label: '推广', icon: 'share' },
  { id: 'profile', label: '我的', icon: 'user' },
]
</script>
