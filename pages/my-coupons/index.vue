<template>
  <PageShell :title="selecting ? '选择优惠券' : mine ? '我的优惠券' : '领券中心'">
    <view class="filter-tabs">
      <button
        v-for="item in tabs"
        :key="item"
        class="filter-tab"
        :class="{ active: tab === item }"
        @click="tab = item"
      >
        {{ item }}
      </button>
    </view>
    <view v-if="loading" class="coupon-list coupon-loading" aria-label="正在加载优惠券">
      <view v-for="item in 2" :key="item" class="coupon-loading-card">
        <view class="coupon-loading-value" />
        <view class="coupon-loading-body">
          <view class="coupon-loading-line coupon-loading-line--title" />
          <view class="coupon-loading-line coupon-loading-line--description" />
          <view class="coupon-loading-line coupon-loading-line--action" />
        </view>
      </view>
    </view>
    <view v-else-if="loadError" class="coupon-list">
      <EmptyState title="优惠券暂时无法加载" :description="loadError" button="重新加载" icon="coupon" @action="loadCoupons" />
    </view>
    <view v-else class="coupon-list">
      <CouponCard
        v-for="coupon in filtered"
        :key="coupon.id"
        :coupon="coupon"
        :badge="!mine && !selecting && coupon.channel !== '活动领取'"
        :mine="mine || selecting"
        :action-label="label(coupon)"
        :disabled="disabled(coupon)"
        :reason="selecting ? eligibility(coupon) : ''"
        @action="handle"
        @rules="rules"
      />
      <EmptyState
        v-if="!filtered.length"
        title="这里还没有优惠券"
        :description="mine ? '去领券中心看看正在进行的活动' : '暂时没有符合条件的优惠券'"
        :button="mine ? '去领券' : ''"
        icon="coupon"
        @action="go('coupons')"
      />
      <button v-if="selecting" class="btn btn-outline coupon-list-footer" @click="choose(null)">
        不使用优惠券
      </button>
      <button v-else-if="!mine" class="btn btn-light coupon-list-footer" @click="go('my-coupons')">
        <AppIcon name="coupon" />
        我的优惠券
        <AppIcon name="arrow" />
      </button>
      <view v-else class="notice section-space">
        <AppIcon name="info" :size="20" />
        <text>
          代金券用于购物抵扣，不可提现。
          <br />
          适用范围以券规则为准。
        </text>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import CouponCard from '../../components/CouponCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { couponTemplates, getProduct, loadCouponCatalog, loadProductSkus } from '../../services/catalog.js'
import { state, claimCoupon, couponClaimLimitReached, loadCart, persist } from '../../services/store.js'
import { couponEligibility } from '../../services/pricing.js'
import { go, back, toast } from '../../services/navigation.js'
import { onShow } from '@dcloudio/uni-app'
import { isApiMode } from '../../services/config.js'
import { refreshDomain } from '../../services/store.js'
const props = defineProps({ mine: { type: Boolean, default: true } }),
  mode = ref(''),
  tab = ref('全部'),
  source = ref('product'),
  selectedSkuPrice = ref(null),
  mine = ref(props.mine),
  loading = ref(true),
  loadError = ref(''),
  claiming = ref('')
onLoad((q) => {
  mode.value = q.mode || ''
  source.value = q.source === 'cart' ? 'cart' : 'product'
  mine.value = q.mine === '1' || props.mine
  tab.value = mode.value === 'select' ? '全部' : mine.value ? '未使用' : '全部'
})
async function loadCoupons() {
  loading.value = true
  loadError.value = ''
  try {
    await loadCouponCatalog(selecting.value && source.value !== 'cart')
    if (selecting.value && source.value === 'cart') await loadCart()
    if (selecting.value && source.value === 'product' && state.checkout.skuCode) {
      const skus = await loadProductSkus(state.checkout.productId)
      const selected = skus.find(item => item.skuCode === state.checkout.skuCode)
      if (!selected) throw new Error('商品规格已变化，请返回商品页重新选择')
      selectedSkuPrice.value = selected.price
    } else selectedSkuPrice.value = null
    if (isApiMode()) await refreshDomain('coupons')
  }
  catch (error) { loadError.value = error.message || '优惠券信息暂时无法获取，请稍后重试' }
  finally { loading.value = false }
}
onShow(loadCoupons)
const selecting = computed(() => mode.value === 'select'),
  tabs = computed(() =>
    selecting.value
      ? ['全部', '可用', '不可用']
      : mine.value
        ? ['未使用', '已使用', '已过期']
        : ['全部', '节日活动', '社群专享'],
  )
const lines = computed(() => {
  if (selecting.value && source.value === 'cart')
    return (state.cart || []).map(item => ({
      productId: item.productId,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }))
  const p = getProduct(state.checkout.productId)
  return p
    ? [
        {
          productId: p.id,
          price: selectedSkuPrice.value ?? p.price,
          quantity: state.checkout.quantity,
        },
      ]
    : []
})
const eligibility = (c) => couponEligibility(c, lines.value)
const filtered = computed(() => {
  if (selecting.value)
    return state.coupons
      .filter((c) => c.status === 'unused')
      .filter(
        (c) => tab.value === '全部' || (tab.value === '可用' ? !eligibility(c) : !!eligibility(c)),
      )
  if (mine.value)
    return state.coupons.filter((c) =>
      tab.value === '未使用'
        ? ['unused', 'locked'].includes(c.status) && c.expiresAt > Date.now()
        : tab.value === '已使用'
          ? c.status === 'used'
          : c.expiresAt <= Date.now() && c.status !== 'used',
    )
  return couponTemplates.filter(
    (c) => !c.pointsOnly && (tab.value === '全部' || c.channel === tab.value),
  )
})
function label(c) {
  if (selecting.value) return state.checkout.couponId === c.id ? '已选择' : '选择'
  if (mine.value)
    return c.status === 'locked'
      ? '订单占用'
      : tab.value === '未使用'
        ? '去使用'
        : tab.value === '已使用'
          ? '已使用'
          : '已过期'
  return claiming.value === c.id ? '领取中' : couponClaimLimitReached(c.id) ? '已领取' : '领取'
}
function disabled(c) {
  return selecting.value
    ? !!eligibility(c)
    : mine.value
      ? tab.value !== '未使用' || c.status === 'locked'
      : !!claiming.value || couponClaimLimitReached(c.id)
}
function choose(c) {
  state.checkout.couponId = c?.id || null
  persist()
  back()
}
async function handle(c) {
  if (selecting.value) return choose(c)
  if (mine.value) return go('shop')
  if (claiming.value) return
  claiming.value = c.id
  try {
    await claimCoupon(c.id)
    toast('领取成功，可在我的优惠券中查看')
  } catch (error) { toast(error.message) }
  finally { claiming.value = '' }
}
function rules(c) {
  go('rules', { type: 'coupon', id: c.templateId || c.id })
}
</script>
