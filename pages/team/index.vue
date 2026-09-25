<template>
  <PageShell title="我的团队">
    <view class="section">
      <view class="section-heading">
        <text class="section-title serif">我的团队 · 12人</text>
        <text class="muted small">演示数据</text>
      </view>
      <view v-for="(name, index) in names" :key="name" class="record-row">
        <view class="rank-avatar">{{ name.slice(0, 1) }}</view>
        <view class="grow">
          <text class="strong block">{{ name }}</text>
          <text class="muted small">{{ index < 3 ? '推广成员' : '注册会员' }}</text>
        </view>
        <text class="muted small">{{ index < 3 ? '已成交' : '待成交' }}</text>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
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
</script>
