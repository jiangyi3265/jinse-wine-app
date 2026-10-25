<template>
  <view class="price-tag" :class="{ 'price-large': props.large, 'price-light': props.light }">
    <text class="price-current">
      <text class="currency">¥</text>
      {{ money(value) }}
    </text>
    <text v-if="original && original > value" class="price-original">¥{{ money(original) }}</text>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import { money } from '../services/pricing.js'
const props = defineProps({
  // API mode renders once before catalog data arrives; accept an empty string
  // during that short loading window without emitting a Vue prop warning.
  value: { type: [Number, String], default: 0 },
  original: { type: [Number, String], default: 0 },
  large: Boolean,
  light: Boolean,
})
const value = computed(() => Number(props.value) || 0)
const original = computed(() => Number(props.original) || 0)
</script>
