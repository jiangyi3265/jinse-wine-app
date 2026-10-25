<template>
  <PageShell :title="title">
    <view class="section">
      <view v-if="loading" class="records-loading" aria-label="正在加载记录">
        <view v-for="item in 3" :key="item" class="records-loading-row">
          <view class="records-loading-icon" />
          <view class="grow"><view class="records-loading-line wide" /><view class="records-loading-line" /></view>
          <view class="records-loading-value" />
        </view>
      </view>
      <EmptyState
        v-else-if="loadError"
        title="记录暂时无法加载"
        :description="loadError"
        button="重新加载"
        icon="order"
        @action="loadRecords"
      />
      <template v-else>
      <view v-if="type === 'points'" class="section-heading">
        <text class="section-title serif">可用积分 {{ state.points.toLocaleString() }}</text>
      </view>
      <button
        v-for="item in records"
        :key="item.id"
        class="record-row"
        @click="open(item)"
      >
        <view class="record-icon">
          <AppIcon :name="type === 'points' ? 'coin' : type === 'cash' ? 'wallet' : 'gift'" />
        </view>
        <view class="grow record-content">
          <text class="strong block record-title">{{ item.title || item.name }}</text>
          <view class="record-meta">
            <text class="small muted record-date">{{ dateLabel(item.createdAt) }}</text>
            <text v-if="type === 'draw'" class="record-result" :class="item.kind === 'none' ? 'muted' : 'ink'">{{ drawResult(item) }}</text>
          </view>
          <text
            v-if="type === 'cash'"
            class="small block"
            :class="item.status === 'received' ? 'ink' : 'gold'"
          >
            {{ cashStatus(item) }}
          </text>
          <text v-if="type === 'commission'" class="small muted block">{{ commissionStatus(item) }}</text>
        </view>
        <text v-if="type !== 'draw'" class="record-value" :class="item.change > 0 ? 'ink' : ''">
          {{
            item.value ||
            (type === 'points'
              ? `${item.change > 0 ? '+' : ''}${item.change}`
              : type === 'cash'
                ? `¥${money(item.amount, true)}`
                : type === 'commission'
                  ? `${Number(item.amount) < 0 ? '-' : '+'}¥${money(Math.abs(Number(item.amount)), true)}`
                : '已核销')
          }}
        </text>
        <AppIcon v-if="type === 'cash' || (type === 'draw' && ['cash', 'points', 'coupon', 'goods', 'ticket'].includes(item.kind))" name="chevron" :size="17" />
      </button>
      <EmptyState
        v-if="!records.length"
        title="暂无记录"
        description="您的记录将在这里显示"
        icon="order"
      />
      <ListPagination :total="total" :page-num="pageNum" :page-size="pageSize" :loading="loading" @change="loadRecords" />
      </template>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import ListPagination from '../../components/ListPagination.vue'
import { state, refreshDomain } from '../../services/store.js'
import { useMemberList } from '../../services/member-list.js'
import { isApiMode } from '../../services/config.js'
import { money } from '../../services/pricing.js'
import { go, dateLabel } from '../../services/navigation.js'
const type = ref('draw')
const domains = { draw: 'drawRecords', points: 'pointRecords', cash: 'redPackets', verification: 'verificationRecords', pickup: 'pickupRecords', commission: 'commissionRecords' }
const { rows, total, pageNum, pageSize, loading, loadError, load } = useMemberList(() => domains[type.value], {
  demoRows: () => type.value === 'commission' ? state.promotion?.records || [] : state[domains[type.value]] || [],
})
onLoad((q) => {
  type.value = domains[q.type] ? q.type : 'draw'
})
async function loadRecords(targetPage = pageNum.value) {
  await load(targetPage)
  if (type.value === 'points' && isApiMode() && !loadError.value) {
    try { await refreshDomain('points') }
    catch (error) { loadError.value = error.message || '积分余额暂时无法获取' }
  }
}
onShow(() => loadRecords())
const title = computed(
  () =>
    ({
      draw: '抽奖记录',
      cash: '红包领取记录',
      points: '积分明细',
      verification: '核销记录',
      pickup: '商城自提记录',
      commission: '佣金明细',
    })[type.value] || '我的记录',
)
const records = computed(() => rows.value.map(item => type.value === 'cash' ? { ...item, title: '现金红包' }
  : type.value === 'pickup' ? { ...item, title: `订单 ${item.orderNo} · ${item.itemKinds} 种商品` } : item))
function drawResult(item) {
  if (item.kind === 'cash') return `已中红包 ${item.value || `¥${money(item.amount, true)}`}`
  if (item.kind === 'points') return `已中积分${item.value ? ` · ${item.value}` : ''}`
  return ({ ticket: '已中门票', goods: '已中实物', coupon: '已中优惠券', none: '未中奖' })[item.kind] || '抽奖完成'
}
function commissionStatus(item) {
  if (Number(item.amount) < 0) return ({ settled: '待抵扣', processing: '抵扣处理中', paid: '已抵扣' })[item.status] || '退款冲回'
  if (item.refundRecoveryRequired) return '退款待追偿'
  return ({ pending: '待结算', settled: '可提现', processing: '提现处理中', paid: '已提现', closed: '已关闭' })[item.status] || '状态更新中'
}
function open(item) {
  if (type.value === 'cash') go('redpacket', { id: item.id })
  else if (item.kind === 'cash') go('redpacket', { id: item.rewardId })
  else if (item.kind === 'points') go('points')
  else if (item.kind === 'coupon') go('my-coupons')
  else if (['goods', 'ticket'].includes(item.kind)) go('awards')
}
function cashStatus(item) {
  if (item.status === 'received') return '服务端已记录发放，以微信账单为准'
  const labels = {
    PENDING: '待申请发放', SUBMITTING: '正在提交转账', ACCEPTED: '微信已受理',
    PROCESSING: '微信处理中', WAIT_USER_CONFIRM: '等待微信确认', TRANSFERING: '转账中',
    CANCELING: '撤销中', UNKNOWN: '正在核对转账结果',
    FAIL: '转账失败，可重新申请', CANCELLED: '转账已取消，可重新申请',
  }
  return labels[item.transferStatus] || '待发放'
}
</script>

<style scoped>
.page-shell .record-row { width: 100%; text-align: left; gap: 12px; padding: 18px 0; }
.page-shell .record-icon { width: 40px; height: 40px; flex: 0 0 40px; align-self: flex-start; margin-top: 2px; }
.record-content { min-width: 0; }
.record-title { font-size: 15px; line-height: 1.5; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
.record-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-top: 6px; line-height: 1.5; }
.record-date { flex: 0 0 auto; white-space: nowrap; }
.record-result { min-width: 0; font-size: 12px; overflow-wrap: anywhere; }
.page-shell .record-value { flex: 0 1 auto; max-width: 42%; font-size: 17px; line-height: 1.5; text-align: right; overflow-wrap: anywhere; }
.records-loading { padding: 8px 0 24px; }
.records-loading-row { display: flex; align-items: center; gap: 13px; padding: 18px 0; border-bottom: 1px solid #e3e6dd; }
.records-loading-icon, .records-loading-line, .records-loading-value { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: records-skeleton 1.4s ease-in-out infinite; }
.records-loading-icon { width: 45px; height: 45px; flex: 0 0 auto; border-radius: 50%; }
.records-loading-line { width: 72%; height: 12px; margin-top: 8px; }
.records-loading-line.wide { width: 94%; height: 15px; margin-top: 0; }
.records-loading-value { width: 48px; height: 20px; }
@keyframes records-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
