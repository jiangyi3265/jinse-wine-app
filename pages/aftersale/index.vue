<template>
  <PageShell title="退货换货" footer>
    <view class="section aftersale-page">
      <view class="aftersale-tabs">
        <button :class="{ selected: !recordsOnly }" @click="recordsOnly = false">申请售后</button>
        <button :class="{ selected: recordsOnly }" @click="recordsOnly = true">售后记录</button>
      </view>
      <text v-if="loading" class="muted">正在加载售后信息</text>
      <view v-else-if="loadError" class="aftersale-error"><text>{{ loadError }}</text><button class="btn btn-outline" @click="load()">重新加载</button></view>
      <template v-else>
        <view v-if="!recordsOnly && eligible" class="apply-form">
          <text class="muted small">订单 {{ order.id }}</text>
          <view class="type-options">
            <button :class="{ selected: form.type === 'return_refund' }" @click="form.type = 'return_refund'">退货退款</button>
            <button :class="{ selected: form.type === 'exchange' }" @click="form.type = 'exchange'">换货</button>
          </view>
          <view class="field"><text class="field-label"><text class="required">*</text> 售后商品</text>
            <picker :range="itemNames" :value="itemIndex" @change="chooseItem"><view class="picker-value">{{ itemNames[itemIndex] || '请选择售后商品' }} <AppIcon name="chevron" :size="16" /></view></picker>
          </view>
          <view class="field"><text class="field-label"><text class="required">*</text> 数量（最多 {{ availableQuantity }} 件）</text><input v-model="form.quantity" type="number" class="field-input" placeholder="请输入售后数量" /></view>
          <view class="field"><text class="field-label"><text class="required">*</text> 售后原因</text><textarea v-model="form.reason" class="reason-input" maxlength="200" placeholder="请填写售后原因" /><text class="muted small">{{ form.reason.length }}/200</text></view>
          <button class="btn" :disabled="busy || availableQuantity < 1" @click="apply">{{ busy ? '正在提交' : '提交申请' }}</button>
        </view>
        <text v-else-if="!recordsOnly" class="muted">{{ order?.status === 'paid' ? '商品尚未发货，可在订单详情申请退款。' : '当前订单暂不可申请新的退货换货。' }}</text>
        <view v-if="recordsOnly || records.length" class="records-section">
          <view class="between"><text class="strong">售后记录 · {{ total }} 条</text><button class="text-button" :disabled="busy" @click="load()">刷新</button></view>
          <text v-if="!records.length" class="muted">暂无退货换货申请</text>
          <view v-for="record in records" :key="record.id" class="aftersale-record">
            <button class="record-summary" :disabled="busy" @click="showDetail(record.id)">
              <view class="between"><text class="strong">{{ record.type === 'exchange' ? '换货' : '退货退款' }}</text><text class="status">{{ statusLabel(record.status) }}</text></view>
              <text class="block">{{ record.productName }} × {{ record.quantity }}</text>
              <view class="between muted small"><text>{{ dateLabel(record.createTime) }}</text><text v-if="record.type !== 'exchange'">¥{{ money(record.amount, true) }}</text><AppIcon name="chevron" :size="16" /></view>
            </button>
          </view>
          <view v-if="total > pageSize" class="record-pagination">
            <button class="text-button page-button" :disabled="busy || pageNum <= 1" aria-label="上一页" @click="load(pageNum - 1)"><AppIcon name="back" :size="20" /></button>
            <text class="muted small">{{ pageNum }} / {{ pageCount }}</text>
            <button class="text-button page-button" :disabled="busy || pageNum >= pageCount" aria-label="下一页" @click="load(pageNum + 1)"><AppIcon name="chevron" :size="20" /></button>
          </view>
        </view>
        <view v-if="detail" class="detail-section">
          <view class="between"><text class="strong">售后详情</text><button class="text-button" :disabled="busy" @click="closeDetail">收起</button></view>
          <text class="muted small block">{{ detail.aftersaleNo }}</text>
          <text class="status block">{{ statusLabel(detail.status) }}</text>
          <text class="block">申请原因：{{ detail.reason }}</text>
          <text v-if="detail.reviewNote" class="block">审核说明：{{ detail.reviewNote }}</text>
          <view v-if="detail.returnAddress" class="detail-row"><text class="field-label">退货收件信息</text><text class="block selectable">{{ detail.returnAddress }}</text><button class="text-button" @click="copy(detail.returnAddress)">复制地址</button></view>
          <view v-if="detail.returnTrackingNo" class="detail-row"><text class="field-label">寄回物流</text><text class="block selectable">{{ detail.returnCompany }} {{ detail.returnTrackingNo }}</text></view>
          <view v-if="['approved', 'returning'].includes(detail.status)" class="return-form">
            <view class="field"><text class="field-label"><text class="required">*</text> 寄回快递公司</text><input v-model="shipment.company" class="field-input" maxlength="64" placeholder="请输入快递公司" /></view>
            <view class="field"><text class="field-label"><text class="required">*</text> 寄回物流单号</text><input v-model="shipment.trackingNo" class="field-input" maxlength="128" placeholder="请输入物流单号" /></view>
            <button class="btn btn-outline" :disabled="busy" @click="saveShipment">保存寄回物流</button>
          </view>
          <view v-if="detail.replacementTrackingNo" class="detail-row"><text class="field-label">换货物流</text><text class="block selectable">{{ detail.replacementCompany }} {{ detail.replacementTrackingNo }}</text></view>
          <view class="record-actions">
            <button v-if="['pending', 'approved'].includes(detail.status)" class="btn btn-outline" :disabled="busy" @click="memberAction('cancel')">撤销售后</button>
            <button v-if="detail.status === 'exchange_shipping'" class="btn" :disabled="busy" @click="memberAction('receive')">确认换货收货</button>
          </view>
          <view v-for="(event, index) in detail.events" :key="index" class="event-row"><text class="block">{{ statusLabel(event.status) }} · {{ event.note }}</text><text class="muted small">{{ event.createTime }}</text></view>
        </view>
      </template>
    </view>
  </PageShell>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { request } from '../../services/api.js'
import { refreshOrder } from '../../services/store.js'
import { isApiMode } from '../../services/config.js'
import { confirm, dateLabel, toast } from '../../services/navigation.js'
import { money } from '../../services/pricing.js'

const id = ref(''), order = ref(null), loading = ref(false), loadError = ref(''), busy = ref(false)
const records = ref([]), recordsOnly = ref(false), detail = ref(null), itemIndex = ref(0)
const pageNum = ref(1), pageSize = 20, total = ref(0), reservedQuantities = ref(null)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const form = reactive({ type: 'return_refund', quantity: '1', reason: '' })
const shipment = reactive({ company: '', trackingNo: '' })
let loadTask, submitKey = '', submitSignature = '', detailSequence = 0
const items = computed(() => order.value?.items || [])
const itemNames = computed(() => items.value.map(item => `${item.name} ${item.spec || ''}`))
const eligible = computed(() => ['shipping', 'receiving', 'complete'].includes(order.value?.status) && !order.value?.refundSummary?.processing)
const availableQuantity = computed(() => {
  const item = items.value[itemIndex.value]
  if (!item || !reservedQuantities.value) return 0
  return Math.max(0, Number(item.quantity) - reservedQuantities.value[String(item.orderItemId)])
})
const statusLabel = status => ({ pending: '待商家审核', approved: '待寄回商品', rejected: '申请已驳回', returning: '退货运输中', received: '退货已收到，待换货', refund_pending: '等待退款到账', exchange_shipping: '换货已发出，待收货', completed: '售后已完成', cancelled: '售后已撤销' })[status] || '状态待确认'
onLoad(q => { id.value = q.id || ''; recordsOnly.value = q.records === '1'; load() })
onShow(() => { if (id.value) load() })
async function load(targetPage = pageNum.value) {
  if (loadTask) return loadTask
  if (!id.value || !isApiMode()) { loadError.value = '请从线上订单详情进入售后'; return }
  loadTask = (async () => {
    loading.value = true; loadError.value = ''
    try {
      const fresh = await refreshOrder(id.value)
      const fetchPage = page => request(`/mini/orders/${encodeURIComponent(id.value)}/aftersales`, { auth: true, data: { pageNum: page, pageSize } })
      let list = await fetchPage(targetPage)
      if (Number.isSafeInteger(list?.total) && list.total >= 0) {
        targetPage = Math.min(targetPage, Math.max(1, Math.ceil(list.total / pageSize)))
        if (list.total > 0 && !list.rows?.length && targetPage > 0) list = await fetchPage(targetPage)
      }
      if (!fresh || !Array.isArray(list?.rows) || !Number.isSafeInteger(list.total) || list.total < 0 || !list.reservedQuantities
        || (fresh.items || []).some(item => !Number.isSafeInteger(list.reservedQuantities[String(item.orderItemId)]) || list.reservedQuantities[String(item.orderItemId)] < 0)) {
        throw new Error('售后数据不完整，请重新加载')
      }
      order.value = fresh; records.value = list.rows; total.value = list.total
      reservedQuantities.value = list.reservedQuantities; pageNum.value = targetPage
      if (detail.value) await showDetail(detail.value.id)
    } catch (e) { loadError.value = e.message || '售后信息加载失败' }
    finally { loading.value = false }
  })().finally(() => { loadTask = null })
  return loadTask
}
function chooseItem(event) { itemIndex.value = Number(event.detail.value); form.quantity = '1' }
function closeDetail() { ++detailSequence; detail.value = null }
async function showDetail(caseId) {
  const sequence = ++detailSequence
  detail.value = null
  try {
    const fresh = await request(`/mini/aftersales/${caseId}`, { auth: true })
    if (sequence !== detailSequence) return
    detail.value = fresh
    shipment.company = detail.value.returnCompany || ''; shipment.trackingNo = detail.value.returnTrackingNo || ''
  } catch (e) { if (sequence === detailSequence) toast(e.message || '售后详情加载失败') }
}
async function apply() {
  if (busy.value || loading.value || loadError.value || !eligible.value) return
  const item = items.value[itemIndex.value], quantity = Number(form.quantity), reason = form.reason.trim()
  if (!item?.orderItemId) return toast('请选择售后商品')
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > availableQuantity.value) return toast('请输入有效的售后数量')
  if (!reason) return toast('请填写售后原因')
  const data = { type: form.type, orderItemId: item.orderItemId, quantity, reason }
  const signature = JSON.stringify(data)
  if (signature !== submitSignature) { submitKey = `after_${Date.now()}_${Math.random().toString(36).slice(2)}`; submitSignature = signature }
  busy.value = true
  try {
    detail.value = await request(`/mini/orders/${encodeURIComponent(id.value)}/aftersales`, { method: 'POST', auth: true, requestId: submitKey, data })
    toast('售后申请已提交'); recordsOnly.value = true; form.reason = ''; submitSignature = ''; submitKey = ''; await load(1)
  } catch (e) { toast(e.message || '售后申请提交失败') }
  finally { busy.value = false }
}
async function act(action, data) {
  if (busy.value || !detail.value) return
  busy.value = true
  try {
    detail.value = await request(`/mini/aftersales/${detail.value.id}/${action}`, { method: 'POST', auth: true, data })
    toast('操作成功'); await load()
  } catch (e) { toast(e.message || '售后操作失败') }
  finally { busy.value = false }
}
async function saveShipment() {
  if (!shipment.company.trim()) return toast('请输入寄回快递公司')
  if (!shipment.trackingNo.trim()) return toast('请输入寄回物流单号')
  await act('return-shipment', { company: shipment.company.trim(), trackingNo: shipment.trackingNo.trim() })
}
async function memberAction(action) {
  if (busy.value) return
  busy.value = true
  let accepted
  try { accepted = await confirm(action === 'cancel' ? '撤销售后' : '确认换货收货', action === 'cancel' ? '确认撤销本次售后申请？' : '请确认已收到换货商品。') }
  finally { busy.value = false }
  if (accepted) await act(action)
}
function copy(value) { uni.setClipboardData({ data: value }) }
</script>
<style scoped>
.aftersale-page { padding-bottom: 36px; }
.aftersale-tabs, .type-options { display: flex; gap: 0; border-bottom: 1px solid #dedfdc; margin-bottom: 20px; }
.aftersale-tabs button, .type-options button { flex: 1; padding: 12px 4px; border-radius: 0; font-size: 15px; background: transparent; color: #666; border-bottom: 2px solid transparent; }
.aftersale-tabs .selected, .type-options .selected { color: #194f40; border-bottom-color: #194f40; font-weight: 600; }
.type-options { margin-top: 12px; }
.field { margin-bottom: 20px; }
.field-label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.required { color: #b53434; }
.field-input, .picker-value, .reason-input { box-sizing: border-box; width: 100%; background: #fff; border: 1px solid #d7dcd7; border-radius: 6px; padding: 12px; font-size: 14px; }
.field-input { height: 46px; }
.picker-value { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 46px; overflow-wrap: anywhere; }
.reason-input { height: 110px; }
.records-section, .detail-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #dedfdc; }
.aftersale-record { border-bottom: 1px solid #e5e8e3; padding: 14px 0; }
.record-summary { width: 100%; background: transparent; text-align: left; padding: 0; border-radius: 0; }
.record-summary .block, .detail-section > .block { margin-top: 9px; overflow-wrap: anywhere; }
.record-pagination { display: flex; align-items: center; justify-content: center; gap: 24px; min-height: 52px; padding-top: 12px; }
.page-button { width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; }
.status { color: #275d49; font-size: 13px; }
.detail-row, .return-form, .record-actions { margin-top: 18px; }
.record-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.event-row { padding: 12px 0; border-bottom: 1px solid #e5e8e3; font-size: 13px; }
.aftersale-error { color: #a63838; display: grid; gap: 12px; }
.selectable { user-select: text; overflow-wrap: anywhere; }
</style>
