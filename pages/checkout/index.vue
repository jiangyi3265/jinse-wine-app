<template>
  <PageShell title="确认订单" pageClass="checkout-page" footer>
    <view v-if="loading" class="checkout-loading" aria-label="正在加载结算信息">
      <view class="checkout-loading-line wide" />
      <view class="checkout-loading-line" />
      <view class="checkout-loading-card" />
      <view class="checkout-loading-card short" />
      <view class="checkout-loading-button" />
    </view>
    <EmptyState v-else-if="loadError" title="结算信息暂时无法加载" :description="loadError" button="重新加载" @action="loadCheckout" />
    <view v-else-if="product" class="section">
      <view class="fulfillment-switch">
        <button :class="['fulfillment-option', { active: draft.fulfillmentMode !== 'pickup' }]" @click="setFulfillment('delivery')">平台配送</button>
        <button :class="['fulfillment-option', { active: draft.fulfillmentMode === 'pickup' }]" @click="setFulfillment('pickup')">门店自提</button>
      </view>
      <button v-if="draft.fulfillmentMode === 'pickup'" class="checkout-address" @click="openStoreSelect">
        <AppIcon name="shop" tone="gold" :size="36" />
        <view class="grow column">
          <text class="strong">{{ selectedStore?.storeName || selectedStore?.name || '请选择自提门店' }}</text>
          <text v-if="selectedStore" class="muted">{{ selectedStore.address }}</text>
        </view>
        <AppIcon name="chevron" tone="muted" :size="18" />
      </button>
      <button v-else class="checkout-address" @click="openAddressSelect">
        <AppIcon name="pin" tone="gold" :size="36" />
        <view class="grow column">
          <text class="strong">
            {{ address ? `${address.name}　${maskPhone(address.phone)}` : '请选择收货地址' }}
          </text>
          <text v-if="address" class="muted">{{ address.region }} {{ address.detail }}</text>
        </view>
        <AppIcon name="chevron" tone="muted" :size="18" />
      </button>
      <view v-if="draft.fulfillmentMode !== 'pickup' && addressError" class="checkout-store-error">
        <text>{{ addressError }}</text>
        <button @click="refreshAddresses">重试地址</button>
      </view>
      <view v-if="draft.fulfillmentMode === 'pickup' && storeError" class="checkout-store-error">
        <text>{{ storeError }}</text>
        <button @click="refreshStores">重试门店</button>
      </view>
      <view class="order-product">
        <image class="order-photo" :src="productImage(product.image)" mode="aspectFill" />
        <view class="grow">
          <text class="strong block">{{ product.name }}</text>
          <view class="between">
            <text class="muted">{{ quote.spec || product.spec }}</text>
            <text>× {{ draft.quantity }}</text>
          </view>
          <PriceTag :value="quote.unitPrice ?? product.price" :original="product.originalPrice" />
        </view>
      </view>
      <view v-if="couponError" class="checkout-store-error">
        <text>{{ couponError }}</text>
        <button @click="refreshCoupons">重试优惠券</button>
      </view>
      <button v-if="draft.couponId && !couponReady" class="checkout-clear-coupon" @click="clearCoupon">取消使用优惠券</button>
      <view class="checkout-summary">
        <view class="summary-row">
          <text class="muted">商品金额</text>
            <text class="amount">{{ quoteReady ? `¥${money(quote.subtotal, true)}` : '待确认' }}</text>
        </view>
        <view class="summary-row">
          <text class="muted">{{ draft.fulfillmentMode === 'pickup' ? '配送方式' : '运费' }}</text>
          <text class="amount">{{ draft.fulfillmentMode === 'pickup' ? '到店自提' : quoteReady ? `¥${money(quote.shipping, true)}` : '待确认' }}</text>
        </view>
        <button class="summary-row" @click="openCouponSelect">
          <text>优惠券</text>
          <view class="row">
            <text class="muted">{{ coupon ? coupon.description : '选择优惠券' }}</text>
            <text v-if="quoteReady && quote.discount">− ¥{{ money(quote.discount, true) }}</text>
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
        <text>{{ checkoutMessage }}</text>
      </view>
      <view class="bottom-action">
        <view class="footer-total">
          合计
          <text class="amount">{{ quoteReady ? `¥${money(quote.total, true)}` : '待确认' }}</text>
        </view>
        <button class="btn" :disabled="!canSubmit" @click="submit">
          {{ submitting ? '提交中…' : draft.fulfillmentMode === 'pickup' && !storeReady ? '门店待确认' : draft.fulfillmentMode !== 'pickup' && !addressReady ? '地址待确认' : draft.couponId && !couponReady ? '优惠券待确认' : !hasFulfillmentTarget ? '请选择配送信息' : !quoteReady ? '正在确认金额' : '提交订单' }}
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
import { getProduct, stores, loadProductCatalog, loadCouponCatalog, loadStoreCatalog } from '../../services/catalog.js'
import { quoteOrder, money } from '../../services/pricing.js'
import { go, confirm, toast } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
const draft = computed(() => state.checkout),
  product = computed(() => getProduct(draft.value.productId)),
  couponReady = ref(!isApiMode()),
  couponError = ref(''),
  coupon = computed(() => couponReady.value ? state.coupons.find((c) => c.id === draft.value.couponId) : null),
  addressReady = ref(!isApiMode()),
  addressLoading = ref(false),
  addressError = ref(''),
  address = computed(() => addressReady.value && !addressLoading.value
    ? state.addresses.find((a) => a.id === draft.value.addressId) : null),
  storeReady = ref(!isApiMode()),
  storeLoading = ref(false),
  storeError = ref(''),
  selectedStore = computed(() => storeReady.value && !storeLoading.value
    ? stores.find((store) => String(store.storeId ?? store.id) === String(draft.value.pickupStoreId)) : null),
  submitting = ref(false),
  loading = ref(true),
  loadError = ref(''),
  serverQuote = ref(null)
const hasFulfillmentTarget = computed(() => draft.value.fulfillmentMode === 'pickup' ? Boolean(selectedStore.value) : Boolean(address.value))
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
const quoteReady = computed(() => hasFulfillmentTarget.value && (!draft.value.couponId || couponReady.value) && (isApiMode()
  ? Boolean(serverQuote.value && !serverQuote.value.reason)
  : Boolean(product.value && !quote.value.reason)))
const canSubmit = computed(() => !submitting.value && hasFulfillmentTarget.value && quoteReady.value)
const checkoutMessage = computed(() => {
  if (draft.value.fulfillmentMode === 'pickup' && storeError.value) return '可重试门店资料，或改用平台配送'
  if (draft.value.fulfillmentMode === 'pickup' && storeLoading.value) return '正在读取自提门店'
  if (draft.value.fulfillmentMode !== 'pickup' && addressError.value) return '可重试收货地址，或改用门店自提'
  if (draft.value.fulfillmentMode !== 'pickup' && addressLoading.value) return '正在读取收货地址'
  if (draft.value.couponId && !couponReady.value) return '请重试优惠券，或取消使用优惠券'
  if (!hasFulfillmentTarget.value) return draft.value.fulfillmentMode === 'pickup' ? '请选择自提门店后确认金额' : '请选择收货地址后确认金额'
  if (!quoteReady.value) return quote.value.reason || '正在计算订单金额，请稍候'
  return quote.value.discount ? '优惠已抵扣' : '金额已确认，提交后可在订单中查看'
})
let quoteRevision = 0
async function updateQuote() {
  if (!isApiMode()) return
  const current = ++quoteRevision
  serverQuote.value = null
  const needsFulfillmentTarget = draft.value.fulfillmentMode === 'pickup'
    ? Boolean(selectedStore.value)
    : Boolean(address.value)
  if (!product.value || !needsFulfillmentTarget || (draft.value.couponId && !couponReady.value)) return
  try {
    const result = await quoteCheckout()
    if (current === quoteRevision) serverQuote.value = result
  } catch (error) {
    if (current === quoteRevision) serverQuote.value = { subtotal: 0, shipping: 0, discount: 0, total: 0, reason: error.message }
  }
}
watch(() => [draft.value.productId, draft.value.skuCode, draft.value.quantity, draft.value.couponId, draft.value.addressId, draft.value.fulfillmentMode, draft.value.pickupStoreId,
  draft.value.fulfillmentMode === 'pickup' ? storeReady.value : addressReady.value,
  draft.value.couponId ? couponReady.value : true], updateQuote, { immediate: true })
function clearCoupon() { state.checkout.couponId = null }
async function refreshCoupons() {
  couponReady.value = false
  couponError.value = ''
  try {
    await loadCouponCatalog()
    await refreshDomain('coupons')
    couponReady.value = true
  } catch { couponError.value = '优惠券暂时无法加载' }
}
async function refreshAddresses() {
  if (addressLoading.value) return
  addressLoading.value = true
  addressReady.value = false
  addressError.value = ''
  let loaded = false
  try {
    await refreshDomain('addresses')
    if (!state.addresses.some(item => String(item.id) === String(draft.value.addressId))) {
      state.checkout.addressId = state.addresses.find(item => item.isDefault)?.id || state.addresses[0]?.id || null
    }
    loaded = true
  }
  catch { addressError.value = '收货地址暂时无法加载' }
  finally { addressLoading.value = false; addressReady.value = loaded }
}
async function refreshStores() {
  if (storeLoading.value) return
  storeLoading.value = true
  storeReady.value = false
  storeError.value = ''
  let loaded = false
  try {
    await loadStoreCatalog()
    loaded = true
    if (!draft.value.pickupStoreId && stores.length) state.checkout.pickupStoreId = String(stores[0].storeId ?? stores[0].id)
  } catch { storeError.value = '自提门店暂时无法加载' }
  finally { storeLoading.value = false; storeReady.value = loaded }
}
async function loadCheckout() {
  loading.value = true
  loadError.value = ''
  if (!isApiMode()) { loading.value = false; return }
  try {
    await loadProductCatalog()
    await Promise.all([
      refreshCoupons(),
      draft.value.fulfillmentMode === 'pickup' ? refreshStores() : refreshAddresses(),
    ])
  } catch (error) {
    loadError.value = error.message || '结算信息暂时无法获取，请稍后重试'
  } finally { loading.value = false }
}
onShow(loadCheckout)
const maskPhone = (p) => (p ? `${p.slice(0, 3)}****${p.slice(-4)}` : '')
// 通过具名方法统一页面跳转，保证地址与优惠券入口复用全局路由兜底逻辑。
function openAddressSelect() {
  go('addresses', { select: '1' })
}
function openCouponSelect() {
  go('coupons', { mode: 'select' })
}
async function setFulfillment(mode) {
  state.checkout.fulfillmentMode = mode
  if (mode === 'pickup') await refreshStores()
  else await refreshAddresses()
}
async function openStoreSelect() {
  if (!storeReady.value) await refreshStores()
  if (!storeReady.value) return
  if (!stores.length) return toast('暂无可选自提门店')
  uni.showActionSheet({
    itemList: stores.map((store) => store.storeName || store.name),
    success: ({ tapIndex }) => { state.checkout.pickupStoreId = String(stores[tapIndex].storeId ?? stores[tapIndex].id) },
  })
}
async function submit() {
  if (submitting.value) return
  if (draft.value.couponId && !couponReady.value) return toast('请先确认优惠券，或取消使用优惠券')
  if (draft.value.fulfillmentMode !== 'pickup' && !addressReady.value) return toast('请先确认收货地址')
  if (draft.value.fulfillmentMode === 'pickup' ? !selectedStore.value : !address.value) return toast(draft.value.fulfillmentMode === 'pickup' ? '请先选择自提门店' : '请先填写收货地址')
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

<style scoped>
.checkout-loading { padding: 22px 16px 110px; }
.checkout-loading-line, .checkout-loading-card, .checkout-loading-button { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: checkout-skeleton 1.4s ease-in-out infinite; }
.checkout-loading-line { width: 72%; height: 14px; margin-top: 14px; }
.checkout-loading-line.wide { width: 94%; height: 20px; margin-top: 0; }
.checkout-loading-card { height: 116px; margin-top: 22px; border-radius: 8px; }
.checkout-loading-card.short { height: 180px; margin-top: 14px; }
.checkout-loading-button { height: 46px; margin-top: 18px; border-radius: 6px; }
@keyframes checkout-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
.fulfillment-switch { display: flex; gap: 8px; margin: 0 0 14px; padding: 4px; border-radius: 8px; background: #f1f3ef; }
.fulfillment-option { flex: 1; min-width: 0; margin: 0; padding: 10px 8px; border: 0; border-radius: 6px; background: transparent; color: #68766e; font-size: 14px; line-height: 1.3; }
.fulfillment-option::after { border: 0; }
.fulfillment-option.active { background: #fff; color: #315243; font-weight: 600; box-shadow: 0 1px 4px rgba(30, 50, 40, .1); }
.checkout-store-error { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0 14px; padding: 11px 12px; border-left: 3px solid #a65047; background: #fff7f5; color: #87443d; font-size: 13px; }
.checkout-store-error button { flex: 0 0 auto; padding: 0; color: #87443d; background: transparent; font-size: 12px; font-weight: 600; }
.checkout-clear-coupon { display: block; width: auto; margin: 8px 0 0 auto; padding: 0; color: #87443d; background: transparent; font-size: 12px; }
</style>
