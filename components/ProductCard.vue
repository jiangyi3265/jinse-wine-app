<template>
  <view
    class="product-card"
    hover-class="pressed"
    role="button"
    :aria-label="product.name"
    @click="go('product', { id: product.id })"
  >
    <image :src="product.image" class="product-photo" mode="aspectFill" />
    <text class="product-name">{{ product.name }}</text>
    <text class="product-spec">{{ product.spec }}</text>
    <PriceTag :value="product.price" :original="product.originalPrice" />
  </view>
</template>
<script setup>
import PriceTag from './PriceTag.vue'
import { go } from '../services/navigation.js'
defineProps({ product: Object })
</script>
