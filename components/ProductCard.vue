<template>
  <view
    class="product-card"
    hover-class="pressed"
    role="button"
    :aria-label="product.name"
    @click="go('product', { id: product.id })"
  >
    <image :src="imageSrc" class="product-photo" mode="aspectFill" @error="handleImageError" />
    <text class="product-name">{{ product.name }}</text>
    <text class="product-spec">{{ product.spec }}</text>
    <PriceTag :value="product.price" :original="product.originalPrice" />
  </view>
</template>
<script setup>
import { ref, toRef, watch } from 'vue'
import PriceTag from './PriceTag.vue'
import { go } from '../services/navigation.js'
import { defaultProductImage, productImage } from '../services/product-media.js'
const props = defineProps({ product: Object })
const product = toRef(props, 'product')
const imageSrc = ref(productImage(product.value?.image))
watch(() => product.value?.image, (value) => { imageSrc.value = productImage(value) }, { immediate: true })
function handleImageError() { imageSrc.value = defaultProductImage() }
</script>
