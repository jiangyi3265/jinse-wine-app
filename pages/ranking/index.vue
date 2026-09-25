<template>
  <PageShell title="销冠排行榜">
    <view class="section">
      <view class="section-heading">
        <view>
          <text class="section-title serif block">本期排行</text>
          <text class="muted small">按分销佣金业绩排名</text>
        </view>
        <button class="text-button small" @click="go('rules', { type: 'ranking' })">
          排行规则 →
        </button>
      </view>
      <view class="rank-list">
        <view v-for="(item, index) in ranks" :key="item.name" class="rank-row">
          <text class="rank-number">0{{ index + 1 }}</text>
          <view class="rank-avatar">{{ item.initial }}</view>
          <text class="grow">{{ item.name }}</text>
          <text class="amount">
            ¥{{
              (item.amount / 100).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })
            }}
          </text>
        </view>
      </view>
      <view class="my-rank">
        <view>
          <text class="small block">我的排名</text>
          <text class="number">08</text>
        </view>
        <view class="promotion-avatar">{{ state.user.name.slice(0, 1) }}</view>
        <text class="grow">{{ state.user.name }}</text>
        <text>¥1,280.00</text>
      </view>
      <view class="section-heading" style="margin-top: 36px">
        <text class="section-title serif">排名奖励</text>
        <button class="text-button muted small" @click="go('rules', { type: 'ranking' })">
          查看奖励规则 →
        </button>
      </view>
      <text class="muted small">积分与补贴以本期规则为准</text>
    </view>
    <image src="/static/design/landscape.jpg" class="rank-landscape" mode="aspectFill" />
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import { ranks } from '../../services/catalog.js'
import { state } from '../../services/store.js'
import { go } from '../../services/navigation.js'
</script>
