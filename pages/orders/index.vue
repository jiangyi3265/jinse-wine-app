<template>
  <PageShell title="我的订单">
    <view class="filter-tabs order-filter-tabs">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="filter-tab"
        :class="{ active: tab === item.id }"
        @click="chooseTab(item.id)"
      >
        {{ item.label }}
      </button>
    </view>
    <view class="section">
      <view v-if="loading" class="orders-skeleton" aria-label="正在加载订单">
        <view v-for="item in 3" :key="item" class="skeleton-order">
          <view class="skeleton-line short" />
          <view class="skeleton-product"><view class="skeleton-photo" /><view class="skeleton-copy"><view class="skeleton-line" /><view class="skeleton-line narrow" /><view class="skeleton-line price" /></view></view>
        </view>
      </view>
      <view v-for="order in visibleOrders" :key="order.id" class="order-card">
        <view class="between">
          <text class="small">订单尾号 {{ order.id.slice(-4) }}</text>
          <text class="ink">{{ orderStatusLabel(order) }}</text>
        </view>
        <view class="order-product" @click="go('order-detail', { id: order.id })">
          <image :src="productImage(firstItem(order)?.image || getProduct(order.productId)?.image)" class="order-photo" mode="aspectFill" @error="orderImageError" />
          <view class="grow">
            <text class="strong block">{{ firstItem(order)?.name || getProduct(order.productId)?.name }}</text>
            <text class="muted small">
              {{ firstItem(order)?.spec || getProduct(order.productId)?.spec }} × {{ firstItem(order)?.quantity || order.quantity }}<text v-if="order.items?.length > 1"> 等{{ order.items.length }}种商品</text>
            </text>
            <view class="section-space strong" style="font-size: 23px">
              ¥{{ money(order.total, true) }}
            </view>
          </view>
        </view>
        <view class="order-card-actions">
          <button v-if="order.status === 'pending'" class="btn btn-outline" :disabled="!!cancellingId" @click="cancel(order)">
            {{ cancellingId === order.id ? '正在取消…' : '取消订单' }}
          </button>
          <button
            :class="['btn', order.status === 'pending' ? '' : 'btn-outline']"
            @click="go('order-detail', { id: order.id })"
          >
            {{ order.status === 'pending' ? order.paymentAwaiting ? '查询支付' : '去支付' : '查看详情' }}
          </button>
        </view>
      </view>
      <EmptyState
        v-if="!loading && !visibleOrders.length"
        :title="loadError ? '订单暂时无法加载' : '暂无相关订单'"
        :description="loadError || '精选佳酿，等您品鉴'"
        :button="loadError ? '重新加载' : '去商城逛逛'"
        @action="loadError ? loadOrders() : go('shop')"
      />
      <ListPagination v-if="!loadError" :total="total" :page-num="pageNum" :page-size="pageSize" :loading="loading || !!cancellingId" @change="loadOrders" />
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import EmptyState from '../../components/EmptyState.vue'
import ListPagination from '../../components/ListPagination.vue'
import { state, setOrderStatus } from '../../services/store.js'
import { useMemberList } from '../../services/member-list.js'
import { defaultProductImage, productImage } from '../../services/product-media.js'
import { getProduct } from '../../services/catalog.js'
import { money } from '../../services/pricing.js'
import { go, orderStatusLabel, confirm, toast } from '../../services/navigation.js'
const tab = ref('all'), cancellingId = ref('')
const { rows, total, pageNum, pageSize, loading, loadError, load: loadOrders } = useMemberList('orders', {
  filters: () => ({ status: tab.value }),
  demoRows: () => state.orders.filter(o => tab.value === 'all' || (['shipping', 'receiving'].includes(tab.value)
    ? ['shipping', 'receiving'].includes(o.status) : o.status === tab.value)),
})
onLoad((q) => {
  tab.value = tabs.some(item => item.id === q.status) ? q.status : 'all'
})
onShow(() => loadOrders())
function chooseTab(value) { tab.value = value; loadOrders(1) }
const tabs = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待付款' },
  { id: 'paid', label: '待发货' },
  { id: 'receiving', label: '待收货' },
  { id: 'complete', label: '已完成' },
  { id: 'cancelled', label: '已取消' },
  { id: 'refunded', label: '已退款' },
]
const visibleOrders = computed(() => loading.value || loadError.value ? [] : rows.value)
function firstItem(order) { return order.items?.[0] }
function orderImageError(event) { if (event?.target) event.target.src = defaultProductImage() }
async function cancel(order) {
  if (cancellingId.value || order.status !== 'pending') return
  cancellingId.value = order.id
  try {
    if (!(await confirm('取消订单', '确定取消此订单吗？未使用的优惠券会退回。', '取消订单'))) return
    await setOrderStatus(order.id, 'cancelled')
    toast('订单已取消')
    await loadOrders()
  } catch (error) {
    toast(error.message || '取消未完成，请刷新订单后重试')
  } finally {
    cancellingId.value = ''
  }
}
</script>
<style scoped>
.order-filter-tabs { justify-content: flex-start; gap: 5px; overflow-x: auto; }
.order-filter-tabs .filter-tab { flex: 0 0 auto; min-width: 66px; padding: 0 8px; }
.orders-skeleton { display: flex; flex-direction: column; gap: 14px; }
.skeleton-order { padding: 14px 0 18px; border-bottom: 1px solid #ebe8e1; }
.skeleton-line, .skeleton-photo { background: linear-gradient(90deg, #f0eee8 25%, #f8f7f3 50%, #f0eee8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.35s ease-in-out infinite; }
.skeleton-line { width: 42%; height: 12px; border-radius: 6px; }
.skeleton-line.short { width: 28%; margin-bottom: 14px; }
.skeleton-line.narrow { width: 64%; margin-top: 9px; }
.skeleton-line.price { width: 38%; height: 20px; margin-top: 14px; }
.skeleton-product { display: flex; gap: 14px; }
.skeleton-photo { width: 110px; height: 110px; flex: 0 0 110px; border-radius: 4px; }
.skeleton-copy { flex: 1; padding-top: 8px; }
@keyframes skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
</style>
