<template>
  <view class="empty-state">
    <view class="empty-state-mark" aria-hidden="true">
      <AppIcon :name="icon" :size="34" tone="gold" />
    </view>
    <text class="empty-title">{{ title }}</text>
    <text class="muted">{{ description }}</text>
    <button v-if="button" class="btn btn-outline" @click="$emit('action')">
      {{ button }}
    </button>
  </view>
</template>
<script setup>
import AppIcon from './AppIcon.vue'
defineProps({
  title: { type: String, default: '暂无记录' },
  description: String,
  button: String,
  icon: { type: String, default: 'bag' },
})
defineEmits(['action'])
</script>
