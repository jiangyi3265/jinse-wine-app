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
          {{ (total / 100).toFixed(2) }}
        </view>
      </view>
      <view class="promotion-splits">
        <view>
          <text class="small block">待结算</text>
          <text class="serif">¥{{ (pending / 100).toFixed(2) }}</text>
        </view>
        <view>
          <text class="small block">已结算</text>
          <text class="serif">¥{{ (settled / 100).toFixed(2) }}</text>
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
        <text class="muted small">{{ teamCount }}人</text>
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
        v-for="(p, index) in commissionItems"
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
          <text :class="['badge', p.status === 'settled' ? 'badge-green' : 'badge-gold']">
          {{ p.status === 'settled' ? '已核销' : '待核销' }}
        </text>
        <text class="amount">{{ p.status === 'settled' ? `+¥${(p.amount / 100).toFixed(2)}` : '待计佣' }}</text>
        <AppIcon name="chevron" :size="15" />
      </button>
      <text class="profile-demo">{{ isApiMode() ? '实际佣金以服务端结算为准' : '演示推广业绩，实际佣金以服务端结算为准' }}</text>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { state, refreshDomain } from '../../services/store.js'
import { products, loadCatalog } from '../../services/catalog.js'
import { go, toast } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
const total = computed(() => state.promotion?.total || 0)
const pending = computed(() => state.promotion?.pending || 0)
const settled = computed(() => state.promotion?.settled || 0)
const teamCount = computed(() => state.promotion?.teamCount || 0)
const commissionItems = computed(() => state.promotion?.records?.length
  ? state.promotion.records
  : isApiMode() ? [] : products.slice(0, 2).map((product, index) => ({
      ...product, status: index ? 'pending' : 'settled', amount: index ? 0 : 3980,
    })))
onShow(async () => {
  try { await loadCatalog(); if (isApiMode()) await refreshDomain('promotion') }
  catch (error) { toast(error.message) }
})
</script>
