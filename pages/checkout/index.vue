<template>
  <PageShell title="确认订单" footer>
    <view v-if="product" class="section">
      <button class="checkout-address" @click="openAddressSelect">
        <AppIcon name="pin" tone="gold" :size="36" />
        <view class="grow column">
          <text class="strong">
            {{ address ? `${address.name}　${maskPhone(address.phone)}` : '请选择收货地址' }}
          </text>
          <text v-if="address" class="muted">{{ address.region }} {{ address.detail }}</text>
        </view>
        <AppIcon name="chevron" tone="muted" :size="18" />
      </button>
      <view class="order-product">
        <image class="order-photo" :src="product.image" mode="aspectFill" />
        <view class="grow">
          <text class="strong block">{{ product.name }}</text>
          <view class="between">
            <text class="muted">{{ product.spec }}</text>
            <text>× {{ draft.quantity }}</text>
          </view>
          <PriceTag :value="product.price" :original="product.originalPrice" />
        </view>
      </view>
      <view class="checkout-summary">
        <view class="summary-row">
          <text class="muted">商品金额</text>
          <text class="amount">¥{{ money(quote.subtotal, true) }}</text>
        </view>
        <view class="summary-row">
          <text class="muted">运费</text>
          <text class="amount">¥{{ money(quote.shipping, true) }}</text>
        </view>
        <button class="summary-row" @click="openCouponSelect">
          <text>优惠券</text>
          <view class="row">
            <text class="muted">{{ coupon ? coupon.description : '选择优惠券' }}</text>
            <text v-if="quote.discount">− ¥{{ money(quote.discount, true) }}</text>
            <AppIcon name="chevron" :size="16" />
          </view>
        </button>
        <view class="summary-row">
          <text>支付方式</text>
          <view class="row muted">
            <AppIcon name="wechat" :size="25" />
            <text>微信支付</text>
            <AppIcon name="chevron" :size="16" />
          </view>
        </view>
      </view>
      <view class="checkout-note">
        <AppIcon name="info" :size="16" />
        <text>{{ quote.reason || (quote.discount ? '优惠已抵扣' : '提交后可在订单中查看') }}</text>
      </view>
      <view class="bottom-action">
        <view class="footer-total">
          合计
          <text class="amount">¥{{ money(quote.total, true) }}</text>
        </view>
        <button class="btn" :disabled="submitting || !!quote.reason" @click="submit">
          {{ submitting ? '提交中…' : '提交订单' }}
        </button>
      </view>
    </view>
    <EmptyState v-else title="尚未选择商品" button="去商城" @action="go('shop')" />
  </PageShell>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, submitOrder, quoteCheckout, refreshDomain } from '../../services/store.js'
import { getProduct } from '../../services/catalog.js'
import { quoteOrder, money } from '../../services/pricing.js'
import { go, confirm, toast } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
const draft = computed(() => state.checkout),
  product = computed(() => getProduct(draft.value.productId)),
  coupon = computed(() => state.coupons.find((c) => c.id === draft.value.couponId)),
  address = computed(() => state.addresses.find((a) => a.id === draft.value.addressId)),
  submitting = ref(false),
  serverQuote = ref(null)
const quote = computed(() =>
  isApiMode() ? serverQuote.value || { subtotal: 0, shipping: 0, discount: 0, total: 0, reason: '正在计算订单金额' } : product.value
    ? quoteOrder(
        [
          {
            productId: product.value.id,
            price: product.value.price,
            quantity: draft.value.quantity,
          },
        ],
        coupon.value,
      )
    : { subtotal: 0, shipping: 0, discount: 0, total: 0 },
)
let quoteRevision = 0
async function updateQuote() {
  if (!isApiMode()) return
  const current = ++quoteRevision
  serverQuote.value = null
  if (!address.value || !product.value) return
  try {
    const result = await quoteCheckout()
    if (current === quoteRevision) serverQuote.value = result
  } catch (error) {
    if (current === quoteRevision) serverQuote.value = { subtotal: 0, shipping: 0, discount: 0, total: 0, reason: error.message }
  }
}
watch(() => [draft.value.productId, draft.value.quantity, draft.value.couponId, draft.value.addressId], updateQuote, { immediate: true })
onShow(async () => {
  if (!isApiMode()) return
  try {
    await Promise.all([refreshDomain('addresses'), refreshDomain('coupons')])
    await updateQuote()
  } catch (error) { toast(error.message) }
})
const maskPhone = (p) => (p ? `${p.slice(0, 3)}****${p.slice(-4)}` : '')
// 通过具名方法统一页面跳转，保证地址与优惠券入口复用全局路由兜底逻辑。
function openAddressSelect() {
  go('addresses', { select: '1' })
}
function openCouponSelect() {
  go('coupons', { mode: 'select' })
}
async function submit() {
  if (submitting.value) return
  if (!address.value) return toast('请先填写收货地址')
  submitting.value = true
  try {
    if (!isApiMode() &&
      !(await confirm(
        '创建演示订单',
        '当前为前端演示，不会扣款。确认后创建本地订单，可继续预览支付和订单状态。',
        '创建订单',
      ))
    )
      return
    if (isApiMode() && (!serverQuote.value || serverQuote.value.reason))
      throw new Error(serverQuote.value?.reason || '请等待服务端计算订单金额')
    const order = await submitOrder()
    go('order-detail', { id: order.id })
  } catch (e) {
    toast(e.message)
  } finally {
    submitting.value = false
  }
}
</script>
