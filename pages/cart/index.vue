<template>
  <PageShell title="购物车" left>
    <view v-if="loading" class="cart-loading" aria-label="正在加载购物车">
      <view class="cart-loading-line wide" />
      <view class="cart-loading-line" />
      <view v-for="item in 2" :key="item" class="cart-loading-item">
        <view class="cart-loading-image" />
        <view class="grow"><view class="cart-loading-line wide" /><view class="cart-loading-line short" /></view>
      </view>
    </view>
    <EmptyState v-else-if="loadError" title="购物车暂时无法加载" :description="loadError" button="重新加载" @action="refresh" />
    <view v-else-if="items.length" class="cart-list">
      <view class="fulfillment-switch">
        <button :class="['fulfillment-option', { active: checkoutMode !== 'pickup' }]" @click="setMode('delivery')">平台配送</button>
        <button :class="['fulfillment-option', { active: checkoutMode === 'pickup' }]" @click="setMode('pickup')">门店自提</button>
      </view>
      <button v-if="checkoutMode === 'pickup'" class="cart-address" @click="chooseStore">
        <view class="cart-address-main"><AppIcon name="shop" tone="gold" :size="22" /><view class="column"><text class="strong">{{ selectedStore?.storeName || selectedStore?.name || '请选择自提门店' }}</text><text v-if="selectedStore" class="muted">{{ selectedStore.address }}</text></view></view>
        <AppIcon name="arrow" :size="18" />
      </button>
      <button v-else class="cart-address" @click="chooseAddress">
        <view class="cart-address-main">
          <AppIcon name="pin" tone="gold" :size="22" />
          <view v-if="selectedAddress" class="column"><text class="strong">{{ selectedAddress.name }}　{{ selectedAddress.phone }}</text><text class="muted">{{ selectedAddress.region }} {{ selectedAddress.detail }}</text></view>
          <text v-else class="muted">请选择收货地址</text>
        </view>
        <AppIcon name="arrow" :size="18" />
      </button>
      <view v-if="checkoutMode === 'pickup' && storeError" class="cart-warning cart-store-error">
        <text>{{ storeError }}</text>
        <button @click="refreshStores">重试门店</button>
      </view>
      <view v-if="checkoutMode !== 'pickup' && addressError" class="cart-warning cart-store-error">
        <text>{{ addressError }}</text>
        <button @click="refreshAddresses">重试地址</button>
      </view>
      <button class="cart-coupon" @click="chooseCoupon">
        <view class="cart-address-main"><AppIcon name="coupon" tone="gold" :size="21" /><view class="column"><text class="strong">优惠券</text><text class="muted">{{ selectedCoupon?.description || '选择可用优惠券' }}</text></view></view>
        <AppIcon name="arrow" :size="18" />
      </button>
      <view v-if="couponError" class="cart-warning cart-store-error">
        <text>{{ couponError }}</text>
        <button @click="refreshCoupons">重试优惠券</button>
      </view>
      <button v-if="state.checkout.couponId && !couponReady" class="cart-clear-coupon" @click="clearCoupon">取消使用优惠券</button>
      <view v-if="couponIssue" class="cart-warning">{{ couponIssue }}，请重新选择优惠券。</view>
      <view v-if="unavailableCount" class="cart-warning">有 {{ unavailableCount }} 件商品库存不足或已下架，请调整数量或移除后结算。</view>
      <view v-for="item in items" :key="item.id" class="cart-item">
        <image :src="productImage(item.image)" mode="aspectFill" class="cart-image" />
        <view class="cart-main"><text class="cart-name">{{ item.name }}</text><text class="muted">{{ item.spec }}</text><text v-if="itemIssue(item)" class="cart-item-alert">{{ itemIssue(item) }}</text><button v-if="canAdjustToStock(item)" class="cart-adjust" @click="adjustToStock(item)">调整为 {{ item.stock }} 件</button><view class="cart-bottom"><PriceTag :value="item.price" /><view class="stepper"><button @click="change(item, -1)">−</button><text>{{ item.quantity }}</text><button :disabled="isApiMode() && Number(item.stock) <= Number(item.quantity)" @click="change(item, 1)">＋</button></view></view></view>
        <button class="remove" aria-label="删除商品" @click="remove(item)">删除</button>
      </view>
      <view v-if="isApiMode()" class="cart-summary">
        <view><text>商品金额</text><text>¥{{ (total / 100).toFixed(2) }}</text></view>
        <view><text>运费</text><text>{{ quoteReady ? `¥${(serverQuote.shipping / 100).toFixed(2)}` : '待确认' }}</text></view>
        <view><text>优惠抵扣</text><text>{{ quoteReady ? `−¥${(serverQuote.discount / 100).toFixed(2)}` : '待确认' }}</text></view>
      </view>
      <view v-if="quoteError" class="cart-warning cart-store-error"><text>{{ quoteError }}</text><button @click="refreshQuote">重新计算</button></view>
      <view class="cart-footer"><view class="cart-total-copy"><text>共 {{ totalQuantity }} 件</text><text class="muted small">{{ isApiMode() ? (quoteReady ? '应付合计' : '金额待确认') : '商品合计' }}</text></view><text class="total">{{ isApiMode() && !quoteReady ? '待确认' : `¥${((isApiMode() ? serverQuote.total : total) / 100).toFixed(2)}` }}</text><button class="btn" :disabled="unavailableCount > 0 || !!couponIssue || submitting || (isApiMode() && !quoteReady) || (checkoutMode === 'pickup' ? (!storeReady || storeLoading) : (!addressReady || addressLoading))" @click="checkout">{{ unavailableCount ? '请调整商品' : couponIssue ? '请重新选券' : submitting ? '提交中' : checkoutMode === 'pickup' && !storeReady ? '门店待确认' : checkoutMode !== 'pickup' && !addressReady ? '地址待确认' : isApiMode() && !quoteReady ? '金额待确认' : '去结算' }}</button></view>
    </view>
    <EmptyState v-else title="购物车是空的" description="去商城挑选喜欢的酒品" button="去商城" @action="go('shop')" />
  </PageShell>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { go, toast } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
import { state, loadCart, updateCartItem, removeCartItem, submitCartOrder, quoteCartOrder, refreshDomain } from '../../services/store.js'
import { stores, loadCouponCatalog, loadStoreCatalog } from '../../services/catalog.js'
import { couponEligibility } from '../../services/pricing.js'
const items = ref([])
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const storeReady = ref(!isApiMode())
const storeLoading = ref(false)
const storeError = ref('')
const addressReady = ref(!isApiMode())
const addressLoading = ref(false)
const addressError = ref('')
const couponReady = ref(!isApiMode())
const couponError = ref('')
const checkoutMode = computed(() => state.checkout.fulfillmentMode || 'delivery')
const selectedStore = computed(() => storeReady.value && !storeLoading.value
  ? stores.find(store => String(store.storeId ?? store.id) === String(state.checkout.pickupStoreId)) : null)
const selectedAddress = computed(() => addressReady.value && !addressLoading.value
  ? state.addresses.find(item => item.id === state.checkout.addressId) || state.addresses.find(item => item.isDefault) || state.addresses[0] : null)
const selectedCoupon = computed(() => couponReady.value
  ? state.coupons.find(item => item.id === state.checkout.couponId && item.status === 'unused') : null)
const couponIssue = computed(() => {
  if (!state.checkout.couponId) return ''
  if (!couponReady.value) return '优惠券状态待确认'
  if (!selectedCoupon.value) return '已选优惠券不可用'
  return couponEligibility(selectedCoupon.value, items.value.map(item => ({
    productId: item.productId,
    price: Number(item.price),
    quantity: Number(item.quantity),
  })))
})
const totalQuantity = computed(() => items.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0))
const total = computed(() => items.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))
const unavailableCount = computed(() => items.value.filter(item => itemIssue(item)).length)
const serverQuote = ref(null)
const quoteError = ref('')
const quoteReady = computed(() => !!serverQuote.value && !quoteError.value)
let quoteRevision = 0
async function refreshQuote() {
  const revision = ++quoteRevision
  serverQuote.value = null
  quoteError.value = ''
  if (!isApiMode() || loading.value || !items.value.length || unavailableCount.value || couponIssue.value) return
  if (checkoutMode.value === 'pickup' ? !selectedStore.value : !selectedAddress.value) return
  try {
    const result = await quoteCartOrder()
    if (revision === quoteRevision) serverQuote.value = result
  } catch (error) { if (revision === quoteRevision) quoteError.value = error.message || '运费暂时无法计算' }
}
watch(() => [loading.value, items.value, checkoutMode.value, selectedAddress.value?.id, selectedStore.value?.id,
  selectedStore.value?.storeId, state.checkout.couponId, couponIssue.value], refreshQuote, { immediate: true })
function itemIssue(item) {
  if (!isApiMode()) return ''
  const stock = Number(item.stock)
  if (!Number.isFinite(stock)) return '库存状态待确认，请刷新购物车'
  if (stock <= 0) return '已售罄或已下架'
  if (stock < Number(item.quantity)) return `仅剩 ${stock} 件`
  return ''
}
function canAdjustToStock(item) {
  return isApiMode() && Number(item.stock) > 0 && Number(item.stock) < Number(item.quantity)
}
async function refresh() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = await loadCart()
    if (isApiMode()) {
      await Promise.all([
        refreshCoupons(),
        checkoutMode.value === 'pickup' ? refreshStores() : refreshAddresses(),
      ])
    }
  } catch (error) {
    items.value = []
    loadError.value = error.message || '购物车暂时无法获取，请稍后重试'
  } finally { loading.value = false }
}
function chooseAddress() { go('addresses', { select: '1' }) }
function chooseCoupon() { go('coupons', { mode: 'select', source: 'cart' }) }
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
  try { await refreshDomain('addresses'); loaded = true }
  catch { addressError.value = '收货地址暂时无法加载' }
  finally { addressLoading.value = false; addressReady.value = loaded }
}
async function refreshStores() {
  if (storeLoading.value) return
  storeLoading.value = true
  storeReady.value = false
  storeError.value = ''
  try {
    await loadStoreCatalog()
    storeReady.value = true
    if (!state.checkout.pickupStoreId && stores.length) state.checkout.pickupStoreId = String(stores[0].storeId ?? stores[0].id)
  } catch { storeError.value = '自提门店暂时无法加载' }
  finally { storeLoading.value = false }
}
async function setMode(mode) {
  state.checkout.fulfillmentMode = mode
  if (mode === 'pickup') await refreshStores()
  else await refreshAddresses()
}
async function chooseStore() {
  if (!storeReady.value) await refreshStores()
  if (!storeReady.value) return
  if (!stores.length) return toast('暂无可选自提门店')
  uni.showActionSheet({ itemList: stores.map(store => store.storeName || store.name), success: ({ tapIndex }) => { state.checkout.pickupStoreId = String(stores[tapIndex].storeId ?? stores[tapIndex].id) } })
}
async function change(item, delta) { const next = Number(item.quantity) + delta; if (next < 1) return remove(item); if (delta < 0 && canAdjustToStock(item) && next > Number(item.stock)) return adjustToStock(item); try { await updateCartItem(item.id, next); await refresh() } catch (error) { toast(error.message) } }
async function adjustToStock(item) { try { await updateCartItem(item.id, Number(item.stock)); await refresh() } catch (error) { toast(error.message) } }
async function remove(item) { try { await removeCartItem(item.id); await refresh() } catch (error) { toast(error.message) } }
async function checkout() {
  if (submitting.value) return
  if (!items.value.length) return
  if (unavailableCount.value) return toast('请先调整库存不足或已下架的商品')
  if (couponIssue.value) return toast(`${couponIssue.value}，请重新选择优惠券`)
  if (!isApiMode()) return go('product', { id: items.value[0].productId })
  if (checkoutMode.value === 'pickup' && !storeReady.value) return toast('请先确认自提门店')
  if (checkoutMode.value !== 'pickup' && !addressReady.value) return toast('请先确认收货地址')
  if (checkoutMode.value === 'pickup' ? !selectedStore.value : !selectedAddress.value) return checkoutMode.value === 'pickup' ? chooseStore() : chooseAddress()
  if (selectedAddress.value) state.checkout.addressId = selectedAddress.value.id
  if (!quoteReady.value) return toast('请先确认运费和订单金额')
  submitting.value = true
  try {
    await submitCartOrder()
    toast('订单已创建，请到订单中心完成支付')
    go('orders')
  } catch (error) { toast(error.message) }
  finally { submitting.value = false }
}
onShow(refresh)
</script>
<style scoped>
.cart-loading { padding: 22px 16px 110px; }
.cart-loading-line, .cart-loading-image { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: cart-skeleton 1.4s ease-in-out infinite; }
.cart-loading-line { width: 72%; height: 14px; margin-top: 12px; }
.cart-loading-line.wide { width: 92%; height: 18px; margin-top: 0; }
.cart-loading-line.short { width: 48%; }
.cart-loading-item { display: flex; gap: 12px; padding: 17px 0; margin-top: 16px; border-bottom: 1px solid #e8e4dc; }
.cart-loading-image { width: 84px; height: 84px; flex: 0 0 auto; border-radius: 6px; }
@keyframes cart-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
.cart-list { padding: 20px 16px 110px; }
.fulfillment-switch { display: flex; gap: 8px; margin: 0 0 14px; padding: 4px; border-radius: 8px; background: #f1f3ef; }
.fulfillment-option { flex: 1; min-width: 0; margin: 0; padding: 10px 8px; border: 0; border-radius: 6px; background: transparent; color: #68766e; font-size: 14px; line-height: 1.3; }
.fulfillment-option::after { border: 0; }
.fulfillment-option.active { background: #fff; color: #315243; font-weight: 600; box-shadow: 0 1px 4px rgba(30, 50, 40, .1); }
.cart-address { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0 18px; border-bottom: 1px solid #e8e4dc; background: transparent; text-align: left; }
.cart-coupon { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid #e8e4dc; background: transparent; text-align: left; }
.cart-warning { padding: 11px 12px; margin-top: 14px; border-left: 3px solid #a65047; background: #fff7f5; color: #87443d; font-size: 13px; line-height: 1.5; }
.cart-store-error { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cart-store-error button { flex: 0 0 auto; padding: 0; color: #87443d; background: transparent; font-size: 12px; font-weight: 600; }
.cart-clear-coupon { display: block; width: auto; margin: 8px 0 0 auto; padding: 0; color: #87443d; background: transparent; font-size: 12px; }
.cart-address-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cart-address-main .column { min-width: 0; }
.cart-address-main .muted { display: block; max-width: 270px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cart-item { display: flex; gap: 12px; align-items: center; padding: 14px 0; border-bottom: 1px solid #e8e4dc; }
.cart-image { width: 84px; height: 84px; border-radius: 6px; background: #eee; }
.cart-main { flex: 1; min-width: 0; }
.cart-main .muted { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cart-name { display: block; font-weight: 600; margin-bottom: 5px; }
.cart-item-alert { display: block; margin-top: 6px; color: #a65047; font-size: 12px; }
.cart-adjust { display: block; width: auto; margin: 6px 0 0; padding: 0; background: transparent; color: #275d4d; font-size: 12px; text-align: left; }
.cart-bottom { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
.stepper { display: flex; align-items: center; gap: 10px; }
.stepper button { width: 26px; height: 26px; padding: 0; border: 1px solid #d6d0c6; background: #fff; line-height: 24px; }
.stepper button:disabled { color: #a9ada8; background: #f3f4f1; }
.remove { padding: 0; color: #a49a8d; font-size: 12px; background: transparent; }
.cart-footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 12px; align-items: center; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -4px 16px rgba(0,0,0,.08); }
.cart-total-copy { display: flex; flex-direction: column; gap: 3px; }
.total { color: #a77b2d; font-weight: 700; margin-left: auto; }
.btn { margin: 0; }
.cart-footer .btn:disabled { background: #e6e9e5; color: #66756d; border-color: #e6e9e5; }
.cart-summary { padding: 16px 0; }
.cart-summary > view { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; font-size: 14px; }
@media (max-width: 360px) {
  .cart-footer { gap: 8px; font-size: 12px; }
  .cart-footer .btn { padding-left: 12px; padding-right: 12px; }
}
</style>
