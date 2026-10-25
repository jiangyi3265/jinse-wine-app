<template>
  <PageShell title="我的团队">
    <view class="section">
      <view class="section-heading">
        <text class="section-title serif">我的团队 · {{ members.length }}人</text>
        <text v-if="!isApiMode()" class="muted small">演示数据</text>
      </view>
      <view v-for="(member, index) in members" :key="member.id || member.name" class="record-row">
        <image v-if="member.avatar" :src="member.avatar" class="rank-avatar team-avatar" mode="aspectFill" />
        <view v-else class="rank-avatar">{{ (member.name || '').slice(0, 1) }}</view>
        <view class="grow">
          <text class="strong block">{{ member.name }}</text>
          <text class="muted small">{{ member.type || (isApiMode() ? formatJoinedAt(member.createdAt) : (index < 3 ? '推广成员' : '注册会员')) }}</text>
        </view>
        <text class="muted small">{{ member.status || (isApiMode() ? '已加入团队' : (index < 3 ? '已成交' : '待成交')) }}</text>
      </view>
      <EmptyState
        v-if="!loading && !members.length"
        :title="loadError ? '团队信息暂时无法加载' : '还没有团队成员'"
        :description="loadError || '分享推广海报，邀请好友成为你的团队成员'"
        :button="loadError ? '重新加载' : '生成推广海报'"
        icon="users"
        @action="loadError ? loadTeam() : go('poster')"
      />
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import EmptyState from '../../components/EmptyState.vue'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { state, refreshDomain } from '../../services/store.js'
import { isApiMode } from '../../services/config.js'
import { go, toast } from '../../services/navigation.js'
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
const loading = ref(false), loadError = ref('')
function formatJoinedAt(value) {
  if (!value) return '已加入团队'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '已加入团队'
  return `加入于 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
async function loadTeam() {
  if (!isApiMode()) return
  loading.value = true
  loadError.value = ''
  try { await refreshDomain('team') }
  catch (error) { loadError.value = error.message || '团队信息暂时无法获取，请稍后重试'; toast(loadError.value) }
  finally { loading.value = false }
}
onShow(loadTeam)
</script>
