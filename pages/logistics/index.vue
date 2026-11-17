<template>
  <PageShell title="物流详情" footer>
    <view v-if="loading" class="section muted">正在查询物流…</view>
    <EmptyState v-else-if="error" title="物流暂时无法加载" :description="error" button="重新加载" @action="loadDelivery" />
    <template v-else-if="order">
      <view class="logistics-status">
        <AppIcon name="truck" tone="brand" :size="34" />
        <view class="column"><text class="section-title">{{ statusTitle }}</text><text class="muted small">{{ delivery?.company || statusDescription }}</text></view>
      </view>
      <view class="section">
        <view v-if="delivery?.trackingNo" class="logistics-card logistics-number">
          <view class="column"><text class="muted small">物流单号</text><text>{{ delivery.trackingNo }}</text></view>
          <button class="text-button" @click="copyTracking">复制</button>
        </view>
        <view v-if="order.address" class="logistics-card row">
          <AppIcon name="pin" tone="brand" :size="24" />
          <view class="column"><text>{{ order.address.name }}　{{ order.address.phone }}</text><text class="muted small">{{ order.address.region }} {{ order.address.detail }}</text></view>
        </view>
        <view class="logistics-card">
          <text class="strong block logistics-heading">物流进度</text>
          <view v-for="(trace, index) in traces" :key="index" class="logistics-trace" :class="{ latest: index === 0 }">
            <view class="logistics-dot" />
            <text class="block">{{ trace.description }}</text><text class="muted small block">{{ trace.time }}</text>
          </view>
          <text v-if="!traces.length" class="muted small">{{ delivery ? '快递轨迹待更新，可凭物流单号向承运快递查询。' : statusDescription }}</text>
          <text v-if="delivery?.syncError" class="muted small block">{{ delivery.syncError }}</text>
          <text v-if="delivery?.lastSyncedAt" class="muted small block">更新于 {{ delivery.lastSyncedAt }}</text>
        </view>
      </view>
      <view class="bottom-action"><button class="btn btn-outline" @click="go('order-detail', { id })">订单详情</button><button class="btn" @click="contact">联系客服</button></view>
    </template>
    <EmptyState v-else title="暂无物流信息" description="请从配送订单进入物流详情" button="我的订单" @action="go('orders')" />
  </PageShell>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { refreshOrder, loadOrderDelivery } from '../../services/store.js'
import { contact, deliveryStatusLabel, orderStatusLabel, go } from '../../services/navigation.js'

const id = ref('')
const order = ref(null)
const delivery = ref(null)
const loading = ref(false)
const error = ref('')
const statusTitle = computed(() => delivery.value ? deliveryStatusLabel(delivery.value.status) : orderStatusLabel(order.value))
const statusDescription = computed(() => ({
  pending: '订单尚未付款，付款并发货后可查看物流。',
  cancelled: '订单已取消，无需等待发货。',
  refunded: '订单已退款，当前暂无物流信息。',
  complete: '订单已完成，暂无可查询的物流信息。',
}[order.value?.status] || '商家发货后，物流信息将在这里更新。'))
const traces = computed(() => {
  try {
    const value = typeof delivery.value?.lastTrace === 'string' ? JSON.parse(delivery.value.lastTrace) : delivery.value?.lastTrace
    return Array.isArray(value) ? value : []
  } catch { return [] }
})
onLoad(query => { id.value = query.id || ''; loadDelivery() })
async function loadDelivery() {
  if (!id.value || loading.value) return
  loading.value = true
  error.value = ''
  delivery.value = null
  try {
    const fresh = await refreshOrder(id.value)
    order.value = fresh?.fulfillmentMode === 'pickup' ? null : fresh
    if (order.value && !['pending', 'cancelled'].includes(fresh.status)) {
      try { delivery.value = await loadOrderDelivery(id.value) }
      catch (failure) { if (Number(failure.statusCode) !== 404 || !['paid', 'refunded'].includes(fresh.status)) throw failure }
    }
  } catch (failure) {
    error.value = failure.message || '请稍后重试'
  } finally { loading.value = false }
}
function copyTracking() { uni.setClipboardData({ data: delivery.value.trackingNo }) }
</script>
<style scoped>
.logistics-status { display: flex; align-items: center; gap: 16px; padding: 26px 20px; background: #f3e9eb; }
.logistics-status .section-title { margin-bottom: 8px; font-size: 24px; color: #782d3b; }
.logistics-card { padding: 18px 16px; margin-bottom: 14px; background: #fff; border: 1px solid #e9e5e1; border-radius: 12px; font-size: 14px; line-height: 1.8; }
.logistics-number { display: flex; justify-content: space-between; align-items: center; }
.logistics-heading { margin-bottom: 24px; }
.logistics-trace { position: relative; padding: 0 0 28px 24px; margin-left: 6px; border-left: 1px solid #e9e5e1; }
.logistics-trace:last-child { padding-bottom: 0; border-color: transparent; }
.logistics-dot { position: absolute; width: 8px; height: 8px; left: -5px; top: 8px; border-radius: 50%; background: #c9c4be; }
.logistics-trace.latest { color: #782d3b; }
.latest .logistics-dot { width: 10px; height: 10px; left: -6px; background: #782d3b; box-shadow: 0 0 0 4px #f3e9eb; }
</style>
