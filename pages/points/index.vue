<template>
  <PageShell title="积分兑换">
    <view class="points-hero">
      <image src="/static/design/detail-scene-clean.jpg" mode="aspectFill" />
      <view class="points-info">
        <text class="block small">可用积分 ›</text>
        <text class="points-balance">{{ state.points.toLocaleString() }}</text>
      </view>
      <button class="points-detail-link text-button" @click="go('records', { type: 'points' })">
        积分明细
        <AppIcon name="arrow" tone="light" :size="17" />
      </button>
    </view>
    <view class="exchange-tabs">
      <view class="filter-tabs">
        <button
          v-for="item in ['全部', '优惠券', '实物']"
          :key="item"
          class="filter-tab"
          :class="{ active: tab === item }"
          @click="tab = item"
        >
          {{ item }}
        </button>
      </view>
    </view>
    <view class="section">
      <view v-for="item in filtered" :key="item.id" class="exchange-item">
        <image :src="item.image" class="exchange-image" mode="aspectFill" />
        <view class="grow">
          <text class="exchange-name block">{{ item.name }}</text>
          <text class="exchange-points">
            {{ item.points }}
            <text style="font-size: 15px">积分</text>
          </text>
        </view>
        <button
          class="btn btn-small"
          :disabled="busy === item.id || !state.exchangeStock[item.id]"
          @click="exchange(item)"
        >
          {{ state.exchangeStock[item.id] ? '兑换' : '已兑完' }}
        </button>
      </view>
      <view class="notice section-space">
        <AppIcon name="info" :size="19" />
        <text>兑换后可在我的优惠券或我的奖品中查看。</text>
      </view>
      <view class="center section-space">
        <button class="text-button" @click="go('rules', { type: 'points' })">
          积分规则
          <AppIcon name="arrow" :size="18" />
        </button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { exchangeProducts } from '../../services/catalog.js'
import { state, exchangeReward } from '../../services/store.js'
import { go, toast, confirm } from '../../services/navigation.js'
const tab = ref('全部'),
  busy = ref(''),
  filtered = computed(() =>
    exchangeProducts.filter(
      (p) => tab.value === '全部' || p.kind === (tab.value === '优惠券' ? 'coupon' : 'goods'),
    ),
  )
async function exchange(item) {
  if (busy.value) return
  if (state.points < item.points) return toast('积分不足，暂时无法兑换')
  busy.value = item.id
  try {
    if (
      !(await confirm(
        '确认兑换',
        `使用${item.points}积分兑换${item.name}？本次使用演示积分。`,
        '确认兑换',
      ))
    )
      return
    const kind = exchangeReward(item.id)
    if (
      await confirm(
        '兑换成功',
        kind === 'coupon' ? '代金券已放入我的优惠券。' : '奖品已放入我的奖品，可查看兑换码。',
        '立即查看',
      )
    )
      go(kind === 'coupon' ? 'my-coupons' : 'awards')
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = ''
  }
}
</script>
