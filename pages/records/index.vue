<template>
  <PageShell :title="title">
    <view class="section">
      <view v-if="type === 'points'" class="section-heading">
        <text class="section-title serif">可用积分 {{ state.points.toLocaleString() }}</text>
      </view>
      <button
        v-for="item in records"
        :key="item.id"
        class="record-row"
        style="width: 100%; text-align: left"
        @click="open(item)"
      >
        <view class="record-icon">
          <AppIcon :name="type === 'points' ? 'coin' : type === 'cash' ? 'wallet' : 'gift'" />
        </view>
        <view class="grow">
          <text class="strong block">{{ item.title || item.name }}</text>
          <text class="small muted">{{ dateLabel(item.createdAt) }}</text>
          <text
            v-if="type === 'cash'"
            class="small block"
            :class="item.status === 'pending' ? 'gold' : 'ink'"
          >
            {{ item.status === 'pending' ? '待领取' : '到账状态以服务端为准' }}
          </text>
        </view>
        <text class="record-value" :class="item.change > 0 ? 'ink' : ''">
          {{
            item.value ||
            (type === 'points'
              ? `${item.change > 0 ? '+' : ''}${item.change}`
              : type === 'cash'
                ? `¥${money(item.amount, true)}`
                : '已核销')
          }}
        </text>
        <AppIcon v-if="type === 'cash' || item.kind === 'cash'" name="chevron" :size="17" />
      </button>
      <EmptyState
        v-if="!records.length"
        title="暂无记录"
        description="您的记录将在这里显示"
        icon="order"
      />
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, refreshDomain } from '../../services/store.js'
import { isApiMode } from '../../services/config.js'
import { money } from '../../services/pricing.js'
import { go, dateLabel, toast } from '../../services/navigation.js'
const type = ref('draw')
onLoad((q) => {
  type.value = q.type || 'draw'
})
onShow(() => {
  if (!isApiMode()) return
  const domain = type.value === 'points' ? 'pointRecords' : type.value === 'commission' ? 'promotion' : type.value === 'cash' ? 'redPackets' : null
  if (domain) refreshDomain(domain).catch((error) => toast(error.message))
})
const title = computed(
  () =>
    ({
      draw: '抽奖记录',
      cash: '红包领取记录',
      points: '积分明细',
      verification: '核销记录',
      commission: '佣金明细',
    })[type.value] || '我的记录',
)
const records = computed(() =>
  type.value === 'cash'
    ? state.redPackets.map((p) => ({ ...p, title: '现金红包' }))
    : type.value === 'points'
      ? state.pointRecords
      : type.value === 'verification'
        ? state.verificationRecords
        : type.value === 'commission'
        ? isApiMode()
          ? state.promotion?.records || []
          : [
              {
                id: 'commission-1',
                title: '典藏酱香 · 已核销',
                value: '+¥39.80',
                createdAt: Date.now(),
              },
              {
                id: 'commission-2',
                title: '双瓶礼盒 · 待核销',
                value: '待计佣',
                createdAt: Date.now(),
              },
            ]
          : state.drawRecords,
)
function open(item) {
  if (type.value === 'cash') go('redpacket', { id: item.id })
  else if (item.kind === 'cash') go('redpacket', { id: item.rewardId })
  else if (item.kind === 'points') go('points')
  else if (item.kind === 'coupon') go('my-coupons')
  else if (item.kind === 'goods') go('awards')
}
</script>
