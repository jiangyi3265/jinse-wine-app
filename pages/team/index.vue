<template>
  <PageShell title="我的团队">
    <view class="section">
      <view class="section-heading">
        <text class="section-title serif">我的团队 · {{ members.length }}人</text>
        <text v-if="!isApiMode()" class="muted small">演示数据</text>
      </view>
      <view v-for="(member, index) in members" :key="member.id || member.name" class="record-row">
        <view class="rank-avatar">{{ (member.name || '').slice(0, 1) }}</view>
        <view class="grow">
          <text class="strong block">{{ member.name }}</text>
          <text class="muted small">{{ member.type || (index < 3 ? '推广成员' : '注册会员') }}</text>
        </view>
        <text class="muted small">{{ member.status || (index < 3 ? '已成交' : '待成交') }}</text>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { state, refreshDomain } from '../../services/store.js'
import { isApiMode } from '../../services/config.js'
import { toast } from '../../services/navigation.js'
const names = [
  '李先生',
  '陈女士',
  '王先生',
  '赵先生',
  '周女士',
  '刘先生',
  '黄女士',
  '吴先生',
  '林女士',
  '何先生',
  '徐女士',
  '郑先生',
]
const members = computed(() => isApiMode() ? state.team : names.map((name) => ({ name })))
onShow(() => { if (isApiMode()) refreshDomain('team').catch((error) => toast(error.message)) })
</script>
