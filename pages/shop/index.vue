<template>
  <PageShell title="商城" active="shop" left sticky-header :back-button="false">
    <template #header-tools>
      <view class="shop-toolbar">
        <view class="search-box">
          <AppIcon name="search" :size="19" />
          <input v-model="keyword" :disabled="Boolean(loadError)" placeholder="搜索商品" aria-label="搜索商品" confirm-type="search" />
          <button v-if="keyword" aria-label="清空搜索" @click="keyword = ''">×</button>
        </view>
        <button class="cart-link" aria-label="打开购物车" @click="go('cart')">
          <AppIcon name="cart" tone="brand" :size="21" />
          <text>购物车</text>
          <text v-if="cartQuantity > 0" class="cart-count">{{ cartQuantity > 99 ? '99+' : cartQuantity }}</text>
        </button>
      </view>
    </template>
    <view v-if="!loadError" class="filter-tabs shop-category-tabs">
      <button
        v-for="item in categories"
        :key="item"
        class="filter-tab"
        :class="{ active: category === item }"
        @click="category = item"
      >
        {{ item }}
      </button>
    </view>
    <view v-if="!loadError" class="sort-row" role="group" aria-label="商品排序">
      <button :class="{ ink: sort === 'default' }" :aria-pressed="sort === 'default'" @click="sort = 'default'">综合</button>
      <button :class="{ ink: sort === 'sales' }" :aria-pressed="sort === 'sales'" @click="sort = 'sales'">销量</button>
      <button
        :class="{ ink: sort === 'priceAsc' || sort === 'priceDesc' }"
        :aria-pressed="sort === 'priceAsc' || sort === 'priceDesc'"
        :aria-label="sort === 'priceAsc' ? '价格从低到高' : sort === 'priceDesc' ? '价格从高到低' : '按价格排序'"
        @click="sort = sort === 'priceAsc' ? 'priceDesc' : 'priceAsc'"
      >
        价格
        {{ sort === 'priceAsc' ? '↑' : sort === 'priceDesc' ? '↓' : '↕' }}
      </button>
    </view>
    <view v-if="loading" class="section product-grid product-grid-skeleton" aria-label="正在加载商品">
      <view v-for="item in 4" :key="item" class="product-skeleton">
        <view class="product-skeleton-image" />
        <view class="product-skeleton-line" />
        <view class="product-skeleton-line narrow" />
        <view class="product-skeleton-price" />
      </view>
    </view>
    <EmptyState
      v-else-if="loadError"
      title="商城暂时无法加载"
      :description="loadError"
      button="重新加载"
      icon="info"
      @action="reload"
    />
    <view v-else-if="filtered.length" class="section product-grid">
      <ProductCard v-for="product in filtered" :key="product.id" :product="product" @added="refreshCartQuantity" />
    </view>
    <EmptyState
      v-else
      title="没有找到相关商品"
      description="换个关键词或分类再试试"
      button="查看全部商品"
      @action="reset"
    />
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import ProductCard from '../../components/ProductCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { products, loadProductCatalog } from '../../services/catalog.js'
import { go } from '../../services/navigation.js'
import { hasSession } from '../../services/api.js'
import { isApiMode } from '../../services/config.js'
import { fetchCart } from '../../services/store.js'
const keyword = ref(''),
  category = ref('全部'),
  sort = ref('default'),
  loading = ref(true),
  loadError = ref(''),
  categories = computed(() => ['全部', ...new Set(products.map((item) => item.category).filter(Boolean))])
const cartQuantity = ref(0)
let cartRead = 0
async function refreshCartQuantity() {
  const read = ++cartRead
  if (isApiMode() && !hasSession()) { cartQuantity.value = 0; return }
  try {
    const items = await fetchCart()
    if (read === cartRead) cartQuantity.value = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  } catch {
    if (read === cartRead) cartQuantity.value = 0
  }
}
onShow(() => { void refreshCartQuantity(); return reload() })
async function reload() {
  loading.value = true
  loadError.value = ''
  try { await loadProductCatalog() }
  catch (error) { loadError.value = error.message || '请检查网络连接后重试' }
  finally { loading.value = false }
}
const filtered = computed(() => {
  const items = products.filter(
    (p) =>
      (category.value === '全部' || p.category === category.value) &&
      `${p.name}${p.spec}${p.category}`.includes(keyword.value.trim()),
  )
  return items.sort((a, b) =>
    sort.value === 'sales'
      ? b.sales - a.sales
      : sort.value === 'priceAsc'
        ? a.price - b.price
        : sort.value === 'priceDesc'
          ? b.price - a.price
          : 0,
  )
})
function reset() {
  keyword.value = ''
  category.value = '全部'
  sort.value = 'default'
}
</script>
<style scoped>
.shop-toolbar { display: flex; align-items: center; gap: 10px; padding: 4px 16px 9px; }
.shop-toolbar .search-box { flex: 1; min-width: 0; margin: 0; height: 42px; }
.cart-link { display: flex; flex: none; align-items: center; justify-content: center; gap: 5px; height: 44px; margin: 0; padding: 0 11px; border-radius: 12px; color: #782d3b; background: #f4e8ea; font-size: 14px; line-height: 1; font-weight: 600; }
.cart-count { padding: 3px 5px; border-radius: 12px; background: #782d3b; color: #fff; font-size: 10px; }
.product-grid-skeleton { align-items: stretch; }
.product-skeleton { min-width: 0; padding: 0 0 16px; background: #fff; border: 1px solid #ece9e2; border-radius: 8px; overflow: hidden; }
.product-skeleton-image, .product-skeleton-line, .product-skeleton-price { background: linear-gradient(90deg, #f0eee8 25%, #f8f7f3 50%, #f0eee8 75%); background-size: 200% 100%; animation: shop-skeleton-shimmer 1.35s ease-in-out infinite; }
.product-skeleton-image { aspect-ratio: 1; }
.product-skeleton-line { width: 72%; height: 14px; margin: 14px 12px 0; border-radius: 7px; }
.product-skeleton-line.narrow { width: 48%; height: 11px; margin-top: 9px; }
.product-skeleton-price { width: 38%; height: 20px; margin: 14px 12px 0; border-radius: 6px; }
@keyframes shop-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
</style>
