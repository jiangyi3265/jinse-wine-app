<template>
  <view class="coupon-card" :class="{ 'coupon-disabled': disabled }">
    <view class="coupon-value">
      <view>
        <text v-if="coupon.kind === 'fixed'" class="coupon-symbol">¥</text>
        <text class="coupon-number">{{ coupon.label }}</text>
        <text v-if="coupon.kind === 'percent'" class="coupon-unit">折</text>
      </view>
      <view class="coupon-waves">⌒⌒⌒⌒⌒⌒⌒⌒</view>
    </view>
    <view class="coupon-body">
      <view class="coupon-title-row">
        <text class="coupon-name">{{ coupon.name }}</text>
        <text v-if="badge" class="badge badge-gold">{{ coupon.channel }}</text>
      </view>
      <text class="muted coupon-description">{{ coupon.description }}</text>
      <view class="coupon-bottom">
        <button class="text-button" @click="$emit('rules', coupon)">
          {{ mine ? '查看规则' : '使用规则' }}
          <AppIcon name="chevron" :size="13" />
        </button>
        <button
          class="btn btn-small"
          :class="{ 'btn-outline': disabled }"
          :disabled="disabled"
          @click="$emit('action', coupon)"
        >
          {{ actionLabel }}
        </button>
      </view>
      <text v-if="reason" class="coupon-reason">{{ reason }}</text>
    </view>
  </view>
</template>
<script setup>
import AppIcon from './AppIcon.vue'
defineProps({
  coupon: Object,
  actionLabel: { type: String, default: '领取' },
  disabled: Boolean,
  badge: Boolean,
  mine: Boolean,
  reason: String,
})
defineEmits(['action', 'rules'])
</script>
