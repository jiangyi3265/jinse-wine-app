<template>
  <PageShell title="商城" active="shop" left :back-button="false">
    <view class="search-box">
      <AppIcon name="search" :size="21" />
      <input v-model="keyword" placeholder="搜索商品" aria-label="搜索商品" confirm-type="search" />
      <button v-if="keyword" aria-label="清空搜索" @click="keyword = ''">×</button>
    </view>
    <view class="filter-tabs">
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
    <view class="sort-row">
      <button :class="{ ink: sort === 'default' }" @click="sort = 'default'">综合⌄</button>
      <button :class="{ ink: sort === 'sales' }" @click="sort = 'sales'">销量</button>
      <button @click="sort = sort === 'priceAsc' ? 'priceDesc' : 'priceAsc'">
        价格
        {{ sort === 'priceAsc' ? '↑' : sort === 'priceDesc' ? '↓' : '⌃⌄' }}
      </button>
    </view>
    <view v-if="filtered.length" class="section product-grid">
      <ProductCard v-for="product in filtered" :key="product.id" :product="product" />
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
import { products, loadCatalog } from '../../services/catalog.js'
import { toast } from '../../services/navigation.js'
const keyword = ref(''),
  category = ref('全部'),
  sort = ref('default'),
  categories = computed(() => ['全部', ...new Set(products.map((item) => item.category).filter(Boolean))])
onShow(() => loadCatalog().catch((error) => toast(error.message)))
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
