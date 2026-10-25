<template>
  <PageShell title="门店核销">
    <view v-if="loading" class="verification-loading" aria-label="正在加载核销权限">
      <view class="verification-loading-header" />
      <view class="verification-loading-toolbar" />
      <view class="verification-loading-card" />
      <view class="verification-loading-card verification-loading-card--short" />
    </view>
    <view v-else-if="loadError" class="verification-error section">
      <AppIcon name="info" tone="gold" :size="30" />
      <text class="section-title serif">核销服务暂时不可用</text>
      <text class="muted center">{{ loadError }}</text>
      <button class="btn" @click="loadVerification">重新加载</button>
    </view>
    <view v-else-if="state.user.role === 'staff'" class="section">
      <view class="staff-header">
        <image :src="assetUrl('/static/design/store.jpg', 'brand.store')" mode="aspectFill" />
        <view class="grow column">
          <text class="store-name">{{ state.user.staffStoreName || '当前核销门店' }}</text>
          <text v-if="state.user.staffStoreAddress" class="muted small">{{ state.user.staffStoreAddress }}</text>
          <text class="member-badge ink" style="border-color: #496356">♙ 核销员</text>
        </view>
        <AppIcon name="chevron" :size="18" />
      </view>
      <view class="staff-scan">
        <AppIcon name="scan" :size="32" />
        <text class="grow small">扫描核销码</text>
        <button class="btn btn-small btn-outline" :disabled="busy" @click="scan">扫码核销</button>
      </view>
      <view class="verification-modes">
        <button :disabled="busy" :class="['mode-option', { active: activeKind === 'award' }]" @click="switchKind('award')">实物奖品</button>
        <button :disabled="busy" :class="['mode-option', { active: activeKind === 'order' }]" @click="switchKind('order')">商城自提</button>
      </view>
      <view class="between section-heading">
        <text class="section-title serif">{{ activeKind === 'order' ? '商城订单核销' : '待确认奖品' }}</text>
        <button class="text-button small" @click="manual = true">输入核销码</button>
      </view>
      <view v-if="manual" class="search-box" style="margin: 0 0 16px">
        <input v-model="codeInput" :disabled="busy" @input="clearLookup" :placeholder="activeKind === 'order' ? '请输入商城订单号' : '请输入奖品兑换码'" aria-label="核销码" />
        <button :disabled="busy || querying" @click="lookup">{{ querying ? '查询中' : '查询' }}</button>
      </view>
      <view v-if="queryError" class="lookup-feedback" role="alert">
        <AppIcon name="info" tone="gold" :size="20" />
        <text>{{ queryError }}</text>
      </view>
      <text v-else-if="querying" class="muted small block">正在查询，请稍候…</text>
      <view v-if="activeKind === 'order' && pickupOrder" class="staff-prize pickup-order-card">
        <view class="grow column">
          <text class="section-title serif">商城自提订单</text>
          <text class="muted small">订单号 {{ pickupOrder.orderNo }}</text>
          <text class="muted small">{{ pickupOrder.storeName }} · {{ pickupOrder.storeAddress }}</text>
          <view v-for="(item, index) in pickupOrder.items || []" :key="index" class="between pickup-order-item">
            <text>{{ item.name }} {{ item.spec }}</text><text>× {{ item.quantity }}</text>
          </view>
          <view class="between pickup-order-item"><text>订单状态</text><text :class="['pickup-status', `pickup-status--${pickupOrder.status}`]">{{ pickupStatusLabel(pickupOrder.status) }}</text></view>
        </view>
        <button class="btn" :disabled="busy || pickupOrder.status !== 'paid'" @click="verifyPickupOrder">{{ pickupOrder.status === 'paid' ? '确认交付并核销' : pickupActionLabel(pickupOrder.status) }}</button>
      </view>
      <template v-if="activeKind === 'award' && award">
        <view class="staff-prize">
          <image :src="award.image" mode="aspectFill" />
          <view class="grow">
            <text class="section-title serif">{{ award.name }}</text>
            <text class="muted block">{{ award.spec }}</text>
            <view class="staff-fields">
              <view class="between">
                <text class="muted small">数量</text>
                <text>1</text>
              </view>
              <view class="between">
                <text class="muted small">领取人</text>
                <view class="recipient-info">
                  <text>{{ award.memberName || '会员用户' }}</text>
                  <text v-if="award.memberPhone" class="muted small">{{ award.memberPhone }}</text>
                </view>
              </view>
              <view class="between">
                <text class="muted small">状态</text>
                <text class="badge" :class="awardStatusType(award.status)">
                  {{ awardStatusLabel(award.status) }}
                </text>
              </view>
              <view class="between">
                <text class="muted small">兑换单号</text>
                <text>…{{ award.code.slice(-4) }}</text>
              </view>
            </view>
          </view>
        </view>
        <button class="btn" :disabled="busy || award.status !== 'pending'" @click="verify">
          {{ award.status === 'pending' ? '确认核销' : awardStatusLabel(award.status) }}
        </button>
        <text class="staff-note block">请核对实物奖品后确认</text>
      </template>
      <EmptyState
        v-else-if="activeKind === 'award'"
        title="等待扫描兑奖码"
        description="扫描或输入顾客的个人奖品兑换码"
        icon="scan"
      />
      <EmptyState
        v-else-if="activeKind === 'order' && !pickupOrder"
        title="等待扫描自提码"
        description="只可核销分配给当前门店且已支付的商城订单"
        icon="scan"
      />
      <view class="divider" />
      <view class="section-heading">
        <text class="section-title serif">
          最近奖品核销
        </text>
        <button class="text-button small" @click="go('records', { type: 'verification' })">
          核销记录 →
        </button>
      </view>
      <view
        v-for="record in state.verificationRecords.slice(0, 3)"
        :key="record.id"
        class="record-row"
      >
        <AppIcon name="check" />
        <text class="grow">{{ record.name }}</text>
        <text class="badge badge-green">已核销</text>
      </view>
      <view class="section-heading section-space"><text class="section-title serif">最近商城自提</text><button class="text-button small" @click="go('records', { type: 'pickup' })">全部记录 <AppIcon name="chevron" :size="16" /></button></view>
      <view v-for="record in pickupRecords.slice(0, 5)" :key="record.id" class="record-row">
        <AppIcon name="check" />
        <text class="grow">订单 {{ String(record.orderNo).slice(-8) }} · {{ record.itemKinds }} 种商品</text>
        <text class="badge badge-green">已核销</text>
      </view>
    </view>
    <view v-else class="permission-empty">
      <view class="permission-icon"><AppIcon name="user" tone="gold" :size="34" /></view>
      <text class="permission-title">暂无核销权限</text>
      <text class="permission-description">门店核销仅对已绑定门店的核销员开放</text>
      <text class="permission-help">如需为顾客办理实物奖品或商城自提，请联系门店管理员开通核销员账号。</text>
      <view class="permission-actions">
        <button class="btn permission-primary" @click="go('profile')">返回个人中心</button>
        <button class="btn btn-outline" @click="go('stores')">查看兑换网点</button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, verifyAward, lookupAward, lookupPickupOrder, confirmPickupOrder, loadPickupRedemptions, refreshDomain, newRequestId } from '../../services/store.js'
import { isApiMode, assetUrl, mediaUrl } from '../../services/config.js'
import { go, toast, confirm } from '../../services/navigation.js'
import { verificationCodeFromScan, isPickupOrderCode } from '../../services/verification-code.js'
const selected = ref(''),
  award = ref(null),
  codeInput = ref(''),
  manual = ref(false),
  busy = ref(false),
  activeKind = ref('award'),
  pickupOrder = ref(null),
  pickupRecords = ref([]),
  awardRequestId = ref(''),
  pickupRequestId = ref(''),
  loading = ref(true),
  loadError = ref(''),
  querying = ref(false),
  queryError = ref('')
let verificationTask
let pendingScene = ''
let lookupVersion = 0
let awardAttemptCode = ''
let pickupAttemptCode = ''
function pickupStatusLabel(status) {
  return ({ paid: '已支付，待核销', complete: '已核销完成', pending: '待付款', shipping: '待收货', receiving: '待收货', cancelled: '已取消', refunded: '已退款' }[status] || '状态待确认')
}
function pickupActionLabel(status) { return ({ complete: '已完成核销', cancelled: '订单已取消', refunded: '订单已退款', pending: '等待支付', shipping: '等待收货', receiving: '等待收货' }[status] || '暂不可核销') }
function awardStatusLabel(status) { return ({ pending: '待核销', redeemed: '已核销', closed: '已关闭', failed: '处理失败', processing: '处理中' }[status] || '状态待确认') }
function awardStatusType(status) { return ({ pending: 'badge-gold', redeemed: 'badge-green', closed: 'badge-muted', failed: 'badge-red', processing: 'badge-gold' }[status] || 'badge-muted') }
async function loadVerification() {
  if (verificationTask) return verificationTask
  verificationTask = (async () => {
    loading.value = true
    loadError.value = ''
    try {
      if (isApiMode()) {
        await refreshDomain('user')
        if (state.user.role === 'staff') {
          const [rows] = await Promise.all([
            loadPickupRedemptions(),
            refreshDomain('verificationRecords', { pageNum: 1, pageSize: 20 }),
          ])
          pickupRecords.value = rows || []
        }
      }
    } catch (error) {
      loadError.value = error.message || '请稍后重试'
    } finally {
      loading.value = false
    }
  })().finally(() => { verificationTask = null })
  return verificationTask
}
onShow(async () => {
  await loadVerification()
  if (!pendingScene || loadError.value || state.user.role !== 'staff') return
  const scene = pendingScene
  pendingScene = ''
  prepareCode(scene)
  await lookup()
})
onLoad((options) => {
  pendingScene = verificationCodeFromScan(options?.scene || options?.code || options?.orderNo)
})
function prepareCode(raw) {
  if (busy.value) return
  clearLookup()
  const value = verificationCodeFromScan(raw)
  activeKind.value = isPickupOrderCode(value) ? 'order' : 'award'
  codeInput.value = value
}
function clearLookup() {
  if (busy.value) return
  lookupVersion += 1
  award.value = null
  pickupOrder.value = null
  selected.value = ''
  querying.value = false
  queryError.value = ''
}
async function lookup() {
  if (busy.value) return
  const value = codeInput.value.trim()
  clearLookup()
  if (!value) { queryError.value = '请先扫描或输入核销码'; return }
  const version = lookupVersion
  const kind = activeKind.value
  querying.value = true
  try {
    const result = kind === 'order' ? await lookupPickupOrder(value)
      : isApiMode() ? await lookupAward(value) : state.awards.find(item => item.code === value)
    if (version !== lookupVersion) return
    if (!result) throw new Error('未找到奖品，请核对兑换码')
    if (kind === 'order') {
      if (pickupAttemptCode !== result.orderNo) pickupRequestId.value = newRequestId('pickup')
      pickupAttemptCode = result.orderNo
      pickupOrder.value = { ...result }
      codeInput.value = result.orderNo
    } else {
      if (awardAttemptCode !== result.code) awardRequestId.value = newRequestId('redeem')
      awardAttemptCode = result.code
      selected.value = result.code
      award.value = { ...result, image: mediaUrl(result.image) }
    }
  } catch (error) {
    if (version === lookupVersion) queryError.value = error.message || '查询失败，请重试'
  } finally {
    if (version === lookupVersion) querying.value = false
  }
}
function scan() {
  if (busy.value) return
  // #ifdef H5
  if (isApiMode()) { manual.value = true; return }
  if (activeKind.value === 'order') { manual.value = true; return }
  uni.showActionSheet({
    itemList: state.awards.map(
      (a) => `${a.name} · ${a.status === 'pending' ? '待核销' : '已核销'}`,
    ),
    success: (r) => {
      prepareCode(state.awards[r.tapIndex].code)
      lookup()
    },
  })
  // #endif
  // #ifdef MP-WEIXIN
  uni.scanCode({
    success: (r) => {
      prepareCode(r.path || r.result)
      lookup()
    },
    fail: (e) => {
      if (!e.errMsg?.includes('cancel')) toast('无法扫码，请检查相机权限')
    },
  })
  // #endif
}
function switchKind(kind) {
  if (busy.value) return
  clearLookup()
  activeKind.value = kind
  codeInput.value = ''
}
async function verifyPickupOrder() {
  if (!pickupOrder.value || pickupOrder.value.status !== 'paid' || busy.value || querying.value) return
  busy.value = true
  try {
    if (!(await confirm('确认门店交付', `请核对订单商品后，为订单 ${pickupOrder.value.orderNo} 办理自提核销。`, '确认核销'))) return
    await confirmPickupOrder(pickupOrder.value.orderNo, pickupRequestId.value || (pickupRequestId.value = newRequestId('pickup')))
    pickupOrder.value = { ...pickupOrder.value, status: 'complete' }
    pickupRequestId.value = ''
    void loadPickupRedemptions().then(records => { pickupRecords.value = records }).catch(() => {})
    toast('订单核销完成，佣金已按当前规则入账')
  } catch (error) { toast(error.message) }
  finally { busy.value = false }
}
async function verify() {
  if (busy.value || querying.value || !award.value || award.value.status !== 'pending') return
  busy.value = true
  try {
    if (
      await confirm(
        '确认核销奖品',
        `确认已向顾客发放${award.value.name}？核销后不可重复兑换。`,
        '确认核销',
      )
    ) {
      const result = await verifyAward(selected.value, awardRequestId.value || (awardRequestId.value = newRequestId('redeem')))
      award.value = { ...award.value, ...result, image: mediaUrl(result?.image || award.value.image), status: 'redeemed' }
      awardRequestId.value = ''
      toast('核销成功')
    }
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.lookup-feedback { display: flex; align-items: center; gap: 8px; padding: 12px; margin-bottom: 16px; border-radius: 8px; background: #faf2e5; color: #78582f; font-size: 13px; line-height: 1.6; }
.verification-modes { display: flex; gap: 8px; margin: 0 0 16px; padding: 4px; border-radius: 8px; background: #f1f3ef; }
.mode-option { flex: 1; margin: 0; padding: 9px 8px; border: 0; border-radius: 6px; background: transparent; color: #68766e; font-size: 13px; }
.mode-option::after { border: 0; }
.mode-option.active { background: #fff; color: #315243; font-weight: 600; }
.pickup-order-card { display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
.pickup-order-item { gap: 8px; padding-top: 8px; border-top: 1px solid #e6e9e3; font-size: 13px; }
.recipient-info { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.pickup-status { font-weight: 600; }
.pickup-status--paid { color: #a27438; }
.pickup-status--complete { color: #3e7253; }
.pickup-status--cancelled, .pickup-status--refunded { color: #9d4944; }
.permission-empty { display: flex; min-height: 420px; flex-direction: column; align-items: center; justify-content: center; margin: 12px 0; padding: 30px 24px; border: 1px solid #e8ece7; border-radius: 10px; background: #fff; text-align: center; }
.permission-icon { display: grid; width: 68px; height: 68px; place-items: center; border: 1px solid #e8ddc8; border-radius: 18px; background: #f7f1e5; }
.permission-title { margin-top: 18px; color: #263c32; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 600; }
.permission-description { margin-top: 8px; color: #59675f; font-size: 14px; }
.permission-help { max-width: 300px; margin-top: 10px; color: #8a958e; font-size: 12px; line-height: 1.6; }
.permission-actions { display: flex; width: 100%; max-width: 320px; gap: 10px; margin-top: 24px; }
.permission-actions .btn { flex: 1; min-width: 0; margin: 0; padding: 0 10px; }
.permission-primary { color: #fff; background: #245a4a; }
.permission-primary::after { border: 0; }
.badge-red { color: #9d4944; background: #f8e6e3; }
.verification-loading { min-height: 520px; padding: 24px 18px; background: #fafaf7; }
.verification-loading-header, .verification-loading-toolbar, .verification-loading-card { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: verification-skeleton-shimmer 1.4s ease-in-out infinite; }
.verification-loading-header { width: 72%; height: 74px; border-radius: 8px; }
.verification-loading-toolbar { height: 50px; margin-top: 18px; border-radius: 8px; }
.verification-loading-card { height: 178px; margin-top: 22px; border-radius: 8px; }
.verification-loading-card--short { height: 86px; margin-top: 14px; }
.verification-error { display: flex; min-height: 420px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.verification-error .btn { width: 100%; margin-top: 8px; }
@keyframes verification-skeleton-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
