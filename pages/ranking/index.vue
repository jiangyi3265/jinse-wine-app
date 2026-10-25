<template>
  <PageShell title="销冠排行榜" pageClass="rank-page">
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
        <view v-for="(item, index) in ranking" :key="item.id || item.name" class="rank-row">
          <text class="rank-number">0{{ index + 1 }}</text>
          <view class="rank-avatar">{{ item.initial || (item.name || '').slice(0, 1) }}</view>
          <text class="grow">{{ item.name }}</text>
          <text class="amount">
            ¥{{
              ((item.amount || item.commission || 0) / 100).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })
            }}
          </text>
        </view>
      </view>
      <EmptyState
        v-if="!loading && !ranking.length"
        :title="loadError ? '排行榜暂时无法加载' : '本期暂无排行数据'"
        :description="loadError || '完成有效推广订单后，佣金业绩会进入本期排行榜'"
        :button="loadError ? '重新加载' : '去推广'"
        icon="crown"
        @action="loadError ? loadRanking() : go('promotion')"
      />
      <view class="my-rank">
        <view>
          <text class="small block">我的排名</text>
          <text class="number">{{ myRank.rank || '—' }}</text>
        </view>
        <view class="promotion-avatar">{{ state.user.name.slice(0, 1) }}</view>
        <text class="grow">{{ state.user.name }}</text>
        <text>¥{{ ((myRank.amount || 0) / 100).toFixed(2) }}</text>
      </view>
      <view class="section-heading" style="margin-top: 36px">
        <text class="section-title serif">排名奖励</text>
        <button class="text-button muted small" @click="go('rules', { type: 'ranking' })">
          查看奖励规则 →
        </button>
      </view>
      <text class="muted small">积分与补贴以本期规则为准</text>
    </view>
    <image :src="assetUrl('/static/design/landscape.jpg', 'brand.ranking')" class="rank-landscape" mode="aspectFill" />
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import EmptyState from '../../components/EmptyState.vue'
import { ranks } from '../../services/catalog.js'
import { state, refreshDomain } from '../../services/store.js'
import { go, toast } from '../../services/navigation.js'
import { isApiMode, assetUrl } from '../../services/config.js'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
const ranking = computed(() => isApiMode() ? state.ranking : ranks)
const myRank = computed(() => state.rankingMe || {})
const loading = ref(false), loadError = ref('')
async function loadRanking() {
  if (!isApiMode()) return
  loading.value = true
  loadError.value = ''
  try { await refreshDomain('ranking') }
  catch (error) { loadError.value = error.message || '排行榜暂时无法获取，请稍后重试'; toast(loadError.value) }
  finally { loading.value = false }
}
onShow(loadRanking)
</script>
