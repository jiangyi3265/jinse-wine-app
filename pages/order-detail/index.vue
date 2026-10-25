<template>
  <PageShell title="订单详情" footer>
    <view v-if="loading" class="order-loading" aria-label="正在加载订单详情">
      <view class="order-loading-status">
        <view class="order-skeleton-icon" />
        <view class="order-skeleton-line order-skeleton-line--status" />
        <view class="order-skeleton-line order-skeleton-line--hint" />
      </view>
      <view class="order-loading-card">
        <view class="order-skeleton-row"><view class="order-skeleton-thumb" /><view class="grow"><view class="order-skeleton-line" /><view class="order-skeleton-line order-skeleton-line--meta" /></view></view>
        <view class="order-skeleton-divider" />
        <view class="order-skeleton-line order-skeleton-line--wide" />
        <view class="order-skeleton-line order-skeleton-line--wide" />
        <view class="order-skeleton-line order-skeleton-line--total" />
      </view>
    </view>
    <template v-else-if="order">
      <view class="section">
        <view class="service-intro">
          <AppIcon
            :name="
              order.status === 'pending'
                ? 'clock'
                : order.status === 'cancelled'
                  ? 'close'
                  : 'check'
            "
            tone="gold"
            :size="42"
          />
          <text class="section-title">{{ orderStatusLabel(order, delivery?.status || order.deliveryStatus) }}</text>
          <text class="muted">
            {{
              order.status === 'pending'
                ? paymentTradeClosed ? '微信交易已关闭，请取消订单后重新下单' : order.paymentAwaiting ? '微信支付结果核对中，请查询订单状态' : '订单已创建，请完成付款'
                : order.status === 'refunded'
                  ? '退款已处理，请在下方查看每笔退款进度'
                : order.fulfillmentMode === 'pickup' && order.status === 'paid'
                  ? '请到指定门店出示自提码，核销后完成订单'
                : ['shipping', 'receiving'].includes(order.status)
                  ? delivery?.status === 'awaiting_pickup' ? '包裹已到驿站或快递柜，请及时取件' : delivery?.status === 'signed' ? '快递已签收，请收到商品后确认收货' : '商家已发货，请留意物流进度'
                : order.status === 'paid'
                  ? '付款成功，等待商家发货'
                  : order.status === 'cancelled'
                    ? '订单已取消，优惠券按规则退回'
                    : '感谢您的支持'
            }}
          </text>
        </view>
        <view v-if="order.address" class="checkout-address">
          <AppIcon name="pin" tone="gold" :size="28" />
          <view class="column">
            <text>{{ order.address.name }}　{{ order.address.phone }}</text>
            <text class="muted">{{ order.address.region }} {{ order.address.detail }}</text>
          </view>
        </view>
        <view v-if="order.fulfillmentMode === 'delivery' && order.shippingStoreName" class="info-line order-shipping-store">
          <text class="muted">发货门店</text>
          <text>{{ order.shippingStoreName }}</text>
        </view>
        <view v-if="order.fulfillmentMode === 'pickup'" class="pickup-pass section-space">
          <text class="strong">门店自提码</text>
          <image v-if="pickupQr && order.status === 'paid'" :src="pickupQr" mode="aspectFit" class="pickup-qr" />
          <text v-else-if="order.status === 'paid'" class="muted small">自提码加载中</text>
          <text v-if="order.pickupStoreName" class="muted">{{ order.pickupStoreName }} · {{ order.pickupAddress }}</text>
          <text class="muted small">仅限此订单指定门店核销；核销完成后订单状态更新为已完成。</text>
        </view>
        <view
          v-for="(item, index) in orderItems"
          :key="item.orderItemId || `${item.productId}-${item.spec}-${index}`"
          class="order-product"
          @click="go('product', { id: item.productId })"
        >
          <image class="order-photo" :src="productImage(item.image || getProduct(item.productId)?.image)" mode="aspectFill" />
          <view class="grow column">
            <text class="strong">{{ item.name || getProduct(item.productId)?.name }}</text>
            <text class="muted">{{ item.spec || getProduct(item.productId)?.spec }} × {{ item.quantity }}</text>
            <PriceTag :value="item.price || getProduct(item.productId)?.price" :original="getProduct(item.productId)?.originalPrice" />
          </view>
        </view>
        <view class="info-line">
          <text>商品金额</text>
          <text>¥{{ money(order.subtotal, true) }}</text>
        </view>
        <view v-if="deliveryLoading" class="delivery-card delivery-loading section-space" aria-label="正在加载物流信息">
          <view class="delivery-heading">
            <view class="row"><AppIcon name="truck" :size="19" /><text class="strong">物流信息</text></view>
            <view class="delivery-skeleton-line" />
          </view>
          <view class="delivery-skeleton-line delivery-skeleton-line--wide" />
          <view class="delivery-skeleton-line delivery-skeleton-line--trace" />
        </view>
        <view v-else-if="deliveryError" class="delivery-card delivery-error section-space">
          <view class="delivery-heading">
            <view class="row"><AppIcon name="info" :size="19" /><text class="strong">物流信息暂时无法获取</text></view>
          </view>
          <text class="muted small block">{{ deliveryError }}</text>
          <button class="btn btn-outline delivery-retry" @click="retryDelivery">重新加载</button>
        </view>
        <view v-else-if="delivery" class="delivery-card section-space">
          <view class="delivery-heading">
            <view class="row"><AppIcon name="truck" :size="19" /><text class="strong">物流信息</text></view>
            <text class="muted small">{{ deliveryStatusLabel(delivery.status) }}</text>
          </view>
          <view class="delivery-number"><text>{{ delivery.company || '物流' }}</text><text class="muted">{{ delivery.trackingNo || '待填写单号' }}</text></view>
          <text v-if="delivery.syncError" class="muted small block delivery-sync-note">{{ delivery.syncError }}</text>
          <text v-else-if="!delivery.trackingAvailable" class="muted small block delivery-sync-note">{{ delivery.trackingEnabled ? '当前快递公司暂不支持自动查询' : '物流自动查询尚未开通' }}</text>
          <text v-if="delivery.lastSyncedAt" class="muted small block">更新于 {{ delivery.lastSyncedAt }}</text>
          <view v-for="trace in deliveryTraces" :key="trace.time + trace.description" class="delivery-trace">
            <view class="trace-dot" /><view class="grow"><text class="block">{{ trace.description }}</text><text class="muted small">{{ trace.time }}</text></view>
          </view>
        </view>
        <view v-else-if="showDelivery && order.status !== 'refunded'" class="delivery-card delivery-empty section-space">
          <view class="delivery-heading">
            <view class="row"><AppIcon name="truck" :size="19" /><text class="strong">物流信息</text></view>
            <text class="muted small">待更新</text>
          </view>
          <text class="muted small block">商家尚未发货，物流单号将在发货后更新。</text>
        </view>
        <view class="info-line">
          <text>优惠抵扣</text>
          <text>−¥{{ money(order.discount, true) }}</text>
        </view>
        <view class="info-line">
          <text>{{ order.fulfillmentMode === 'pickup' ? '履约方式' : '运费' }}</text>
          <text>{{ order.fulfillmentMode === 'pickup' ? '门店自提' : `¥${money(order.shipping, true)}` }}</text>
        </view>
        <view class="info-line strong">
          <text>实付金额</text>
          <text>¥{{ money(order.total, true) }}</text>
        </view>
        <view v-if="refundEntries.length" class="refund-card section-space">
          <view class="delivery-heading">
            <view class="row"><AppIcon name="info" :size="19" /><text class="strong">退款进度</text></view>
            <text class="muted small">已申请 ¥{{ money(order.refundSummary?.requested || 0, true) }}</text>
          </view>
          <view v-for="refundItem in refundEntries" :key="refundItem.id" class="refund-row">
            <view class="grow column">
              <text class="strong">{{ refundStatusLabel(refundItem) }}</text>
              <text class="muted small">{{ refundItem.reason || '用户申请退款' }} · {{ dateLabel(refundItem.createdAt) }}</text>
            </view>
            <text class="refund-amount">¥{{ money(refundItem.amount, true) }}</text>
          </view>
          <text v-if="order.refundSummary?.processing" class="muted small block refund-note">平台正在审核或处理退款，处理期间订单不可重复核销。</text>
        </view>
        <view class="info-line">
          <text>订单编号</text>
          <text class="small">{{ order.id }}</text>
        </view>
        <view class="info-line">
          <text>下单时间</text>
          <text>{{ dateLabel(order.createdAt) }}</text>
        </view>
        <view class="notice section-space">
          <AppIcon name="info" :size="19" />
          <text>{{ isApiMode() ? '订单状态以服务端查询结果为准。' : '当前订单为前端演示订单，未发生真实付款或发货。' }}</text>
        </view>
      </view>
      <view v-if="isApiMode() && !['pending', 'cancelled'].includes(order.status)" class="order-aftersale-links">
        <button v-if="canAftersale" class="text-button" :disabled="busy" @click="go('aftersale', { id })">退货 / 换货</button>
        <button class="text-button" @click="go('aftersale', { id, records: 1 })">售后记录</button>
      </view>
      <view class="bottom-action">
        <button class="btn btn-outline" @click="contact">联系客服</button>
        <button v-if="order.status === 'pending' && paymentTradeClosed" class="btn" :disabled="busy" @click="cancelOrder">
          取消订单
        </button>
        <button v-else-if="order.status === 'pending' && order.paymentAwaiting" class="btn" :disabled="busy" @click="queryPayment">
          查询支付状态
        </button>
        <button v-else-if="order.status === 'pending'" class="btn" :disabled="busy" @click="pay">
          微信支付 ¥{{ money(order.total) }}
        </button>
        <button v-if="canReceive" class="btn" :disabled="busy" @click="receive">确认收货</button>
        <button v-if="canRefund" class="btn btn-outline" :disabled="busy" @click="refund">申请退款</button>
      </view>
    </template>
    <EmptyState v-else :title="loadError ? '订单暂时无法加载' : '未找到该订单'" :description="loadError || ''" :button="loadError ? '重新加载' : '查看我的订单'" @action="loadError ? loadOrder() : go('orders')" />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, setOrderStatus, payOrder, refreshOrder, syncPaymentOrder, loadOrderDelivery, loadPickupCode, requestRefund } from '../../services/store.js'
import { isApiMode } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
import { getProduct } from '../../services/catalog.js'
import { money } from '../../services/pricing.js'
import {
  go,
  contact,
  orderStatusLabel,
  deliveryStatusLabel,
  dateLabel,
  confirm,
  toast,
} from '../../services/navigation.js'
const id = ref(''),
  loading = ref(true),
  loadError = ref(''),
  busy = ref(false),
  delivery = ref(null),
  deliveryLoading = ref(false),
  deliveryError = ref(''),
  pickupQr = ref('')
let orderTask
onLoad((q) => {
  id.value = q.id || ''
  if (id.value) loadOrder()
  else {
    loadError.value = '订单编号无效，请从我的订单进入详情'
    loading.value = false
  }
})
onShow(() => {
  if (id.value) loadOrder()
})
async function loadOrder() {
  if (orderTask) return orderTask
  orderTask = (async () => {
    loading.value = true
    loadError.value = ''
    if (isApiMode()) {
      try {
        const fresh = await refreshOrder(id.value)
        delivery.value = null
        deliveryError.value = ''
        deliveryLoading.value = false
        pickupQr.value = ''
        if (fresh?.fulfillmentMode === 'pickup' && fresh.status === 'paid') loadPickupCode(id.value).then(value => { pickupQr.value = value }).catch(() => {})
        loadDelivery(id.value, fresh)
      } catch (error) {
        loadError.value = error.message || '订单信息暂时无法获取，请稍后重试'
      }
    }
    loading.value = false
  })().finally(() => { orderTask = null })
  return orderTask
}
function shouldLoadDelivery(value) {
  return !!value && value.fulfillmentMode !== 'pickup' && !['pending', 'cancelled'].includes(value.status)
}
async function loadDelivery(orderId = id.value, sourceOrder = order.value) {
  if (!isApiMode() || !shouldLoadDelivery(sourceOrder) || (sourceOrder.status === 'paid' && !sourceOrder.deliveryStatus)) {
    deliveryLoading.value = false
    deliveryError.value = ''
    delivery.value = null
    return
  }
  deliveryLoading.value = true
  deliveryError.value = ''
  try {
    delivery.value = await loadOrderDelivery(orderId)
  } catch (error) {
    delivery.value = null
    deliveryError.value = ['paid', 'refunded'].includes(sourceOrder?.status) && Number(error.statusCode) === 404
      ? ''
      : error.message || '物流信息暂时无法获取，请稍后重试'
  } finally {
    deliveryLoading.value = false
  }
}
function retryDelivery() {
  loadDelivery(id.value, order.value)
}
const order = computed(() => loadError.value && isApiMode() ? null : state.orders.find((o) => o.id === id.value)),
  paymentTradeClosed = computed(() => ['CLOSED', 'REVOKED', 'PAYERROR'].includes(order.value?.wechatTradeState)),
  product = computed(() => getProduct(order.value?.productId))
const showDelivery = computed(() => shouldLoadDelivery(order.value))
const canReceive = computed(() => order.value?.fulfillmentMode !== 'pickup' &&
  !order.value?.aftersaleProcessing && !order.value?.refundSummary?.processing &&
  (order.value?.status === 'receiving' || (order.value?.status === 'shipping' && !!delivery.value?.trackingNo)))
const canAftersale = computed(() => isApiMode() && ['shipping', 'receiving', 'complete'].includes(order.value?.status))
const refundEntries = computed(() => order.value?.refunds || [])
const refundAmountAvailable = computed(() => {
  const summaryRemaining = Number(order.value?.refundSummary?.remaining ?? order.value?.total ?? 0)
  if (!order.value || order.value.status === 'paid' || order.value.fulfillmentMode === 'pickup') return Math.max(0, summaryRemaining)
  const shipping = Number(order.value.shipping || 0)
  return Math.max(0, summaryRemaining - shipping)
})
const canRefund = computed(() => {
  const refundableStatus = ['paid', 'shipping', 'receiving', 'complete'].includes(order.value?.status)
  return refundableStatus && !order.value?.refundSummary?.processing && !order.value?.aftersaleProcessing && refundAmountAvailable.value > 0
})
function refundStatusLabel(item) {
  if (item.status === 'refunded') {
    if (item.channelStatus === 'MANUAL_CONFIRMED') return '线下退款已登记'
    if (item.channelStatus === 'SUCCESS') return '微信退款已完成'
    return '退款已完成'
  }
  if (item.status === 'approved') {
    if (item.channelStatus === 'SUCCESS') return '微信已退款，订单更新中'
    if (item.channelStatus === 'REVIEW') return '退款待商家人工核对'
    if (item.channelStatus === 'UNKNOWN') return '退款结果核对中'
    if (item.channelStatus === 'ABNORMAL') return '退款异常，待商家核对'
    if (item.channelStatus === 'CLOSED') return '微信退款已关闭，待商家处理'
    if (item.channelStatus === 'PENDING_AUTO') return '退款待发起'
    return item.channelStatus ? '退款处理中' : '等待商家退款'
  }
  return ({ pending: '退款审核中', rejected: '退款已驳回' }[item.status] || '退款申请')
}
const deliveryTraces = computed(() => {
  if (!delivery.value?.lastTrace) return []
  try {
    const value = typeof delivery.value.lastTrace === 'string' ? JSON.parse(delivery.value.lastTrace) : delivery.value.lastTrace
    return Array.isArray(value) ? value : []
  } catch { return [] }
})
const orderItems = computed(() => {
  if (order.value?.items?.length) return order.value.items
  if (!order.value?.productId) return []
  return [{
    productId: order.value.productId,
    quantity: order.value.quantity || 1,
    image: product.value?.image,
    name: product.value?.name,
    spec: product.value?.spec,
    price: product.value?.price,
    subtotal: order.value.subtotal,
  }]
})
async function pay() {
  if (busy.value || order.value?.status !== 'pending') return
  busy.value = true
  try {
    if (isApiMode()) {
      const fresh = await payOrder(id.value)
      if (fresh?.paymentAwaiting) toast('支付结果核对中，请稍后查询订单状态')
      if (fresh?.fulfillmentMode === 'pickup' && fresh.status === 'paid')
        void loadPickupCode(id.value).then(value => { pickupQr.value = value }).catch(() => {})
      return
    }
    if (
      await confirm(
        '预览支付成功',
        '当前为演示订单，不会唤起真实扣款。确认后预览待发货状态。',
        '预览成功',
      )
    )
      await setOrderStatus(id.value, 'shipping')
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}
async function receive() {
  if (busy.value || !canReceive.value) return
  busy.value = true
  try {
    if (!(await confirm('确认收货', '已收到商品并确认无误？', '确认收货'))) return
    await setOrderStatus(id.value, 'complete')
    toast('已确认收货')
  } catch (error) { toast(error.message || '确认未完成，请刷新订单后重试') }
  finally { busy.value = false }
}
async function queryPayment() {
  if (busy.value || !order.value?.paymentAwaiting) return
  busy.value = true
  try {
    const fresh = await syncPaymentOrder(id.value)
    if (fresh.status === 'pending') {
      const closed = ['CLOSED', 'REVOKED', 'PAYERROR'].includes(fresh.wechatTradeState)
      toast(closed ? '微信交易已关闭或失败，请取消此订单后重新下单' : '微信尚未确认付款，请稍后查询或联系客服')
    }
    else {
      toast('订单状态已更新')
      if (fresh.fulfillmentMode === 'pickup' && fresh.status === 'paid')
        void loadPickupCode(id.value).then(value => { pickupQr.value = value }).catch(() => {})
      void loadDelivery(id.value, fresh)
    }
  } catch (error) { toast(error.message || '支付状态暂时无法查询，请稍后重试') }
  finally { busy.value = false }
}
async function cancelOrder() {
  if (busy.value || order.value?.status !== 'pending') return
  busy.value = true
  try {
    if (!(await confirm('取消订单', '取消后无法继续付款；如微信随后确认扣款，平台会发起原路退款。', '确认取消'))) return
    await setOrderStatus(id.value, 'cancelled')
    toast('订单已取消')
  } catch (error) { toast(error.message || '取消未完成，请稍后重试') }
  finally { busy.value = false }
}
async function refund() {
  if (busy.value) return
  if (!isApiMode()) return toast('演示订单不支持退款申请')
  if (!canRefund.value) return toast('当前订单暂无可申请退款金额')
  busy.value = true
  try {
    const refundHint = order.value.status === 'paid' || order.value.fulfillmentMode === 'pickup'
      ? '将按订单剩余金额申请退款。'
      : '订单已发货，退款金额不包含运费。'
    if (!(await confirm('申请退款', `${refundHint}提交后由平台审核处理，是否继续？`, '提交申请'))) return
    const amount = refundAmountAvailable.value
    const result = await requestRefund(id.value, amount, '用户申请退款')
    toast(({ approved: '退款审核已通过，等待退款处理', refunded: '退款已完成',
      rejected: '退款申请已驳回，请查看售后记录' })[result?.status] || '退款申请已提交')
    void refreshOrder(id.value).catch(() => {})
  } catch (error) { toast(error.message) }
  finally { busy.value = false }
}
</script>

<style scoped>
.order-shipping-store > text:first-child { flex: 0 0 auto; }
.order-shipping-store > text:last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.order-aftersale-links { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 24px; padding: 0 18px 20px; }
.pickup-pass { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; border: 1px solid #e3e8df; border-radius: 8px; background: #f8faf6; text-align: center; }
.pickup-qr { width: 200px; height: 200px; background: #fff; }
.delivery-card { padding: 14px 15px; border: 1px solid #e6e9e1; border-radius: 8px; background: #f8faf6; }
.delivery-error { border-color: #ead8d3; background: #fff9f7; }
.delivery-empty { background: #fbfaf6; }
.delivery-heading, .delivery-number { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.delivery-number { margin-top: 10px; color: #34483e; font-size: 14px; }
.delivery-retry { min-width: 96px; margin: 12px 0 0; padding: 0 14px; }
.delivery-skeleton-line { width: 56px; height: 11px; border-radius: 6px; background: linear-gradient(90deg, #e9eee6 25%, #f7faf4 50%, #e9eee6 75%); background-size: 200% 100%; animation: delivery-skeleton-shimmer 1.35s ease-in-out infinite; }
.delivery-skeleton-line--wide { width: 54%; margin-top: 14px; }
.delivery-skeleton-line--trace { width: 82%; margin-top: 14px; }
.delivery-trace { display: flex; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e7ebe5; }
.trace-dot { flex: 0 0 8px; width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: #a27438; box-shadow: 0 0 0 4px #eee6d5; }
.refund-card { padding: 14px 15px; border: 1px solid #eadfd0; border-radius: 8px; background: #fffaf3; }
.refund-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee4d7; }
.refund-amount { flex: 0 0 auto; color: #9d4944; font-weight: 600; }
.refund-note { margin-top: 12px; }
.order-loading { min-height: calc(100vh - 102px); padding: 20px 16px 96px; background: #fbfaf6; }
.order-loading-status, .order-loading-card { padding: 20px 16px; border: 1px solid #eeeae1; border-radius: 8px; background: #fff; }
.order-loading-status { display: flex; flex-direction: column; align-items: center; gap: 11px; }
.order-loading-card { margin-top: 14px; }
.order-skeleton-icon, .order-skeleton-line, .order-skeleton-thumb, .order-skeleton-divider { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: order-skeleton-shimmer 1.4s ease-in-out infinite; }
.order-skeleton-icon { width: 42px; height: 42px; border-radius: 50%; }
.order-skeleton-line { width: 44%; height: 13px; border-radius: 7px; }
.order-skeleton-line--status { width: 34%; height: 20px; border-radius: 6px; }
.order-skeleton-line--hint { width: 52%; }
.order-skeleton-row { display: flex; align-items: center; gap: 12px; }
.order-skeleton-thumb { width: 70px; height: 70px; flex: 0 0 70px; border-radius: 5px; }
.order-skeleton-line--meta { width: 68%; margin-top: 12px; }
.order-skeleton-divider { width: 100%; height: 1px; margin: 22px 0 18px; }
.order-skeleton-line--wide { width: 100%; margin-top: 14px; }
.order-skeleton-line--total { width: 48%; height: 18px; margin-top: 22px; margin-left: auto; }
@keyframes order-skeleton-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@keyframes delivery-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
</style>
