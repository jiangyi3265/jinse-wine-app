<template>
  <PageShell title="我的奖品">
    <view class="filter-tabs">
      <button
        v-for="item in ['待兑换', '已兑换', '已失效', '全部']"
        :key="item"
        class="filter-tab"
        :class="{ active: tab === item }"
        @click="chooseTab(item)"
      >
        {{ item }}
      </button>
    </view>
    <view v-if="loading" class="section awards-loading" aria-label="正在加载奖品">
      <view v-for="item in 2" :key="item" class="award-loading-card">
        <view class="award-loading-image" />
        <view class="grow column">
          <view class="award-loading-line wide" />
          <view class="award-loading-line" />
          <view class="award-loading-line short" />
        </view>
      </view>
    </view>
    <EmptyState
      v-else-if="loadError"
      title="奖品暂时无法加载"
      :description="loadError"
      button="重新加载"
      icon="gift"
      @action="loadAwards"
    />
    <view v-else class="section">
      <template v-for="(award, index) in filtered" :key="award.id">
        <view v-if="index === 0 || expanded === award.id" class="award-panel">
          <view class="award-top">
            <view v-if="award.kind === 'ticket' && !award.image" class="ticket-cover"><AppIcon name="coupon" :size="32" /><text>门票</text></view>
            <image v-else :src="productImage(award.image)" mode="aspectFill" />
            <view class="grow column">
              <text class="section-title serif">{{ award.name }}</text>
              <text class="muted">{{ award.spec }}</text>
              <text v-if="award.kind === 'goods'" class="muted small">{{ award.redeemStoreName || '合作门店均可兑换' }}</text>
              <text v-if="award.kind === 'ticket'" class="muted small">售票方：{{ award.providerName }}</text>
            </view>
            <text :class="award.status === 'pending' ? 'gold' : 'ink'">
              {{ award.kind === 'ticket' && award.status === 'pending' ? '已发放' : awardStatus(award.status) }}
            </text>
          </view>
          <view v-if="award.status === 'pending'" class="award-qr">
            <QrCode :src="qrById[award.id]" />
            <text class="strong">{{ award.kind === 'ticket' ? '请向售票方出示门票' : '请向门店核销员出示' }}</text>
            <text v-if="award.kind === 'ticket'" class="muted small">使用状态以售票方验票结果为准</text>
            <text v-else class="muted small">兑换码仅用于奖品核销</text>
            <text class="small muted">{{ award.kind === 'ticket' ? `票号：${award.ticketNo || ''}` : `兑换码：${award.code}` }}</text>
            <text v-if="award.kind === 'ticket' && award.expiresAt" class="small muted">有效期至：{{ formatExpiry(award.expiresAt) }}</text>
            <text v-if="award.kind === 'goods'" class="small muted">核销门店：{{ award.redeemStoreName || '合作门店均可' }}</text>
            <text v-if="qrLoading[award.id]" class="small muted">正在生成专属核销二维码…</text>
            <text v-else-if="qrErrors[award.id]" class="small muted">{{ qrErrors[award.id] }}{{ award.kind === 'ticket' ? '' : '，可出示上方兑换码' }}</text>
            <button v-if="qrErrors[award.id]" class="text-button small" :disabled="qrLoading[award.id]" @click="loadRewardQrs">重新生成</button>
          </view>
        </view>
        <view v-else class="award-small">
          <view v-if="award.kind === 'ticket' && !award.image" class="ticket-cover"><AppIcon name="coupon" :size="28" /><text>门票</text></view>
          <image v-else :src="productImage(award.image)" mode="aspectFill" />
          <view class="grow">
            <text class="strong block">{{ award.name }}</text>
            <text class="muted small">{{ award.spec }}</text>
          </view>
          <button class="btn btn-small btn-outline" @click="expanded = award.id">
            {{ award.status === 'pending' ? award.kind === 'ticket' ? '出示门票' : '出示兑换码' : '查看奖品' }}
          </button>
        </view>
      </template>
      <EmptyState
        v-if="!filtered.length"
        title="暂无奖品"
        description="参加扫码活动或使用积分兑换好礼"
        button="去积分兑换"
        icon="gift"
        @action="go('points')"
      />
      <ListPagination :total="total" :page-num="pageNum" :page-size="pageSize" :loading="loading" @change="loadAwards" />
      <button v-if="filtered.some(award => award.kind !== 'ticket')" class="btn btn-light section-space" @click="go('stores')">
        查找兑换网点
        <AppIcon name="arrow" :size="20" />
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import EmptyState from '../../components/EmptyState.vue'
import ListPagination from '../../components/ListPagination.vue'
import { state, loadRewardCodeQr } from '../../services/store.js'
import { useMemberList } from '../../services/member-list.js'
import { productImage } from '../../services/product-media.js'
import { go } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
import { get } from '../../services/api.js'
import { ticketImageSource, removeTicketImage } from '../../services/ticket-code.js'
const tab = ref('待兑换'),
  expanded = ref(''),
  qrById = reactive({}),
  qrLoading = reactive({}),
  qrErrors = reactive({})
const statuses = { 待兑换: 'pending', 已兑换: 'redeemed', 已失效: 'closed', 全部: 'all' }
const { rows, total, pageNum, pageSize, loading, loadError, load } = useMemberList('awards', {
  filters: () => ({ status: statuses[tab.value] }),
  demoRows: () => state.awards.filter(award => tab.value === '全部' || award.status === statuses[tab.value]),
})
const filtered = computed(() => rows.value)
const awardStatus = status => ({ pending: '待兑换', redeemed: '已兑换', closed: '已失效' })[status] || '状态更新中'
let qrSequence = 0
const ticketPaths = new Set()
function clearTicketQrs() {
  qrSequence++
  for (const id of ticketPaths) { removeTicketImage(qrById[id]); delete qrById[id]; delete qrLoading[id]; delete qrErrors[id] }
  ticketPaths.clear()
}
const formatExpiry = value => { const date = new Date(Number(value)); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
async function loadAwards(targetPage = pageNum.value) { clearTicketQrs(); expanded.value = ''; await load(targetPage) }
function chooseTab(value) { tab.value = value; loadAwards(1) }
onShow(() => loadAwards())
onHide(clearTicketQrs)
onUnload(clearTicketQrs)
watch(() => [loading.value, loadError.value, expanded.value, filtered.value], () => {
  if (!loading.value && !loadError.value && isApiMode()) void loadRewardQrs()
})
async function loadRewardQrs() {
  const sequence = qrSequence
  const pending = filtered.value.filter((award, index) => (index === 0 || expanded.value === award.id)
    && award.status === 'pending' && award.code)
  await Promise.all(pending.map(async (award) => {
    if (qrById[award.id] || qrLoading[award.id]) return
    qrLoading[award.id] = true
    if (award.kind === 'ticket') ticketPaths.add(award.id)
    delete qrErrors[award.id]
    try {
      let source
      if (award.kind === 'ticket') {
        const data = await get(`/mini/rewards/${encodeURIComponent(award.id)}/ticket-code`, true)
        source = await ticketImageSource(data.qrCode)
        if (sequence !== qrSequence) { removeTicketImage(source); return }
        ticketPaths.add(award.id)
      } else source = await loadRewardCodeQr(award.id)
      qrById[award.id] = source
    }
    catch (error) { if (sequence === qrSequence) qrErrors[award.id] = error.message || '二维码暂不可用' }
    finally { if (sequence === qrSequence) qrLoading[award.id] = false }
  }))
}
</script>

<style scoped>
.award-top .grow, .award-small .grow { min-width: 0; }
.award-top .section-title { font-size: 18px; line-height: 1.4; word-break: break-word; }
.award-top > text { flex-shrink: 0; font-size: 13px; }
.award-small .strong { word-break: break-word; }
.ticket-cover { width:80px; height:108px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; flex-shrink:0; background:#eef5f1; color:#255a45; border-radius:4px; font-size:14px; }
.awards-loading { min-height: 320px; }
.award-loading-card { display: flex; gap: 16px; padding: 16px; margin: 14px 0; border-radius: 8px; background: #fcfbf7; }
.award-loading-image, .award-loading-line { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: award-skeleton 1.4s ease-in-out infinite; }
.award-loading-image { width: 80px; height: 108px; flex: 0 0 auto; }
.award-loading-line { width: 72%; height: 14px; margin-top: 9px; }
.award-loading-line.wide { width: 90%; height: 18px; margin-top: 7px; }
.award-loading-line.short { width: 48%; }
@keyframes award-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
