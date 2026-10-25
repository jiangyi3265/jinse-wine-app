<template>
  <PageShell title="扫码有礼" dark left :back-button="false" active="scan">
    <view class="scan-hero">
      <image :src="assetUrl('/static/design/detail-scene-clean.jpg', 'brand.scan')" mode="aspectFill" />
      <view class="scan-hero-copy">
        <view class="hero-title">
          <text class="block">开启</text>
          <text class="block">一份</text>
          <text class="block">好礼</text>
        </view>
      </view>
      <view class="scanner-frame" />
    </view>
    <view class="scan-content">
      <button class="btn" aria-label="扫描瓶身活动码参与抽奖" @click="scan">
        <AppIcon name="scan" tone="light" :size="30" />
        扫一扫
      </button>
      <view class="section-heading">
        <text class="section-title serif">{{ isApiMode() ? '活动奖项' : '演示奖项' }}</text>
        <text class="small muted">{{ isApiMode() ? '以当前活动规则为准' : '仅供界面预览' }}</text>
      </view>
      <view v-if="isApiMode()" class="draw-catalog">
        <view v-if="drawLoading" class="draw-catalog-state">正在获取活动奖项</view>
        <view v-else-if="drawError" class="draw-catalog-state">
          <text>{{ drawError }}</text>
          <button class="text-button" @click="loadPrizes">重新加载</button>
        </view>
        <view v-else-if="drawActivities.length">
          <view v-for="activity in drawActivities" :key="activity.activityId" class="draw-activity">
            <view class="draw-activity-heading">
              <text class="strong">{{ activity.activityName }}</text>
              <text class="small muted">{{ activityPeriod(activity) }}</text>
            </view>
            <view class="prize-preview-grid">
              <view v-for="prize in activity.prizes" :key="prize.prizeId" class="prize-preview">
                <image v-if="prize.image" :src="prize.image" mode="aspectFill" />
                <view v-else class="prize-preview-icon"><AppIcon :name="prizeIcon(prize.kind)" tone="gold" :size="28" /></view>
                <text class="strong">{{ prize.name }}</text>
                <text class="small muted">{{ prizeValue(prize) }}</text>
                <text class="small muted">{{ Number(prize.stock) < 0 ? '库存不限' : `剩余 ${prize.stock} 份` }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="draw-catalog-state">当前暂无进行中的抽奖活动</view>
      </view>
      <view v-else class="prize-preview-grid">
        <view class="prize-preview">
          <AppIcon name="coupon" tone="gold" :size="38" />
          <text class="strong">现金红包</text>
          <text class="small muted">金额以服务端中奖结果为准</text>
        </view>
        <view class="prize-preview">
          <image :src="assetUrl('/static/design/cup.jpg', 'brand.cup')" mode="aspectFill" />
          <text class="strong">实物礼品</text>
          <text class="small muted">演示奖项示意</text>
        </view>
      </view>
      <view class="scan-links">
        <button class="text-button" @click="go('rules', { type: 'draw' })">
          活动规则
          <AppIcon name="arrow" :size="17" />
        </button>
        <button class="text-button" @click="go('records', { type: 'draw' })">
          抽奖记录
          <AppIcon name="arrow" :size="17" />
        </button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { previewDraw, drawCode, loadDrawPrizes } from '../../services/store.js'
import { config, isApiMode, assetUrl } from '../../services/config.js'
import { lotteryCodeFromInput } from '../../services/lottery-link.js'
import { go, toast, confirm } from '../../services/navigation.js'
import { ref } from 'vue'
const drawActivities = ref([])
const drawLoading = ref(false)
const drawError = ref('')
onShow(loadPrizes)
async function loadPrizes() {
  if (!isApiMode()) return
  drawLoading.value = true
  drawError.value = ''
  try { drawActivities.value = await loadDrawPrizes() }
  catch (error) { drawError.value = error.message || '活动奖项暂时无法获取' }
  finally { drawLoading.value = false }
}
function prizeIcon(kind) {
  return kind === 'cash' || kind === 'coupon' ? 'coupon' : kind === 'points' ? 'coin' : 'gift'
}
function prizeValue(prize) {
  if (prize.kind === 'cash') {
    const min = (Number(prize.amountMinCent || 0) / 100).toFixed(2)
    const max = (Number(prize.amountMaxCent || 0) / 100).toFixed(2)
    return min === max ? `红包 ¥${min}` : `红包 ¥${min}–¥${max}`
  }
  if (prize.kind === 'points') return `${Number(prize.points || 0)} 积分`
  return prize.kind === 'ticket' ? '门票权益' : prize.kind === 'coupon' ? '优惠权益' : '实物礼品'
}
function activityPeriod(activity) {
  const format = (value) => {
    if (!value) return ''
    const date = new Date(Number(value))
    if (Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }
  const start = format(activity.startTime)
  const end = format(activity.endTime)
  if (start && end) return `${start} - ${end}`
  if (end) return `截至 ${end}`
  if (start) return `${start} 起`
  return '长期有效'
}
onLoad((options) => {
  const source = options?.code || options?.scene || options?.q
  if (!source) return
  const code = lotteryCodeFromInput(source, config.lotteryQrPrefix)
  if (!code) return toast('抽奖二维码无效，请重新扫码')
  handleCode(code)
})
async function demo() {
  if (
    !(await confirm(
      '前端抽奖演示',
      '选择一种奖励以预览页面。演示奖励仅保存在本机，不代表真实中奖。',
      '继续预览',
    ))
  )
    return
  uni.showActionSheet({
    itemList: ['现金红包', '积分奖励', '20元代金券', '实物品鉴杯'],
    success: (r) => {
      const kind = ['cash', 'points', 'coupon', 'goods'][r.tapIndex]
      const reward = previewDraw(kind)
      if (kind === 'cash') go('redpacket', { id: reward.rewardId })
      else {
        toast('演示奖励已发放')
        go(kind === 'points' ? 'points' : kind === 'coupon' ? 'my-coupons' : 'awards')
      }
    },
  })
}
async function handleCode(code) {
  if (!isApiMode()) {
    const reward = previewDraw(code)
    if (code === 'cash') go('redpacket', { id: reward.rewardId })
    else { toast('演示奖励已发放'); go(code === 'points' ? 'points' : code === 'coupon' ? 'my-coupons' : 'awards') }
    return
  }
  try {
    const reward = await drawCode(code)
    if (reward?.kind === 'cash') go('redpacket', { id: reward.id })
    else if (['goods', 'ticket'].includes(reward?.kind)) go('awards')
    else if (reward?.kind === 'coupon') go('my-coupons')
    else if (reward?.kind === 'points') go('points')
    else toast(reward?.message || '活动码已提交，结果以服务端为准')
  } catch (error) { toast(error.message) }
}
function scan() {
  // #ifdef H5
  if (isApiMode()) return toast('请在微信小程序中使用扫码活动')
  demo()
  // #endif
  // #ifdef MP-WEIXIN
  if (isApiMode()) {
    scanCamera()
    return
  }
  uni.showActionSheet({
    itemList: ['扫描活动码', '预览演示奖励'],
    success: (r) => {
      if (r.tapIndex === 1) return demo()
      scanCamera()
    },
  })
  // #endif
}
function scanCamera() {
  uni.scanCode({
    onlyFromCamera: true,
    success: (result) => {
      const code = lotteryCodeFromInput(result.result, config.lotteryQrPrefix)
      if (code) handleCode(code)
      else toast('抽奖二维码无效，请重新扫码')
    },
    fail: (error) => {
      if (!error.errMsg?.includes('cancel')) toast('无法扫码，请检查相机权限')
    },
  })
}
</script>
