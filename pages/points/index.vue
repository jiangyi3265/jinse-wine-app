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
      <view class="points-info">
        <text class="block small">可用积分 ›</text>
        <text class="points-balance">{{ state.points.toLocaleString() }}</text>
      </view>
      <button class="points-detail-link text-button" @click="go('records', { type: 'points' })">
        积分明细
        <AppIcon name="arrow" tone="light" :size="17" />
      </button>
      <button class="points-rewards" @click="go('awards')">我的兑换 ›</button>
    </view>
    <view class="points-guide">
      <button class="points-guide-toggle" :aria-expanded="guideExpanded" @click="guideExpanded = !guideExpanded"><text class="strong">积分怎么获得？</text><text class="muted small">{{ guideExpanded ? '收起 −' : '展开 ＋' }}</text></button>
      <view v-if="guideExpanded" class="points-guide-body">
        <view v-for="section in guide.slice(0, 2)" :key="section.heading" class="points-guide-section"><text class="strong block">{{ section.heading }}</text><text v-for="line in section.lines" :key="line" class="muted block">{{ line }}</text></view>
        <text v-if="!guide.length" class="muted block">{{ contentError || '获取方式请查看积分规则。' }}</text>
        <button class="text-button small" @click="go('rules', { type: 'points' })">查看完整积分规则 ›</button>
      </view>
    </view>
    <view class="exchange-tabs">
      <view class="filter-tabs">
        <button
          v-for="item in ['全部', '电子券', '优惠券', '实物']"
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
      <view class="exchange-grid">
      <view v-for="item in filtered" :key="item.id" class="exchange-item">
        <image v-if="item.image" :src="item.image" class="exchange-image" :mode="item.kind === 'voucher' ? 'aspectFit' : 'aspectFill'" @click="openDetails(item)" /><view v-else class="exchange-image voucher-cover" @click="openDetails(item)"><AppIcon name="coupon" :size="32" /><text>电子券</text></view>
        <view class="exchange-content grow">
          <text class="exchange-name block">{{ item.name }}</text>
          <text v-if="item.spec" class="muted small block">{{ item.spec }}</text>
          <text v-if="['goods', 'voucher'].includes(item.kind)" class="muted small block">{{ details[item.id]?.venue || item.redeemStoreName || '使用地点详见券面说明' }}</text>
          <button class="exchange-info-link text-button small" @click="openDetails(item)">图片与使用说明 ›</button>
          <view class="exchange-bottom">
            <text class="exchange-points">
              {{ item.points }}
              <text style="font-size: 15px">积分</text>
            </text>
            <button
              class="btn btn-small"
              :class="{ 'exchange-unavailable': !hasStock(item) || state.points < item.points }"
              :disabled="Boolean(busy) || !hasStock(item) || state.points < item.points"
              @click="selectedReward = item"
            >
              {{ exchangeLabel(item) }}
            </button>
          </view>
        </view>
      </view>
      </view>
      <EmptyState
        v-if="!filtered.length"
        title="暂无可兑换权益"
        description="暂无可兑换的电子券或礼品，请稍后再来"
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
    <view v-if="detailReward" class="sheet-backdrop" @click="detailReward = null">
      <view class="sheet exchange-detail-sheet" @click.stop>
        <view class="section-heading"><text class="sheet-title">{{ detailReward.name }}</text><button class="icon-button" aria-label="关闭使用说明" @click="detailReward = null"><AppIcon name="close" :size="22" /></button></view>
        <scroll-view scroll-y class="exchange-detail-scroll">
          <text class="amount block">{{ detailReward.points }} 积分</text>
          <text class="muted block">{{ detailReward.spec }}</text>
          <view v-for="section in detailSections" :key="section.heading" class="exchange-use-section"><text class="strong block">{{ section.heading }}</text><text v-for="line in section.lines" :key="line" class="muted block">{{ line }}</text></view>
          <view v-for="image in detailImages" :key="image.url" class="exchange-detail-photo"><image :src="image.url" mode="widthFix" /><text v-if="image.caption" class="muted small block">{{ image.caption }}</text></view>
        </scroll-view>
        <button class="btn" :disabled="Boolean(busy) || !hasStock(detailReward) || state.points < detailReward.points" @click="confirmFromDetails">{{ exchangeLabel(detailReward) === '兑换' ? '去兑换' : exchangeLabel(detailReward) }}</button>
      </view>
    </view>
    <view v-if="selectedReward" class="sheet-backdrop" @click="closeExchange">
      <view class="sheet exchange-sheet" @click.stop>
        <view class="section-heading">
          <text class="sheet-title">确认兑换</text>
          <button class="icon-button" aria-label="关闭兑换窗口" :disabled="Boolean(busy)" @click="closeExchange"><AppIcon name="close" :size="22" /></button>
        </view>
        <view class="exchange-sheet-product">
          <image v-if="selectedReward.image" :src="selectedReward.image" mode="aspectFill" />
          <AppIcon v-else name="gift" tone="brand" :size="50" />
          <view class="grow column"><text class="strong">{{ selectedReward.name }}</text><text class="muted">{{ selectedReward.spec }}</text><text class="amount">{{ selectedReward.points }} 积分</text></view>
        </view>
        <view class="summary-row"><text class="muted">兑换数量</text><text>1 件</text></view>
        <view class="summary-row"><text class="muted">当前积分</text><text>{{ state.points }}</text></view>
        <view class="summary-row"><text class="muted">兑换后剩余</text><text class="amount">{{ Math.max(0, state.points - selectedReward.points) }} 积分</text></view>
        <text v-if="details[selectedReward.id]?.venue" class="exchange-confirm-venue muted block">使用地点：{{ details[selectedReward.id].venue }}</text>
        <view class="notice section-space"><AppIcon name="info" :size="18" /><text>{{ selectedReward.kind === 'coupon' ? '兑换成功后，可在我的优惠券中查看使用规则。' : '兑换成功后，可在我的奖品中查看使用方式与兑换码。' }}</text></view>
        <button class="btn" :disabled="Boolean(busy) || !hasStock(selectedReward) || state.points < selectedReward.points" @click="exchange(selectedReward, true)">{{ busy ? '正在兑换' : '确认兑换' }}</button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { exchangeProducts, loadExchangeCatalog } from '../../services/catalog.js'
import { state, exchangeReward, refreshDomain } from '../../services/store.js'
import { go, toast, confirm } from '../../services/navigation.js'
import { onShow } from '@dcloudio/uni-app'
import { isApiMode } from '../../services/config.js'
import { loadPointsContent } from '../../services/points-content.js'
const tab = ref('全部'),
  loading = ref(true),
  loadError = ref(''),
  busy = ref(''),
  filtered = computed(() =>
    exchangeProducts.filter(
      (p) => tab.value === '全部' || p.kind === ({ 电子券: 'voucher', 优惠券: 'coupon', 实物: 'goods' })[tab.value],
    ),
  )
const selectedReward = ref(null)
const guide = ref([]), details = ref({}), contentError = ref(''), guideExpanded = ref(true), detailReward = ref(null)
const detailSections = computed(() => details.value[detailReward.value?.id]?.sections || [{ heading: '兑换后如何使用', lines: [detailReward.value?.kind === 'coupon' ? '在「我的优惠券」查看适用范围、使用门槛及有效期。' : '在「我的奖品」查看兑换码，使用前请联系对应服务方确认。'] }])
const detailImages = computed(() => {
  const item = detailReward.value
  const images = details.value[item?.id]?.images || []
  return images.length ? images : item?.image ? [{ url: item.image, caption: item.name }] : []
})
function openDetails(item) { detailReward.value = item }
function confirmFromDetails() {
  if (!detailReward.value || busy.value || !hasStock(detailReward.value) || state.points < detailReward.value.points) return
  selectedReward.value = detailReward.value
  detailReward.value = null
}
function closeExchange() {
  if (!busy.value) selectedReward.value = null
}
async function loadPoints() {
  loading.value = true
  loadError.value = ''
  try {
    const contentTask = isApiMode() ? loadPointsContent().then(content => {
      guide.value = content.guide; details.value = content.details; contentError.value = ''
    }).catch(() => { guide.value = []; details.value = {}; contentError.value = '说明暂时无法加载，请稍后重试。' }) : Promise.resolve()
    await Promise.all([loadExchangeCatalog(), contentTask, isApiMode() ? refreshDomain('points') : Promise.resolve()])
  }
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
async function exchange(item, confirmed = false) {
  if (busy.value) return
  if (!hasStock(item)) return toast('该奖品已兑完')
  if (state.points < item.points) return toast('积分不足，暂时无法兑换')
  busy.value = item.id
  try {
    if (
      !confirmed && !(await confirm(
        '确认兑换',
        `使用${item.points}积分兑换${item.name}？${item.kind === 'voucher' ? '电子券将存入我的奖品，请按券面规则预约使用。' : '兑换成功后可在个人中心查看。'}`,
        '确认兑换',
      ))
    )
      return
    const kind = await exchangeReward(item.id)
    selectedReward.value = null
    if (
      await confirm(
        '兑换成功',
        kind === 'coupon' ? '代金券已放入我的优惠券。' : kind === 'voucher' ? '电子券已放入我的奖品，请按券面规则预约使用。' : '奖品已放入我的奖品，可查看兑换码。',
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
</script>

<style scoped>
.points-guide { margin: 16px; border-bottom: 1px solid #e9e5e1; padding-bottom: 14px; }
.points-guide-toggle { display: flex; align-items: center; justify-content: space-between; padding: 0; margin: 0; width: 100%; background: transparent; text-align: left; font-size: 16px; line-height: 40px; }
.points-guide-toggle::after { border: 0; }
.points-guide-body { font-size: 13px; line-height: 1.8; }
.points-guide-section { margin: 8px 0 12px; }
.exchange-info-link { align-self: flex-start; font-size: 11px; padding: 6px 0; margin-top: 4px; }
.exchange-detail-scroll { height: 54vh; }
.exchange-use-section { margin: 18px 0; font-size: 14px; line-height: 1.8; }
.exchange-detail-photo { margin: 20px 0; }
.exchange-detail-photo image { width: 100%; display: block; border-radius: 8px; }
.exchange-detail-photo text { margin-top: 8px; line-height: 1.7; }
.exchange-confirm-venue { margin-top: 14px; font-size: 13px; line-height: 1.7; }
.voucher-cover { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#78623d; background:#f3ede2; font-size:13px; }
.points-brand { position:absolute; right:24px; top:34px; display:flex; flex-direction:column; align-items:center; justify-content:center; width:88px; height:132px; border:1px solid #d8b779; color:#e9d3a6; font-size:28px; font-family:serif; letter-spacing:4px; opacity:.65; }
.points-brand text { font-size:11px; letter-spacing:2px; margin-top:16px; }
.points-loading { padding: 12px 16px 30px; }
.points-loading-hero, .points-loading-line { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: points-skeleton 1.4s ease-in-out infinite; }
.points-loading-hero { height: 206px; border-radius: 8px; }
.points-loading-line { width: 76%; height: 16px; margin: 18px 0 0; }
.points-loading-line.wide { width: 92%; height: 24px; margin-top: 24px; }
.points-loading-line.short { width: 48%; }
@keyframes points-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
