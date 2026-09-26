<template>
  <PageShell title="门店核销">
    <view v-if="state.user.role === 'staff'" class="section">
      <view class="staff-header">
        <image :src="assetUrl('/static/design/store.jpg', 'brand.store')" mode="aspectFill" />
        <view class="grow column">
          <text class="store-name">金色酒业体验店</text>
          <text class="member-badge ink" style="border-color: #496356">♙ 核销员</text>
        </view>
        <AppIcon name="chevron" :size="18" />
      </view>
      <view class="staff-scan">
        <AppIcon name="scan" :size="32" />
        <text class="grow small">扫描用户兑换码</text>
        <button class="btn btn-small btn-outline" @click="scan">扫码核销</button>
      </view>
      <view class="between section-heading">
        <text class="section-title serif">待确认奖品</text>
        <button class="text-button small" @click="manual = true">输入兑换码</button>
      </view>
      <view v-if="manual" class="search-box" style="margin: 0 0 16px">
        <input v-model="codeInput" placeholder="请输入兑换码" aria-label="兑换码" />
        <button @click="lookup">查询</button>
      </view>
      <template v-if="award">
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
                <text>{{ state.user.name }}</text>
              </view>
              <view class="between">
                <text class="muted small">状态</text>
                <text
                  class="badge"
                  :class="award.status === 'pending' ? 'badge-gold' : 'badge-green'"
                >
                  {{ award.status === 'pending' ? '待核销' : '已核销' }}
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
          {{ award.status === 'pending' ? '确认核销' : '已完成核销' }}
        </button>
        <text class="staff-note block">请核对实物奖品后确认</text>
      </template>
      <EmptyState
        v-else
        title="等待扫描兑奖码"
        description="扫描或输入顾客的个人奖品兑换码"
        icon="scan"
      />
      <view class="divider" />
      <view class="section-heading">
        <text class="section-title serif">
          今日核销
          <text style="font-size: 16px">{{ state.verificationRecords.length }}笔</text>
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
    </view>
    <EmptyState
      v-else
      title="暂无核销权限"
      description="请联系门店管理员开通核销员账号"
      icon="user"
    />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, verifyAward, lookupAward, refreshDomain } from '../../services/store.js'
import { isApiMode, assetUrl } from '../../services/config.js'
import { go, toast, confirm } from '../../services/navigation.js'
const selected = ref(state.awards.find((a) => a.status === 'pending')?.code || ''),
  codeInput = ref(''),
  manual = ref(false),
  busy = ref(false)
const award = computed(() => state.awards.find((a) => a.code === selected.value))
async function lookup() {
  selected.value = codeInput.value.trim()
  if (isApiMode()) {
    try {
      const result = await lookupAward(selected.value)
      state.awards = [result, ...state.awards.filter((item) => item.code !== selected.value)]
    } catch (error) { return toast(error.message) }
  }
  if (!award.value) toast('未找到奖品，请核对兑换码')
}
function scan() {
  // #ifdef H5
  uni.showActionSheet({
    itemList: state.awards.map(
      (a) => `${a.name} · ${a.status === 'pending' ? '待核销' : '已核销'}`,
    ),
    success: (r) => {
      selected.value = state.awards[r.tapIndex].code
    },
  })
  // #endif
  // #ifdef MP-WEIXIN
  uni.scanCode({
    success: (r) => {
      codeInput.value = r.result
      lookup()
    },
    fail: (e) => {
      if (!e.errMsg?.includes('cancel')) toast('无法扫码，请检查相机权限')
    },
  })
  // #endif
}
async function verify() {
  if (busy.value || !award.value) return
  busy.value = true
  try {
    if (
      await confirm(
        '确认核销奖品',
        `确认已向顾客发放${award.value.name}？核销后不可重复兑换。`,
        '确认核销',
      )
    ) {
      await verifyAward(selected.value)
      toast('核销成功')
    }
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}
</script>
