<template>
  <PageShell title="推广中心" dark active="promotion" :back-button="false">
    <view class="promotion-hero">
      <view class="row">
        <view class="promotion-avatar">{{ state.user.name.slice(0, 1) }}</view>
        <view class="grow column">
          <text>{{ state.user.name }}</text>
          <text class="member-badge">♔ 客户推广员</text>
        </view>
        <button class="text-button small" @click="go('rules', { type: 'promotion' })">
          推广规则 →
        </button>
      </view>
      <view class="promotion-total">
        <text class="promotion-total-label">累计佣金</text>
        <view class="promotion-money">
          <text class="currency">¥</text>
          1,280.00
        </view>
      </view>
      <view class="promotion-splits">
        <view>
          <text class="small block">待结算</text>
          <text class="serif">¥320.00</text>
        </view>
        <view>
          <text class="small block">已结算</text>
          <text class="serif">¥960.00</text>
        </view>
      </view>
    </view>
    <view class="promotion-content">
      <button class="btn" @click="go('poster')">
        生成推广海报
        <AppIcon name="export" tone="light" :size="22" />
      </button>
      <button class="link-row" @click="go('team')">
        <view class="grow">
          <AppIcon name="users" />
          我的团队
        </view>
        <text class="muted small">12人</text>
        <AppIcon name="chevron" :size="17" />
      </button>
      <button class="link-row" @click="go('ranking')">
        <view class="grow">
          <AppIcon name="trophy" />
          销冠排行榜
        </view>
        <AppIcon name="chevron" :size="17" />
      </button>
      <view class="section-heading section-space">
        <text class="section-title serif">佣金明细</text>
        <text class="muted small">订单核销后计入佣金</text>
      </view>
      <button
        v-for="(p, index) in products.slice(0, 2)"
        :key="p.id"
        class="commission-row"
        style="width: 100%; text-align: left"
        @click="go('records', { type: 'commission' })"
      >
        <image :src="p.image" mode="aspectFill" />
        <view class="grow">
          <text class="strong block">{{ p.name }}</text>
          <text class="small muted">{{ p.spec }}</text>
        </view>
        <text :class="['badge', index ? 'badge-gold' : 'badge-green']">
          {{ index ? '待核销' : '已核销' }}
        </text>
        <text class="amount">{{ index ? '待计佣' : '+¥39.80' }}</text>
        <AppIcon name="chevron" :size="15" />
      </button>
      <text class="profile-demo">演示推广业绩，实际佣金以服务端结算为准</text>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { state } from '../../services/store.js'
import { products } from '../../services/catalog.js'
import { go } from '../../services/navigation.js'
</script>
