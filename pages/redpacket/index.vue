<template>
  <PageShell title="现金红包">
    <template v-if="packet">
      <view class="reward-heading">
        <view v-if="received" class="reward-status-icon">
          <AppIcon name="check" tone="light" :size="40" />
        </view>
        <AppIcon v-else name="gift" tone="gold" :size="70" style="margin: 0 0 12px" />
        <text class="reward-heading-title">{{ received ? '红包已到账' : '恭喜抽中现金红包' }}</text>
        <text class="reward-heading-sub">
          {{ received ? '感谢参与金色酒业活动' : '金色酒业送您一份专属福利' }}
        </text>
      </view>
      <view class="section">
        <view class="red-packet">
          <text class="packet-brand">金色酒业</text>
          <view class="packet-money">
            <text class="currency">¥</text>
            {{ money(packet.amount, true) }}
          </view>
          <text class="packet-label">现金红包</text>
          <view class="packet-line" />
        </view>
        <view class="packet-state">
          <view class="row">
            <AppIcon
              :name="received ? 'check' : 'clock'"
              :tone="received ? 'ink' : 'gold'"
              :size="23"
            />
            <text class="packet-state-title" :class="received ? 'ink' : 'gold'">
              {{ received ? '已发至微信零钱' : busy ? '处理中' : '待领取' }}
            </text>
          </view>
          <text class="muted small">
            {{ received ? (isApiMode() ? '到账状态以服务端和微信记录为准' : '演示到账状态，未发生真实转账') : '请及时领取，到账以微信记录为准' }}
          </text>
        </view>
        <view class="packet-actions">
          <button v-if="!received" class="btn" :disabled="busy" @click="receive">
            {{ busy ? '领取中…' : '领取到微信零钱' }}
          </button>
          <text v-if="!received" class="muted small center">确认收款后，红包将发至微信零钱</text>
          <button
            :class="['btn', received ? '' : 'btn-outline']"
            @click="go('records', { type: 'cash' })"
          >
            查看领取记录
            <AppIcon v-if="!received" name="arrow" :size="19" />
          </button>
          <button v-if="received" class="btn btn-outline" @click="go('index')">返回首页</button>
        </view>
        <button class="packet-support" @click="contact">
          <AppIcon name="headset" :size="22" />
          领取遇到问题？联系客服
        </button>
      </view>
    </template>
    <EmptyState
      v-else
      title="未找到这份红包"
      button="查看领取记录"
      @action="go('records', { type: 'cash' })"
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
const id = ref('redpack-1'),
  busy = ref(false)
onLoad((q) => {
  id.value = q.id || 'redpack-1'
})
onShow(() => {
  if (isApiMode() && id.value) refreshRedPacket(id.value).catch((error) => toast(error.message))
})
const packet = computed(() => state.redPackets.find((p) => p.id === id.value)),
  received = computed(() => packet.value?.status === 'received')
async function receive() {
  if (busy.value || received.value) return
  busy.value = true
  try {
    if (!isApiMode() &&
      !(await confirm(
        '预览红包到账',
        '当前为前端演示，本次仅预览到账页面，不会向微信零钱转入资金。实际到账需接入微信商家转账。',
        '预览到账',
      ))) return
    await receiveRedPacket(id.value)
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}
</script>
