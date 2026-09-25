<template>
  <view class="price-tag" :class="{ 'price-large': large, 'price-light': light }">
    <text class="price-current">
      <text class="currency">¥</text>
      {{ money(value) }}
    </text>
    <text v-if="original && original > value" class="price-original">¥{{ money(original) }}</text>
  </view>
</template>
<script setup>
import { money } from '../services/pricing.js'
defineProps({
  value: Number,
  original: Number,
  large: Boolean,
  light: Boolean,
})
</script>
