<template>
  <PageShell title="现金红包">
    <view v-if="loading" class="packet-loading" aria-label="正在查询红包状态">
      <view class="packet-loading-title" />
      <view class="packet-loading-card" />
      <view class="packet-loading-state" />
      <view class="packet-loading-button" />
    </view>
    <template v-else-if="packet && !loadError && !notFound">
      <view class="packet-page">
        <view class="packet-intro">
          <text class="packet-eyebrow">JINSE WINE · REWARD</text>
          <text class="packet-title">{{ received ? (isApiMode() ? '发放状态已记录' : '领取流程预览完成') : '恭喜获得现金红包' }}</text>
          <text class="packet-subtitle">{{ received ? (isApiMode() ? '业务服务端记录为已发放，到账请核对微信账单' : '演示状态已更新，未发生真实转账') : '一份来自金色酒业的活动礼遇' }}</text>
        </view>
        <view class="packet-card">
          <view class="packet-card-top">
            <text class="packet-brand">金色酒业 · 活动奖励</text>
            <AppIcon name="gift" tone="light" :size="22" />
          </view>
          <view class="packet-money">
            <text class="currency">¥</text>
            {{ money(packet.amount, true) }}
          </view>
          <text class="packet-label">现金奖励 · {{ packet.id }}</text>
        </view>
        <view class="packet-state" :class="received ? 'is-received' : 'is-pending'">
          <AppIcon :name="received ? 'check' : 'clock'" :tone="received ? 'ink' : 'gold'" :size="21" />
          <view class="packet-state-copy">
            <text class="packet-state-title">{{ received ? (isApiMode() ? '服务端已记录发放' : '演示领取已完成') : isApiMode() ? apiStateTitle : '演示待领取' }}</text>
            <text class="packet-state-note">{{ stateDescription }}</text>
          </view>
        </view>
        <view class="packet-actions">
          <button v-if="canConfirmTransfer" class="btn" :disabled="busy" @click="receive">
            {{ busy ? '正在核对…' : '确认收款' }}
          </button>
          <button v-if="canStartTransfer" class="btn" :disabled="busy" @click="receive">
            {{ busy ? '处理中…' : isApiMode() ? (packet.transferStatus === 'FAIL' || packet.transferStatus === 'CANCELLED' ? '重新发起转账' : '申请发放') : '预览领取流程' }}
          </button>
          <button v-if="canRefreshTransfer" class="btn btn-outline" :disabled="busy" @click="refreshStatus">
            查询发放状态
            <AppIcon name="arrow" :size="19" />
          </button>
          <view v-if="showChannelNotice" class="channel-notice">
            <AppIcon name="info" :size="19" />
            <text>{{ stateDescription }}</text>
          </view>
          <button
            class="btn btn-outline"
            @click="go('records', { type: 'cash' })"
          >
            查看红包记录
            <AppIcon name="arrow" :size="19" />
          </button>
          <button v-if="received" class="btn" @click="go('index')">返回首页</button>
        </view>
        <button class="packet-support" @click="contact">
          <AppIcon name="headset" :size="22" />
          奖励有疑问？联系客服
        </button>
      </view>
    </template>
    <EmptyState
      v-else
      :title="loadError ? '红包暂时无法加载' : '未找到这份红包'"
      :description="loadError || ''"
      :button="loadError ? '重新加载' : '查看领取记录'"
      @action="loadError ? loadPacket() : go('records', { type: 'cash' })"
    />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, receiveRedPacket, refreshRedPacket } from '../../services/store.js'
import { isApiMode } from '../../services/config.js'
import { go, contact, confirm, toast } from '../../services/navigation.js'
import { money } from '../../services/pricing.js'
const id = ref(isApiMode() ? '' : 'redpack-1'),
  busy = ref(false),
  loading = ref(true),
  loadError = ref(''),
  notFound = ref(false)
onLoad((q) => {
  id.value = q.id || (isApiMode() ? '' : 'redpack-1')
})
async function loadPacket() {
  if (busy.value) return
  loading.value = true
  loadError.value = ''
  notFound.value = false
  try {
    if (isApiMode() && id.value) await refreshRedPacket(id.value)
  } catch (error) {
    notFound.value = Number(error?.statusCode) === 404 && error?.message === '红包不存在'
    loadError.value = notFound.value ? '' : (error.message || '红包状态暂时无法获取，请稍后重试')
  } finally { loading.value = false }
}
onShow(loadPacket)
const packet = computed(() => state.redPackets.find((p) => p.id === id.value)),
  received = computed(() => packet.value?.status === 'received'),
  transferActive = computed(() => ['SUBMITTING', 'ACCEPTED', 'PROCESSING', 'WAIT_USER_CONFIRM', 'TRANSFERING', 'CANCELING', 'UNKNOWN'].includes(packet.value?.transferStatus)),
  canConfirmTransfer = computed(() => !received.value && isApiMode() && packet.value?.transferStatus === 'WAIT_USER_CONFIRM'),
  canStartTransfer = computed(() => !received.value && ['pending', 'failed'].includes(packet.value?.status)
    && (!isApiMode() || ['PENDING', 'FAIL', 'CANCELLED'].includes(packet.value?.transferStatus))),
  canRefreshTransfer = computed(() => !received.value && isApiMode() && !!packet.value),
  showChannelNotice = computed(() => !received.value && isApiMode() && ['PENDING', 'UNKNOWN'].includes(packet.value?.transferStatus)),
  apiStateTitle = computed(() => packet.value?.status === 'closed' && !transferActive.value ? '红包已关闭' : ({
    PENDING: '待申请发放', SUBMITTING: '正在提交转账', ACCEPTED: '微信已受理', PROCESSING: '微信处理中',
    WAIT_USER_CONFIRM: '等待微信确认', TRANSFERING: '转账中', CANCELING: '撤销中',
    UNKNOWN: '正在核对转账结果', FAIL: '转账失败', CANCELLED: '转账已取消',
  })[packet.value?.transferStatus] || '状态待核对'),
  stateDescription = computed(() => {
    if (received.value) return isApiMode() ? '状态来自业务服务端；实际到账以微信支付账单为准' : '演示状态，仅用于预览页面，未发生真实转账'
    if (!isApiMode()) return '演示模式不会向微信零钱转入资金'
    if (packet.value?.status === 'closed' && !transferActive.value) return '此红包已关闭，无法再次申请发放；如有疑问请联系客服'
    if (packet.value?.transferStatus === 'WAIT_USER_CONFIRM') return '点击“确认收款”在微信中继续；暂时退出后可返回此页再次确认'
    if (packet.value?.transferStatus === 'FAIL' || packet.value?.transferStatus === 'CANCELLED') return packet.value.transferFailReason || '上次转账未完成，可重新发起'
    if (transferActive.value) return '已提交微信转账，最终状态以微信异步结果为准'
    return '红包等待发放，可申请发放或稍后查询；实际到账以微信结果为准'
  })
async function refreshStatus() {
  if (busy.value) return
  busy.value = true
  try { await refreshRedPacket(id.value) } catch (e) { toast(e.message) } finally { busy.value = false }
}
async function receive() {
  if (busy.value || (!canStartTransfer.value && !canConfirmTransfer.value)) return
  busy.value = true
  try {
    if (!isApiMode() &&
      !(await confirm(
        '预览红包到账',
        '当前为前端演示，本次仅预览到账页面，不会向微信零钱转入资金。实际到账需接入微信商家转账。',
        '预览到账',
      ))) return
    const result = await receiveRedPacket(id.value)
    // Reuse the server's existing transfer; stale package info on another state
    // must never reopen a completed or cancelled confirmation.
    if (isApiMode() && result?.state === 'WAIT_USER_CONFIRM') {
      if (!result.packageInfo || !result.mchId || !result.appId) throw new Error('收款确认信息暂不可用，请稍后查询或联系客服')
      const miniProgramApi = typeof wx !== 'undefined' ? wx : null
      if (typeof miniProgramApi?.requestMerchantTransfer !== 'function') throw new Error('当前微信基础库不支持商家转账确认')
      await new Promise((resolve, reject) => miniProgramApi.requestMerchantTransfer({
        mchId: result.mchId,
        appId: result.appId,
        packageInfo: result.packageInfo,
        success: resolve,
        fail: reject,
      }))
    }
  } catch (e) {
    const message = e?.message || e?.errMsg || ''
    toast(/cancel/i.test(message) ? '已取消本次确认，可再次点击“确认收款”' : message || '收款确认未完成，请稍后重试')
  } finally {
    if (isApiMode()) {
      try { await refreshRedPacket(id.value) }
      catch { toast('最新发放状态暂未获取，请点击“查询发放状态”重试') }
    }
    busy.value = false
  }
}
</script>

<style scoped>
.packet-loading { padding: 28px 16px; }
.packet-loading-title, .packet-loading-card, .packet-loading-state, .packet-loading-button { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: packet-skeleton 1.4s ease-in-out infinite; }
.packet-loading-title { width: 68%; height: 28px; margin: 10px 0 12px; }
.packet-loading-card { height: 190px; border-radius: 8px; }
.packet-loading-state { height: 66px; margin: 16px 0; border-radius: 8px; }
.packet-loading-button { height: 46px; border-radius: 6px; }
@keyframes packet-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
.packet-page { padding: 18px 16px 30px; }
.packet-intro { padding: 8px 4px 20px; }
.packet-eyebrow { display: block; color: #9a7650; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
.packet-title { display: block; margin-top: 9px; color: #292621; font-size: 25px; font-weight: 700; line-height: 1.35; }
.packet-subtitle { display: block; margin-top: 5px; color: #77736d; font-size: 14px; line-height: 1.5; }
.packet-card { min-height: 190px; padding: 20px 22px 18px; border-radius: 8px; color: #fff7e8; background: #8f2f26; box-shadow: 0 10px 24px rgba(69, 34, 27, .12); }
.packet-card-top { display: flex; align-items: center; justify-content: space-between; color: #f0d2a4; }
.packet-brand { font-size: 13px; }
.packet-money { display: flex; align-items: baseline; justify-content: center; margin: 23px 0 7px; font-size: 58px; font-weight: 650; line-height: 1; }
.currency { margin-right: 5px; font-size: 24px; }
.packet-label { display: block; color: #f0d2a4; text-align: center; font-size: 12px; }
.packet-state { display: flex; align-items: flex-start; gap: 12px; margin: 16px 0 18px; padding: 15px; border: 1px solid #e9e4da; border-radius: 8px; background: #fff; }
.packet-state.is-received { border-color: #d9e6dc; background: #f5faf6; }
.packet-state-copy { min-width: 0; }
.packet-state-title, .packet-state-note { display: block; }
.packet-state-title { color: #38342e; font-size: 15px; font-weight: 650; }
.packet-state-note { margin-top: 4px; color: #77736d; font-size: 12px; line-height: 1.55; }
.packet-actions { display: flex; flex-direction: column; gap: 10px; }
.channel-notice { display: flex; align-items: flex-start; gap: 8px; padding: 12px; border-left: 3px solid #c99a59; color: #655d50; background: #f7f3eb; font-size: 12px; line-height: 1.55; }
.channel-notice :deep(.app-icon) { flex: 0 0 auto; }
.packet-support { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 15px; padding: 12px 0; border: 0; color: #655d50; background: transparent; font-size: 13px; }
@media (max-width: 380px) { .packet-page { padding-right: 12px; padding-left: 12px; } .packet-title { font-size: 22px; } .packet-money { font-size: 50px; } }
</style>
