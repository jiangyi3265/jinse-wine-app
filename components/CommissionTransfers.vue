<template>
  <view v-if="configured || rows.length || error" class="commission-transfers section-space">
    <text class="section-title block">微信零钱收款</text>
    <text v-if="configured" class="small muted block">已开通微信佣金转账，可在这里查看收款进度。</text>
    <text v-if="error" class="small block">{{ error }}</text>
    <text v-else-if="!configured" class="small muted block">微信佣金转账尚未开通，已结算佣金会保留，开通后发放。</text>
    <text v-else-if="!rows.length && !loading" class="small muted block">暂无转账记录。需要微信确认收款时，会在这里提示。</text>
    <view v-for="row in rows" :key="row.id" class="transfer-row">
      <view class="grow"><text class="block">¥{{ (row.amount / 100).toFixed(2) }}</text><text class="small muted">{{ labels[row.status] || '等待状态更新' }}</text></view>
      <button v-if="row.status === 'WAIT_USER_CONFIRM'" class="btn btn-small" :disabled="busy !== null" @click="confirmReceipt(row)">{{ busy === row.id ? '查询中' : '确认收款' }}</button>
      <text v-else-if="['FAIL','CANCELLED'].includes(row.status)" class="small muted">请联系客服处理</text>
    </view>
    <button class="text-button small" :disabled="loading || busy !== null" @click="load">{{ loading ? '正在查询' : '刷新转账状态' }}</button>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '../services/api.js'
import { isApiMode } from '../services/config.js'
import { toast } from '../services/navigation.js'
const rows = ref([]), configured = ref(false), loading = ref(false), busy = ref(null), error = ref('')
const labels = { SUBMITTING: '待提交微信', ACCEPTED: '微信已受理', PROCESSING: '微信处理中', WAIT_USER_CONFIRM: '待确认收款', TRANSFERING: '转账中', CANCELING: '取消处理中', UNKNOWN: '正在核对微信结果', SUCCESS: '已到微信零钱', FAIL: '转账失败', CANCELLED: '转账已取消' }
async function load() {
  if (!isApiMode()) return
  loading.value = true; error.value = ''
  try { const result = await get('/mini/promotion/transfers', true); rows.value = result.rows || []; configured.value = result.configured }
  catch (e) { error.value = e.message || '转账记录暂时无法获取，请重试' }
  finally { loading.value = false }
}
onShow(load)
async function confirmReceipt(row) {
  if (busy.value !== null) return
  busy.value = row.id
  try {
    const result = await get(`/mini/promotion/transfers/${row.id}`, true)
    if (result.state === 'WAIT_USER_CONFIRM') {
      const api = typeof wx !== 'undefined' ? wx : null
      if (!result.packageInfo || !result.mchId || !result.appId) throw new Error('收款确认信息暂不可用，请稍后刷新')
      if (typeof api?.requestMerchantTransfer !== 'function') throw new Error('请在最新版微信小程序中确认收款')
      await new Promise((resolve, reject) => api.requestMerchantTransfer({
        mchId: result.mchId, appId: result.appId, packageInfo: result.packageInfo,
        success: resolve, fail: () => reject(new Error('收款尚未确认，可稍后重试')),
      }))
      await get(`/mini/promotion/transfers/${row.id}`, true)
    }
    await load()
  } catch (e) { toast(e.message) }
  finally { busy.value = null }
}
</script>
<style scoped>
.commission-transfers > text { margin-bottom: 10px; line-height: 1.6; }
.transfer-row { display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid #e7e2d7; }
.commission-transfers > button { margin-top:12px; }
</style>
