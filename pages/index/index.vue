<template>
  <PageShell title="金色酒业" active="index" dark brand left search :back-button="false">
    <view v-if="loading" class="hero-home hero-home-loading" aria-label="正在加载首页内容">
      <view class="home-loading-photo" />
      <view class="home-loading-copy">
        <view class="home-loading-line home-loading-line--title" />
        <view class="home-loading-line home-loading-line--subtitle" />
        <view class="home-loading-line home-loading-line--action" />
      </view>
    </view>
    <view v-else class="hero-home" @touchstart="handleHeroTouchStart" @touchend="handleHeroTouchEnd">
      <swiper
        v-if="heroSlides.length"
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
      <view v-else class="hero-home-empty">
        <view class="hero-home-seal">金</view>
        <text>更多佳酿，敬请期待</text>
        <text class="hero-home-empty-copy">精选内容即将上线</text>
      </view>
      <button class="city-row" @click="go('stores')">
        <AppIcon name="pin" tone="gold" :size="17" />
        <text>{{ city ? `${city.replace(/市$/, '')}门店` : '兑换网点' }}⌄</text>
      </button>
      <view class="hero-copy">
        <text class="hero-title block">{{ featured?.name || brand.homeHeroTitle || '金色酒业' }}</text>
        <text class="hero-subtitle block">{{ featured?.spec || brand.homeHeroSubtitle || '品质酱香，礼遇知己' }}</text>
        <button v-if="featured?.id" class="hero-link text-button" @click="go('product', { id: featured.id })">
          探索佳酿
          <AppIcon name="arrow" tone="gold" :size="21" />
        </button>
      </view>
      <view v-if="heroSlides.length" class="hero-dots">
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
        <view class="quick-icon">
          <AppIcon :name="entry.icon" :size="22" />
        </view>
        <text>{{ entry.name }}</text>
      </button>
    </view>
    <view class="section">
      <button class="coupon-banner" @click="go('campaign')">
        <AppIcon name="coupon" :size="34" tone="gold" />
        <view class="grow">
        <text class="coupon-banner-title block">{{ displayValue(brand.homeCouponTitle, '节日领券') }}</text>
          <text class="muted">{{ displayValue(brand.homeCouponSubtitle, '领券享优惠　佳酿更尽兴') }}</text>
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
      <view v-if="loading" class="feature-product feature-product-loading" aria-label="正在加载精选商品">
        <view class="feature-loading-image" />
        <view class="feature-loading-copy">
          <view class="feature-loading-line feature-loading-line--title" />
          <view class="feature-loading-line feature-loading-line--meta" />
          <view class="feature-loading-line feature-loading-line--price" />
        </view>
      </view>
      <view
        v-else-if="featured"
        class="feature-product"
        role="button"
        aria-label="典藏酱香"
        @click="featured?.id ? go('product', { id: featured.id }) : toast('暂无商品数据')"
      >
        <image :src="productImage(featured?.image)" mode="aspectFit" />
        <view class="column">
          <text class="serif">{{ displayValue(featured?.name, '典藏酱香') }}</text>
          <text class="muted">{{ displayValue(featured?.spec, '53度 500mL') }}</text>
          <PriceTag :value="displayValue(featured?.price, 39800)" :original="displayValue(featured?.originalPrice, 49800)" />
        </view>
      </view>
      <view v-else class="feature-empty">
        <view class="feature-empty-mark"><AppIcon name="gift" tone="gold" :size="24" /></view>
        <view class="grow">
          <text class="feature-empty-title">{{ productReady ? '精选好酒即将上线' : '精选商品加载失败' }}</text>
          <text class="muted">{{ productReady ? '关注商城，第一时间获取上新信息' : productError }}</text>
        </view>
        <button class="text-button muted" @click="productReady ? go('shop') : loadHome()">{{ productReady ? '去看看' : '重新加载' }} <AppIcon name="arrow" :size="16" /></button>
      </view>
      <button v-if="showVideoBanner" class="video-banner" @click="go('service', { type: 'channels' })">
        <AppIcon name="play" tone="light" :size="28" />
        <text>{{ displayValue(brand.videoBannerTitle, '视频号精选') }}</text>
        <AppIcon name="arrow" tone="light" :size="20" />
        <image :src="brand.videoBannerImage || assetUrl('/static/design/detail-landscape.jpg')" mode="aspectFill" />
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import { go } from '../../services/navigation.js'
import { products, stores, homeHeroSlides, loadProductCatalog, loadStoreCatalog, loadPresentationCatalog } from '../../services/catalog.js'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { config, displayValue, isApiMode, assetUrl } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
import { resolveRegion } from '../../services/regions.js'
const demoEntries = [
  { name: '扫码有礼', icon: 'scan', route: 'scan' },
  { name: '兑换网点', icon: 'shop', route: 'stores' },
  { name: '积分专区', icon: 'coin', route: 'points' },
  { name: 'VIP社群', icon: 'users', route: 'vip' },
]
const entries = computed(() => {
  const value = brand.value.homeNavigation
  if (Array.isArray(value) && value.length) return value
  // 这些只是固定功能入口，不包含商品、价格或库存；后台没有配置导航时仍保持首页可用。
  try { return value ? JSON.parse(value) : demoEntries } catch { return demoEntries }
})
const productReady = ref(!isApiMode())
const storeReady = ref(!isApiMode())
const presentationReady = ref(!isApiMode())
const productError = ref('')
const brand = computed(() => presentationReady.value ? config.brand : {})
const featured = computed(() => productReady.value ? products[0] : null)
const showVideoBanner = computed(() => !isApiMode() || (presentationReady.value && Boolean(config.finderUserName || config.videoLiveFeedId || config.videoFeedId)))
const city = computed(() => {
  if (!storeReady.value) return ''
  return stores.map(store => resolveRegion(store)).find(path => path.length >= 2)?.[1] || ''
})
const loading = ref(true)
const heroIndex = ref(0)
const heroTouchStartX = ref(0)
const heroSlides = computed(() => {
  if (presentationReady.value && homeHeroSlides.length) return homeHeroSlides
  const image = displayValue(brand.value.homeHeroImage || featured.value?.image, assetUrl('/static/design/hero-product.jpg', 'home.hero'))
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
let homeTask
function loadHome() {
  if (homeTask) return homeTask
  homeTask = (async () => {
    loading.value = true
    productReady.value = false
    storeReady.value = false
    presentationReady.value = false
    productError.value = ''
    const results = await Promise.allSettled([
      loadProductCatalog(), loadStoreCatalog(), loadPresentationCatalog(),
    ])
    productReady.value = results[0].status === 'fulfilled'
    storeReady.value = results[1].status === 'fulfilled'
    presentationReady.value = results[2].status === 'fulfilled'
    if (!productReady.value) productError.value = results[0].reason?.message || '请检查网络后重试'
    loading.value = false
  })().finally(() => { homeTask = null })
  return homeTask
}
onShow(loadHome)
</script>

<style scoped>
.hero-home-loading { position: relative; overflow: hidden; background: #102b22; }
.home-loading-photo { position: absolute; right: 0; bottom: 0; width: 52%; height: 100%; background: linear-gradient(100deg, rgba(255,255,255,.04) 20%, rgba(255,255,255,.12) 40%, rgba(255,255,255,.04) 60%); background-size: 300% 100%; animation: home-skeleton-shimmer 1.5s ease-in-out infinite; }
.home-loading-copy { position: absolute; left: 28px; right: 36%; bottom: 42px; }
.home-loading-line, .feature-loading-image, .feature-loading-line { background: linear-gradient(100deg, #e9e9e2 20%, #f7f7f2 40%, #e9e9e2 60%); background-size: 300% 100%; animation: home-skeleton-shimmer 1.5s ease-in-out infinite; }
.home-loading-line { height: 15px; margin-top: 12px; border-radius: 8px; opacity: .28; }
.home-loading-line--title { width: 84%; height: 27px; margin-top: 0; opacity: .4; }
.home-loading-line--subtitle { width: 60%; }
.home-loading-line--action { width: 38%; margin-top: 22px; }
.feature-product-loading { pointer-events: none; }
.feature-loading-image { width: 112px; height: 112px; flex: 0 0 112px; border-radius: 4px; }
.feature-loading-copy { flex: 1; }
.feature-loading-line { width: 80%; height: 14px; margin: 5px 0 0; border-radius: 7px; }
.feature-loading-line--title { width: 64%; height: 18px; margin-top: 0; }
.feature-loading-line--meta { width: 48%; margin-top: 12px; }
.feature-loading-line--price { width: 36%; height: 24px; margin-top: 18px; }
@keyframes home-skeleton-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
