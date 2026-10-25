<template>
  <PageShell title="积分兑换">
    <view v-if="loading" class="points-loading" aria-label="正在加载积分权益">
      <view class="points-loading-hero" />
      <view class="points-loading-line wide" />
      <view class="points-loading-line" />
      <view class="points-loading-line short" />
    </view>
    <EmptyState
      v-else-if="loadError"
      title="积分权益暂时无法加载"
      :description="loadError"
      button="重新加载"
      icon="coin"
      @action="loadPoints"
    />
    <template v-else>
    <view class="points-hero">
      <image :src="assetUrl('/static/design/detail-scene-clean.jpg', 'brand.points')" mode="aspectFill" />
      <view class="points-info">
        <text class="block small">可用积分 ›</text>
        <text class="points-balance">{{ state.points.toLocaleString() }}</text>
      </view>
      <button class="points-detail-link text-button" @click="go('records', { type: 'points' })">
        积分明细
        <AppIcon name="arrow" tone="light" :size="17" />
      </button>
      <button class="points-signin btn btn-small" :disabled="signingIn" @click="signIn">{{ signingIn ? '正在签到' : '每日签到领积分' }}</button>
    </view>
    <view class="exchange-tabs">
      <view class="filter-tabs">
        <button
          v-for="item in ['全部', '优惠券', '实物']"
          :key="item"
          class="filter-tab"
          :class="{ active: tab === item }"
          @click="tab = item"
        >
          {{ item }}
        </button>
      </view>
    </view>
    <view class="section">
      <view v-for="item in filtered" :key="item.id" class="exchange-item">
        <image :src="item.image" class="exchange-image" mode="aspectFill" />
        <view class="exchange-content grow">
          <text class="exchange-name block">{{ item.name }}</text>
          <text v-if="item.kind === 'goods'" class="muted small block">{{ item.redeemStoreName || '合作门店均可兑换' }}</text>
          <view class="exchange-bottom">
            <text class="exchange-points">
              {{ item.points }}
              <text style="font-size: 15px">积分</text>
            </text>
            <button
              class="btn btn-small"
              :class="{ 'exchange-unavailable': !hasStock(item) || state.points < item.points }"
              :disabled="Boolean(busy) || !hasStock(item) || state.points < item.points"
              @click="exchange(item)"
            >
              {{ exchangeLabel(item) }}
            </button>
          </view>
        </view>
      </view>
      <EmptyState
        v-if="!filtered.length"
        title="暂无可兑换权益"
        description="后台尚未发布可兑换的优惠券或实物奖品"
        button="查看积分规则"
        icon="coin"
        @action="go('rules', { type: 'points' })"
      />
      <view class="notice section-space">
        <AppIcon name="info" :size="19" />
        <text>兑换后可在我的优惠券或我的奖品中查看。</text>
      </view>
      <view class="center section-space">
        <button class="text-button" @click="go('rules', { type: 'points' })">
          积分规则
          <AppIcon name="arrow" :size="18" />
        </button>
      </view>
    </view>
    </template>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { exchangeProducts, loadExchangeCatalog } from '../../services/catalog.js'
import { state, exchangeReward, refreshDomain, signInPoints } from '../../services/store.js'
import { go, toast, confirm } from '../../services/navigation.js'
import { onShow } from '@dcloudio/uni-app'
import { isApiMode, assetUrl } from '../../services/config.js'
const tab = ref('全部'),
  loading = ref(true),
  loadError = ref(''),
  busy = ref(''),
  signingIn = ref(false),
  filtered = computed(() =>
    exchangeProducts.filter(
      (p) => tab.value === '全部' || p.kind === (tab.value === '优惠券' ? 'coupon' : 'goods'),
    ),
  )
async function loadPoints() {
  loading.value = true
  loadError.value = ''
  try { await loadExchangeCatalog(); if (isApiMode()) await refreshDomain('points') }
  catch (error) { loadError.value = error.message || '积分权益暂时无法获取，请稍后重试' }
  finally { loading.value = false }
}
onShow(loadPoints)
function hasStock(item) {
  const stock = Number(isApiMode() ? item.stock : state.exchangeStock[item.id])
  return stock === -1 || stock > 0
}
function exchangeLabel(item) {
  if (busy.value === item.id) return '兑换中'
  if (!hasStock(item)) return '已兑完'
  return state.points < item.points ? '积分不足' : '兑换'
}
async function exchange(item) {
  if (busy.value) return
  if (!hasStock(item)) return toast('该奖品已兑完')
  if (state.points < item.points) return toast('积分不足，暂时无法兑换')
  busy.value = item.id
  try {
    if (
      !(await confirm(
        '确认兑换',
        `使用${item.points}积分兑换${item.name}？${isApiMode() ? '积分将由服务端校验并扣减。' : '本次使用演示积分。'}`,
        '确认兑换',
      ))
    )
      return
    const kind = await exchangeReward(item.id)
    if (
      await confirm(
        '兑换成功',
        kind === 'coupon' ? '代金券已放入我的优惠券。' : '奖品已放入我的奖品，可查看兑换码。',
        '立即查看',
      )
    )
      go(kind === 'coupon' ? 'my-coupons' : 'awards')
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = ''
  }
}
async function signIn() {
  if (signingIn.value) return
  signingIn.value = true
  try { await signInPoints(); toast('签到成功，积分已到账') } catch (error) { toast(error.message) }
  finally { signingIn.value = false }
}
</script>

<style scoped>
.points-loading { padding: 12px 16px 30px; }
.points-loading-hero, .points-loading-line { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: points-skeleton 1.4s ease-in-out infinite; }
.points-loading-hero { height: 206px; border-radius: 8px; }
.points-loading-line { width: 76%; height: 16px; margin: 18px 0 0; }
.points-loading-line.wide { width: 92%; height: 24px; margin-top: 24px; }
.points-loading-line.short { width: 48%; }
@keyframes points-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
