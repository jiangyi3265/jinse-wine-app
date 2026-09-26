<template>
  <PageShell title="金色酒业" active="index" dark brand left search :back-button="false">
    <view class="hero-home" @touchstart="handleHeroTouchStart" @touchend="handleHeroTouchEnd">
      <swiper
        class="hero-home-swiper"
        :current="heroIndex"
        circular
        :disable-touch="true"
        @change="heroIndex = $event.detail.current"
      >
        <swiper-item v-for="(slide, index) in heroSlides" :key="slide.id || slide.key || index">
          <image class="hero-home-photo" :src="slide.imageUrl" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <button class="city-row" @click="go('stores')">
        <AppIcon name="pin" tone="gold" :size="17" />
        <text>{{ city || (isApiMode() ? '定位城市' : '贵港') }}⌄</text>
      </button>
      <view class="hero-copy">
        <text class="hero-title block">{{ displayValue(featured?.name, '金色典藏') }}</text>
        <text class="hero-subtitle block">{{ displayValue(featured?.spec, '53度酱香 · 500mL') }}</text>
        <button class="hero-link text-button" @click="featured?.id ? go('product', { id: featured.id }) : toast('暂无商品数据')">
          探索佳酿
          <AppIcon name="arrow" tone="gold" :size="21" />
        </button>
      </view>
      <view class="hero-dots">
        {{ String(heroIndex + 1).padStart(2, '0') }} / {{ String(heroSlides.length).padStart(2, '0') }}
        <view class="hero-dots-line"><view :style="heroProgressStyle" /></view>
      </view>
    </view>
    <view class="quick-links">
      <button
        v-for="entry in entries"
        :key="entry.route"
        class="quick-link"
        @click="go(entry.route)"
      >
        <AppIcon :name="entry.icon" :size="29" />
        <text>{{ entry.name }}</text>
      </button>
    </view>
    <view class="section">
      <button class="coupon-banner" @click="go('campaign')">
        <AppIcon name="coupon" :size="34" tone="gold" />
        <view class="grow">
        <text class="coupon-banner-title block">{{ displayValue(config.brand.homeCouponTitle, '节日领券') }}</text>
          <text class="muted">{{ displayValue(config.brand.homeCouponSubtitle, '领券享优惠　佳酿更尽兴') }}</text>
        </view>
        <AppIcon name="chevron" :size="21" />
      </button>
      <view class="section-heading">
        <text class="section-title serif">精选好酒</text>
        <button class="text-button muted" @click="go('shop')">
          全部
          <AppIcon name="arrow" :size="16" />
        </button>
      </view>
      <view
        class="feature-product"
        role="button"
        aria-label="典藏酱香"
        @click="featured?.id ? go('product', { id: featured.id }) : toast('暂无商品数据')"
      >
        <image :src="displayValue(featured?.image, '/static/design/product-classic.jpg')" mode="aspectFit" />
        <view class="column">
          <text class="serif">{{ displayValue(featured?.name, '典藏酱香') }}</text>
          <text class="muted">{{ displayValue(featured?.spec, '53度 500mL') }}</text>
          <PriceTag :value="displayValue(featured?.price, 39800)" :original="displayValue(featured?.originalPrice, 49800)" />
        </view>
      </view>
      <button class="video-banner" @click="go('service', { type: 'channels' })">
        <AppIcon name="play" tone="light" :size="28" />
        <text>{{ displayValue(config.brand.videoBannerTitle, '视频号精选') }}</text>
        <AppIcon name="arrow" tone="light" :size="20" />
        <image :src="displayValue(config.brand.videoBannerImage, '/static/design/detail-landscape.jpg')" mode="aspectFill" />
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import { go, toast } from '../../services/navigation.js'
import { products, stores, homeHeroSlides, loadCatalog } from '../../services/catalog.js'
import { computed, onMounted, ref } from 'vue'
import { config, displayValue, isApiMode } from '../../services/config.js'
const demoEntries = [
  { name: '扫码有礼', icon: 'scan', route: 'scan' },
  { name: '兑换网点', icon: 'shop', route: 'stores' },
  { name: '积分专区', icon: 'coin', route: 'points' },
  { name: 'VIP社群', icon: 'users', route: 'vip' },
]
const entries = computed(() => {
  const value = config.brand.homeNavigation
  if (Array.isArray(value)) return value
  if (isApiMode()) return []
  try { return value ? JSON.parse(value) : demoEntries } catch { return demoEntries }
})
const featured = computed(() => products[0])
const city = computed(() => stores[0]?.city || '')
const heroIndex = ref(0)
const heroTouchStartX = ref(0)
const heroSlides = computed(() => {
  if (homeHeroSlides.length) return homeHeroSlides
  const image = displayValue(config.brand.homeHeroImage || featured.value?.image, '/static/design/hero-product.jpg')
  return image ? [{ key: 'fallback-home-hero', imageUrl: image }] : []
})
const heroProgressStyle = computed(() => ({
  width: `${100 / Math.max(heroSlides.value.length, 1)}%`,
  transform: `translateX(${heroIndex.value * 100}%)`,
}))
// 由外层手势统一切换，避免 swiper 原生手势与业务索引重复累加。
function handleHeroTouchStart(event) {
  heroTouchStartX.value = event.touches?.[0]?.clientX || 0
}
function handleHeroTouchEnd(event) {
  const endX = event.changedTouches?.[0]?.clientX || event.touches?.[0]?.clientX || 0
  const distance = endX - heroTouchStartX.value
  if (Math.abs(distance) < 40 || heroSlides.value.length <= 1) return
  const direction = distance < 0 ? 1 : -1
  heroIndex.value = (heroIndex.value + direction + heroSlides.value.length) % heroSlides.value.length
}
onMounted(() => loadCatalog().catch((error) => toast(error.message)))
</script>
