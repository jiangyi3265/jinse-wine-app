<template>
  <view v-if="total > 0" class="list-pagination">
    <text class="small muted">共 {{ total }} 条</text>
    <view v-if="total > pageSize" class="list-pagination-controls">
      <button class="list-page-button" :disabled="loading || pageNum <= 1" aria-label="上一页" @click="$emit('change', pageNum - 1)"><AppIcon name="back" :size="20" /></button>
      <text class="small muted">{{ pageNum }} / {{ pageCount }}</text>
      <button class="list-page-button" :disabled="loading || pageNum >= pageCount" aria-label="下一页" @click="$emit('change', pageNum + 1)"><AppIcon name="chevron" :size="20" /></button>
    </view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
const props = defineProps({ total: { type: Number, default: 0 }, pageNum: { type: Number, default: 1 }, pageSize: { type: Number, default: 20 }, loading: Boolean })
defineEmits(['change'])
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>
<style scoped>
.list-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 14px 0; border-top: 1px solid #e3e6dd; }
.list-pagination-controls { display: flex; align-items: center; gap: 14px; }
.list-page-button { display: flex; align-items: center; justify-content: center; flex: 0 0 40px; width: 40px; height: 40px; padding: 0; background: transparent; border: 1px solid #d6ded7; border-radius: 4px; }
.list-page-button[disabled] { opacity: 0.4; }
</style>
