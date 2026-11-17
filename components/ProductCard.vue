<template>
  <view
    class="product-card"
    hover-class="pressed"
    role="button"
    :aria-label="product.name"
    @click="go('product', { id: product.id })"
  >
    <image :src="imageSrc" class="product-photo" mode="aspectFit" @error="handleImageError" />
    <text class="product-name">{{ product.name }}</text>
    <text class="product-spec">{{ product.spec }}</text>
    <view class="product-card-bottom"><PriceTag :value="product.price" :original="product.originalPrice" /><text v-if="soldOut" class="product-sold-out">暂时缺货</text><button v-else class="product-card-add" :disabled="adding" :aria-label="`将${product.name}加入购物车`" @click.stop="add">{{ adding ? '…' : '+' }}</button></view>
  </view>
</template>
<script setup>
import { computed, ref, toRef, watch } from 'vue'
import PriceTag from './PriceTag.vue'
import { go, toast } from '../services/navigation.js'
import { defaultProductImage, productImage } from '../services/product-media.js'
import { addCartItem } from '../services/store.js'
import { loadProductSkus } from '../services/catalog.js'
import { isApiMode } from '../services/config.js'
const adding = ref(false)
async function add() {
  if (adding.value || soldOut.value) return
  adding.value = true
  try {
    const skus = isApiMode() ? await loadProductSkus(product.value.id) : []
    if (skus.length && !skus.some(sku => sku.stock > 0)) { toast('该商品暂时缺货'); return }
    if (skus.length > 1) { go('product', { id: product.value.id }); toast('请选择商品规格'); return }
    await addCartItem(product.value.id, 1, skus[0]?.skuCode || '')
    toast('已加入购物车')
  } catch (error) { toast(error.message) }
  finally { adding.value = false }
}
const props = defineProps({ product: Object })
const product = toRef(props, 'product')
const soldOut = computed(() => product.value?.stock != null && Number(product.value.stock) <= 0)
const imageSrc = ref(productImage(product.value?.image))
watch(() => product.value?.image, (value) => { imageSrc.value = productImage(value) }, { immediate: true })
function handleImageError() { imageSrc.value = defaultProductImage() }
</script>
<style scoped>
.product-sold-out { flex-shrink: 0; font-size: 10px; line-height: 1.5; color: #85817e; }
</style>
