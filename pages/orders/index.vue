<template>
  <PageShell title="我的订单">
    <view class="filter-tabs" style="gap: 5px">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="filter-tab"
        :class="{ active: tab === item.id }"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </view>
    <view class="section">
      <view v-for="order in filtered" :key="order.id" class="order-card">
        <view class="between">
          <text class="small">订单尾号 {{ order.id.slice(-4) }}</text>
          <text class="ink">{{ statusLabels[order.status] }}</text>
        </view>
        <view class="order-product" @click="go('order-detail', { id: order.id })">
          <image :src="getProduct(order.productId)?.image" class="order-photo" mode="aspectFill" />
          <view class="grow">
            <text class="strong block">{{ getProduct(order.productId)?.name }}</text>
            <text class="muted small">
              {{ getProduct(order.productId)?.spec }} × {{ order.quantity }}
            </text>
            <view class="section-space strong" style="font-size: 23px">
              ¥{{ money(order.total, true) }}
            </view>
          </view>
        </view>
        <view class="order-card-actions">
          <button v-if="order.status === 'pending'" class="btn btn-outline" @click="cancel(order)">
            取消订单
          </button>
          <button
            :class="['btn', order.status === 'pending' ? '' : 'btn-outline']"
            @click="go('order-detail', { id: order.id })"
          >
            {{ order.status === 'pending' ? '去支付' : '查看详情' }}
          </button>
        </view>
      </view>
      <EmptyState
        v-if="!filtered.length"
        title="暂无相关订单"
        description="精选佳酿，等您品鉴"
        button="去商城逛逛"
        @action="go('shop')"
      />
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, setOrderStatus } from '../../services/store.js'
import { getProduct } from '../../services/catalog.js'
import { money } from '../../services/pricing.js'
import { go, statusLabels, confirm, run } from '../../services/navigation.js'
const tab = ref('all')
onLoad((q) => {
  tab.value = q.status || 'all'
})
const tabs = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待付款' },
  { id: 'shipping', label: '待发货' },
  { id: 'receiving', label: '待收货' },
  { id: 'complete', label: '已完成' },
]
const filtered = computed(() =>
  state.orders.filter((o) => tab.value === 'all' || o.status === tab.value),
)
async function cancel(order) {
  if (await confirm('取消订单', '确定取消此订单吗？未使用的优惠券会退回。', '取消订单'))
    run(() => setOrderStatus(order.id, 'cancelled'))
}
</script>
