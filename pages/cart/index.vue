<template>
  <PageShell title="购物车">
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
      <view class="fulfillment-switch"><button :class="['fulfillment-option', {active: checkoutMode === 'delivery'}]" @click="setMode('delivery')">平台配送</button><button :class="['fulfillment-option', {active: checkoutMode === 'pickup'}]" @click="setMode('pickup')">门店自提</button></view>
      <button class="cart-address" @click="checkoutMode === 'pickup' ? chooseStore() : chooseAddress()"><view class="cart-address-main"><AppIcon :name="checkoutMode === 'pickup' ? 'shop' : 'pin'" :size="20" tone="brand"/><view class="column"><text>{{ checkoutMode === 'pickup' ? selectedStore?.name || '选择自提门店' : selectedAddress ? selectedAddress.name + ' · ' + selectedAddress.phone : '选择收货地址' }}</text><text class="muted small">{{ checkoutMode === 'pickup' ? storeError || selectedStore?.address : addressError || selectedAddress?.detail }}</text></view></view><AppIcon name="chevron" :size="14" /></button>
      <view class="between"><text class="strong">精选好物 · {{ items.length }} 件商品</text><button class="text-button" :disabled="submitting" @click="managing = !managing">{{ managing ? '完成' : '管理' }}</button></view>
      <view v-for="item in items" :key="item.id" class="cart-item">
        <button class="cart-check" role="checkbox" :disabled="submitting" :aria-label="`选择${item.name}`" :aria-checked="selectedIds.includes(String(item.id))" @click="toggle(item.id)"><text :class="['selection-dot', { checked: selectedIds.includes(String(item.id)) }]">{{ selectedIds.includes(String(item.id)) ? '✓' : '' }}</text></button>
        <image :src="productImage(item.image)" mode="aspectFill" class="cart-image" />
        <view class="cart-main"><text class="cart-name">{{ item.name }}</text><text class="muted">{{ item.spec }}</text><text v-if="itemIssue(item)" class="cart-item-alert">{{ itemIssue(item) }}</text><button v-if="canAdjustToStock(item)" class="cart-adjust" :disabled="submitting" @click="adjustToStock(item)">调整为 {{ item.stock }} 件</button><view class="cart-bottom"><PriceTag :value="item.price" /><view class="stepper"><button :disabled="submitting || Number(item.quantity) <= 1" aria-label="减少数量" @click="change(item, -1)">−</button><text>{{ item.quantity }}</text><button :disabled="submitting || (isApiMode() && Number(item.stock) <= Number(item.quantity))" aria-label="增加数量" @click="change(item, 1)">＋</button></view></view><text v-if="updatingId === String(item.id)" class="cart-update-status" role="status">正在更新数量…</text></view>
        <button class="remove" :disabled="submitting" aria-label="删除商品" @click="remove(item)">删除</button>
      </view>
      <view class="cart-footer"><button class="cart-check-all" role="checkbox" :disabled="submitting" :aria-checked="allSelected" @click="toggleAll"><text :class="['selection-dot', { checked: allSelected }]">{{ allSelected ? '✓' : '' }}</text>全选</button><view class="cart-total-copy"><text>商品合计</text><text class="total">¥{{ (total / 100).toFixed(2) }}</text></view><button class="btn" :disabled="!chosen.length || submitting" @click="managing ? removeSelected() : checkout()">{{ submitting ? '处理中…' : `${managing ? '删除' : '去结算'}（${totalQuantity}）` }}</button></view>
    </view>
    <EmptyState v-else title="购物车是空的" description="去商城挑选喜欢的酒品" button="去商城" @action="go('shop')" />
  </PageShell>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { go, toast, confirm } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
import { state, loadCart, updateCartItem, removeCartItem, prepareCartCheckout, refreshDomain } from '../../services/store.js'
import { stores, loadStoreCatalog } from '../../services/catalog.js'
const items = ref([])
const selectedIds = ref([]), initialized = ref(false), managing = ref(false)
const chosen = computed(() => items.value.filter(item => selectedIds.value.includes(String(item.id))))
const allSelected = computed(() => items.value.length > 0 && chosen.value.length === items.value.length)
function toggle(id) { if (submitting.value) return; id = String(id); selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter(value => value !== id) : [...selectedIds.value, id] }
function toggleAll() { if (submitting.value) return; selectedIds.value = allSelected.value ? [] : items.value.map(item => String(item.id)) }
async function removeSelected() {
  if (submitting.value || loading.value || !chosen.value.length) return
  const ids = chosen.value.map(item => item.id)
  submitting.value = true
  let changed = false
  try { if (!(await confirm('删除商品', `确认删除勾选的 ${ids.length} 款商品？`))) return; changed = true; for (const id of ids) await removeCartItem(id) }
  catch (error) { toast(error.message) }
  finally { if (changed) await refresh(false); submitting.value = false }
}
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const updatingId = ref('')
const storeReady = ref(!isApiMode())
const storeLoading = ref(false)
const storeError = ref('')
const addressReady = ref(!isApiMode())
const addressLoading = ref(false)
const addressError = ref('')
const checkoutMode = computed(() => state.checkout.fulfillmentMode || 'delivery')
const selectedStore = computed(() => storeReady.value && !storeLoading.value
  ? stores.find(store => String(store.storeId ?? store.id) === String(state.checkout.pickupStoreId)) : null)
const selectedAddress = computed(() => addressReady.value && !addressLoading.value
  ? state.addresses.find(item => item.id === state.checkout.addressId) || state.addresses.find(item => item.isDefault) || state.addresses[0] : null)
const totalQuantity = computed(() => chosen.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0))
const total = computed(() => chosen.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))
const unavailableCount = computed(() => chosen.value.filter(item => itemIssue(item)).length)
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
async function refresh(showLoading = true) {
  if (showLoading) loading.value = true
  loadError.value = ''
  try {
    items.value = await loadCart()
    selectedIds.value = initialized.value ? selectedIds.value.filter(id => items.value.some(item => String(item.id) === id)) : items.value.filter(item => !itemIssue(item)).map(item => String(item.id))
    initialized.value = true

  } catch (error) {
    items.value = []
    loadError.value = error.message || '购物车暂时无法获取，请稍后重试'
  } finally { loading.value = false }
}
function chooseAddress() { go('addresses', { select: '1' }) }
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
async function change(item, delta) {
  if (submitting.value || loading.value) return
  const next = Number(item.quantity) + delta
  if (next < 1) return
  if (delta < 0 && canAdjustToStock(item) && next > Number(item.stock)) return adjustToStock(item)
  if (isApiMode() && delta > 0 && next > Number(item.stock)) return
  await mutateCart(() => updateCartItem(item.id, next), item.id)
}
async function adjustToStock(item) {
  if (!canAdjustToStock(item)) return
  await mutateCart(() => updateCartItem(item.id, Number(item.stock)), item.id)
}
async function mutateCart(action, itemId = '') {
  if (submitting.value || loading.value) return
  submitting.value = true
  updatingId.value = String(itemId)
  try { await action() }
  catch (error) { toast(error.message || '操作未完成，请重试') }
  finally {
    // Reconcile after both success and an uncertain network failure before checkout.
    await refresh(false)
    updatingId.value = ''
    submitting.value = false
  }
}
async function remove(item) {
  if (submitting.value || loading.value) return
  await mutateCart(async () => { if (await confirm('删除商品', `确认移除${item.name}？`)) await removeCartItem(item.id) })
}
function checkout() {
  if (submitting.value || loading.value || loadError.value) return
  if (!chosen.value.length) return toast('请先勾选商品')
  if (unavailableCount.value) return toast('请先调整所选商品的数量')
  prepareCartCheckout(chosen.value.map(item => String(item.id)))
  go('checkout')
}
onShow(() => { if (!submitting.value) refresh(); if (checkoutMode.value === 'pickup') refreshStores(); else refreshAddresses() })
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
.fulfillment-option.active { background: #782d3b; color: #faf9f6; font-weight: 600; box-shadow: 0 1px 4px rgba(30, 50, 40, .1); }
.cart-address { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0 18px; border-bottom: 1px solid #e8e4dc; background: transparent; text-align: left; margin-bottom: 16px; }
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
.cart-update-status { display: block; margin-top: 6px; color: #782d3b; font-size: 11px; line-height: 1.5; }
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
.cart-check { width: 30px; min-height: 44px; flex-shrink: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; }
.selection-dot { display: inline-flex; width: 19px; height: 19px; border: 1px solid #cec5c0; border-radius: 50%; align-items: center; justify-content: center; font-size: 12px; color: #faf9f6; }
.selection-dot.checked { background: #782d3b; border-color: #782d3b; }
.cart-check-all { display: flex; align-items: center; gap: 6px; padding: 0; background: transparent; font-size: 12px; min-height: 44px; }
.cart-item { gap: 8px; }.cart-image { width: 64px; height: 82px; flex-shrink: 0; }.cart-name { font-size: 14px; }.cart-main .muted { font-size: 11px; }.cart-total-copy { margin-left: auto; }.cart-footer .btn { font-size: 13px; }.cart-item .remove { display: none; }
</style>
