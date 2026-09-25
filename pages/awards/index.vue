<template>
  <PageShell title="我的奖品">
    <view class="filter-tabs">
      <button
        v-for="item in ['待兑换', '已兑换', '全部']"
        :key="item"
        class="filter-tab"
        :class="{ active: tab === item }"
        @click="tab = item"
      >
        {{ item }}
      </button>
    </view>
    <view class="section">
      <template v-for="(award, index) in filtered" :key="award.id">
        <view v-if="index === 0 || expanded === award.id" class="award-panel">
          <view class="award-top">
            <image :src="award.image" mode="aspectFill" />
            <view class="grow column">
              <text class="section-title serif">{{ award.name }}</text>
              <text class="muted">{{ award.spec }}</text>
            </view>
            <text :class="award.status === 'pending' ? 'gold' : 'ink'">
              {{ award.status === 'pending' ? '待兑换' : '已兑换' }}
            </text>
          </view>
          <view v-if="award.status === 'pending'" class="award-qr">
            <QrCode />
            <text class="strong">请向门店核销员出示</text>
            <text class="muted small">兑换码仅用于奖品核销</text>
            <text class="small muted">演示码：{{ award.code }}</text>
          </view>
        </view>
        <view v-else class="award-small">
          <image :src="award.image" mode="aspectFill" />
          <view class="grow">
            <text class="strong block">{{ award.name }}</text>
            <text class="muted small">{{ award.spec }}</text>
          </view>
          <button class="btn btn-small btn-outline" @click="expanded = award.id">
            {{ award.status === 'pending' ? '出示兑换码' : '查看奖品' }}
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
      <button class="btn btn-light section-space" @click="go('stores')">
        查找兑换网点
        <AppIcon name="arrow" :size="20" />
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import QrCode from '../../components/QrCode.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state } from '../../services/store.js'
import { go } from '../../services/navigation.js'
const tab = ref('待兑换'),
  expanded = ref('')
const filtered = computed(() =>
  state.awards.filter(
    (a) => tab.value === '全部' || a.status === (tab.value === '待兑换' ? 'pending' : 'redeemed'),
  ),
)
</script>
