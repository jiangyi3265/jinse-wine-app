<template>
  <PageShell title="订单详情" footer>
    <template v-if="order">
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
          <text class="section-title">{{ statusLabels[order.status] }}</text>
          <text class="muted">
            {{
              order.status === 'pending'
                ? '订单已创建，请完成付款'
                : order.status === 'shipping'
                  ? '商家正在准备您的订单'
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
        <view class="order-product" @click="go('product', { id: order.productId })">
          <image class="order-photo" :src="product?.image" mode="aspectFill" />
          <view class="grow column">
            <text class="strong">{{ product?.name }}</text>
            <text class="muted">{{ product?.spec }} × {{ order.quantity }}</text>
            <PriceTag :value="product?.price" :original="product?.originalPrice" />
          </view>
        </view>
        <view class="info-line">
          <text>商品金额</text>
          <text>¥{{ money(order.subtotal, true) }}</text>
        </view>
        <view class="info-line">
          <text>优惠抵扣</text>
          <text>−¥{{ money(order.discount, true) }}</text>
        </view>
        <view class="info-line">
          <text>运费</text>
          <text>¥{{ money(order.shipping, true) }}</text>
        </view>
        <view class="info-line strong">
          <text>实付金额</text>
          <text>¥{{ money(order.total, true) }}</text>
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
          <text>当前订单为前端演示订单，未发生真实付款或发货。</text>
        </view>
      </view>
      <view class="bottom-action">
        <button class="btn btn-outline" @click="contact">联系客服</button>
        <button v-if="order.status === 'pending'" class="btn" :disabled="busy" @click="pay">
          微信支付 ¥{{ money(order.total) }}
        </button>
        <button v-if="order.status === 'receiving'" class="btn" @click="receive">确认收货</button>
      </view>
    </template>
    <EmptyState v-else title="未找到该订单" button="查看我的订单" @action="go('orders')" />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, setOrderStatus } from '../../services/store.js'
import { getProduct } from '../../services/catalog.js'
import { money } from '../../services/pricing.js'
import {
  go,
  contact,
  statusLabels,
  dateLabel,
  confirm,
  toast,
  run,
} from '../../services/navigation.js'
const id = ref(''),
  busy = ref(false)
onLoad((q) => {
  id.value = q.id || ''
})
const order = computed(() => state.orders.find((o) => o.id === id.value)),
  product = computed(() => getProduct(order.value?.productId))
async function pay() {
  if (busy.value) return
  busy.value = true
  try {
    if (
      await confirm(
        '预览支付成功',
        '当前为演示订单，不会唤起真实扣款。确认后预览待发货状态。',
        '预览成功',
      )
    )
      setOrderStatus(id.value, 'shipping')
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}
async function receive() {
  if (await confirm('确认收货', '已收到商品并确认无误？', '确认收货'))
    run(() => setOrderStatus(id.value, 'complete'))
}
</script>
