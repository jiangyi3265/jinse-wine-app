<template>
  <PageShell title="推广中心" dark active="promotion" :back-button="false">
    <view v-if="promotionLoading" class="promotion-hero promotion-loading" aria-label="正在加载推广数据">
      <view class="promotion-loading-row promotion-loading-row--head" />
      <view class="promotion-loading-total" />
      <view class="promotion-loading-splits">
        <view v-for="item in 3" :key="item" class="promotion-loading-split" />
      </view>
      <view class="promotion-loading-button" />
    </view>
    <view v-else class="promotion-hero">
      <view class="row">
        <view class="promotion-avatar">{{ state.user.name.slice(0, 1) }}</view>
        <view class="grow column">
          <text>{{ state.user.name }}</text>
          <text class="member-badge">♔ {{ promoterLabel }}</text>
        </view>
        <button class="text-button small" @click="go('rules', { type: 'promotion' })">
          推广规则 →
        </button>
      </view>
      <view class="promotion-total">
        <text class="promotion-total-label">可提现佣金（元）</text>
        <view class="promotion-money">
          <text class="currency">{{ loadError ? '' : '¥' }}</text>
          {{ loadError ? '—' : (settled / 100).toFixed(2) }}
        </view>
        <button class="btn btn-small promotion-withdraw" :disabled="Boolean(loadError) || promotionLoading || withdrawing || settled < minWithdrawCent" @click="withdrawOpen = true">申请提现</button>
      </view>
      <view class="promotion-splits">
        <view>
          <text class="small block">待结算</text>
          <text class="serif">{{ loadError ? '—' : `¥${(pending / 100).toFixed(2)}` }}</text>
        </view>
        <view>
          <text class="small block">累计佣金</text>
          <text class="serif">{{ loadError ? '—' : `¥${(total / 100).toFixed(2)}` }}</text>
        </view>
        <view>
          <text class="small block">已到账</text>
          <text class="serif">{{ loadError ? '—' : `¥${(paid / 100).toFixed(2)}` }}</text>
        </view>
      </view>
    </view>
    <view class="promotion-content">
      <ProductReferral detailed @rules="promotionRulesOpen = true" />
      <view v-if="loadError" class="notice promotion-error">
        <AppIcon name="info" :size="19" />
        <view class="grow column">
          <text>{{ loadError }}</text>
          <button class="text-button" @click="loadPromotion">重新加载</button>
        </view>
      </view>
      <view class="promotion-entry-grid">
        <button @click="go('poster')"><AppIcon name="export" :size="25" /><text>推广海报</text></button>
        <button @click="go('team')"><AppIcon name="users" :size="25" /><text>我的团队</text></button>
        <button @click="go('ranking')"><AppIcon name="trophy" :size="25" /><text>推广排行</text></button>
        <button @click="go('records', { type: 'commission' })"><AppIcon name="wallet" :size="25" /><text>佣金明细</text></button>
      </view>
      <CommissionTransfers />
      <view class="section-heading section-space">
        <text class="section-title serif">佣金明细</text>
        <button class="text-button small" @click="go('records', { type: 'commission' })">全部明细 <AppIcon name="chevron" :size="16" /></button>
      </view>
      <view v-if="promotionLoading" class="commission-loading" aria-label="正在加载佣金明细">
        <view v-for="item in 3" :key="item" class="commission-loading-row" />
      </view>
      <button v-else-if="commissionItems.length"
        v-for="(p, index) in commissionItems"
        :key="p.id"
        class="commission-row"
        style="width: 100%; text-align: left"
        @click="go('records', { type: 'commission' })"
      >
        <image v-if="p.image" :src="p.image" mode="aspectFill" />
        <view class="grow">
          <text class="strong block">{{ p.title || p.name || '推广佣金' }}</text>
          <text class="small muted">{{ p.orderId ? `关联订单 #${p.orderId}` : p.spec || '佣金流水' }}</text>
        </view>
        <text :class="['badge', commissionTone(p)]">
          {{ commissionStatus(p) }}
        </text>
        <text :class="['amount', { 'recovery-amount': Number(p.amount) < 0 } ]">{{ commissionAmount(p.amount) }}</text>
        <AppIcon name="chevron" :size="15" />
      </button>
      <view v-else class="commission-empty">{{ loadError ? '佣金明细暂不可用' : '暂无佣金记录' }}</view>
      <text v-if="!isApiMode()" class="profile-demo">演示推广业绩，实际佣金以服务端结算为准</text>
    </view>
    <view v-if="withdrawOpen" class="sheet-backdrop" @click="closeWithdraw">
      <view class="sheet withdraw-sheet" @click.stop>
        <view class="section-heading"><text class="sheet-title">佣金提现</text><button class="icon-button" aria-label="关闭提现窗口" :disabled="withdrawing" @click="closeWithdraw"><AppIcon name="close" :size="22" /></button></view>
        <text class="small muted block">提现金额</text>
        <view class="withdraw-amount"><text>¥</text><text>{{ (settled / 100).toFixed(2) }}</text><text class="small muted">全部提现</text></view>
        <text class="small muted block">满 {{ (minWithdrawCent / 100).toFixed(2) }} 元可申请，提交后由财务审核发放。</text>
        <view class="notice section-space"><AppIcon name="info" :size="18" /><text>仅已结算佣金可提现，退款将相应扣回佣金。到账结果可在提现记录中查看。</text></view>
        <button class="btn" :disabled="withdrawing || settled < minWithdrawCent || Boolean(loadError)" @click="withdrawAll(true)">{{ withdrawing ? '正在提交' : '确认提现' }}</button>
      </view>
    </view>
    <ActivityRules v-model="promotionRulesOpen" type="promotion" />
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import CommissionTransfers from '../../components/CommissionTransfers.vue'
import ProductReferral from '../../components/ProductReferral.vue'
import ActivityRules from '../../components/ActivityRules.vue'
import AppIcon from '../../components/AppIcon.vue'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { state, refreshDomain, withdrawCommission } from '../../services/store.js'
import { products } from '../../services/catalog.js'
import { go, toast } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
const total = computed(() => state.promotion?.total || 0)
const promotionRulesOpen = ref(false)
const pending = computed(() => state.promotion?.pending || 0)
const settled = computed(() => state.promotion?.settled || 0)
const paid = computed(() => state.promotion?.paid || 0)
const teamCount = computed(() => state.promotion?.teamCount || 0)
const minWithdrawCent = computed(() => {
  const configured = Number(state.promotion?.minWithdrawCent)
  return Number.isFinite(configured) && configured > 0 ? configured : 1000
})
const promoterLabel = computed(() => state.user.role === 'staff' ? '员工推广员' : '客户推广员')
const withdrawing = ref(false)
const withdrawOpen = ref(false)
function closeWithdraw() {
  if (!withdrawing.value) withdrawOpen.value = false
}
const promotionLoading = ref(true)
const loadError = ref('')
const commissionStatus = (record) => {
  if (Number(record.amount) < 0) return ({ settled: '待抵扣', processing: '抵扣处理中', paid: '已抵扣' }[record.status] || '退款冲回')
  if (record.refundRecoveryRequired) return '退款待追偿'
  return ({ pending: '待结算', settled: '可提现', processing: '提现处理中', paid: '已提现', closed: '已关闭' }[record.status] || '状态更新中')
}
const commissionTone = (record) => {
  if (Number(record.amount) < 0 || record.refundRecoveryRequired) return 'badge-gold'
  return ({ settled: 'badge-green', pending: 'badge-gold', paid: 'badge-muted' }[record.status] || 'badge-muted')
}
const commissionAmount = (amount) => `${Number(amount) < 0 ? '-' : '+'}¥${(Math.abs(Number(amount) || 0) / 100).toFixed(2)}`
const commissionItems = computed(() => {
  if (loadError.value) return []
  if (state.promotion?.records?.length) return state.promotion.records.slice(0, 3)
  return isApiMode() ? [] : products.slice(0, 2).map((product, index) => ({
    ...product, status: index ? 'pending' : 'settled', amount: index ? 0 : 3980,
  }))
})
async function loadPromotion() {
  promotionLoading.value = true
  loadError.value = ''
  try { if (isApiMode()) await refreshDomain('promotion') }
  catch (error) { loadError.value = error.message || '推广数据暂时无法获取，请稍后重试' }
  finally { promotionLoading.value = false }
}
onShow(loadPromotion)
async function withdrawAll(confirmed = false) {
  if (withdrawing.value || loadError.value || settled.value < minWithdrawCent.value) return
  if (!confirmed && !(await new Promise(resolve => uni.showModal({ title: '申请提现', content: `申请提现全部可提现佣金 ¥${(settled.value / 100).toFixed(2)}？`, success: result => resolve(result.confirm), fail: () => resolve(false) })))) return
  withdrawing.value = true
  try {
    const result = await withdrawCommission(settled.value)
    withdrawOpen.value = false
    toast(({ paid: '提现已完成，请查看佣金记录', failed: '提现申请已退回，请查看佣金记录',
      processing: '提现审核中，等待财务付款' })[result.status] || '提现申请已提交，等待财务审核')
    try { await refreshDomain('promotion'); loadError.value = '' }
    catch { loadError.value = '提现状态已更新，佣金明细暂时无法同步，请重新加载' }
  }
  catch (error) { toast(error.message) }
  finally { withdrawing.value = false }
}
</script>
<style scoped>
.withdraw-button { width: 100%; margin-top: 16px; min-height: 42px; border: 1px solid rgba(234, 209, 162, .55); color: #f4e1b8; background: rgba(255, 255, 255, .08); font-size: 14px; }
.withdraw-button:disabled { opacity: .62; }
.commission-row .recovery-amount { color: #9d4944; }
.promotion-error { margin-bottom: 14px; align-items: flex-start; }
.promotion-loading { min-height: 260px; }
.promotion-loading-row, .promotion-loading-total, .promotion-loading-split, .promotion-loading-button, .commission-loading-row { background: linear-gradient(100deg, rgba(255,255,255,.08) 20%, rgba(255,255,255,.2) 38%, rgba(255,255,255,.08) 56%); background-size: 300% 100%; animation: promotion-shimmer 1.4s ease-in-out infinite; }
.promotion-loading-row--head { width: 46%; height: 16px; border-radius: 8px; }
.promotion-loading-total { width: 42%; height: 42px; margin-top: 30px; border-radius: 8px; }
.promotion-loading-splits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 28px; }
.promotion-loading-split { height: 32px; border-radius: 6px; }
.promotion-loading-button { height: 42px; margin-top: 22px; border-radius: 5px; }
.commission-loading { display: grid; gap: 10px; }
.commission-loading-row { height: 58px; border-top: 1px solid #e8ece7; background: linear-gradient(100deg, #f0eee8 20%, #f8f7f3 38%, #f0eee8 56%); background-size: 300% 100%; }
.commission-empty { padding: 18px 0; color: #98a19c; font-size: 13px; }
@keyframes promotion-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
