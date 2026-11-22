<template>
  <PageShell title="商品详情" footer sticky-header page-class="product-page">
    <view v-if="loading" class="product-loading" aria-label="正在加载商品详情">
      <view class="product-loading-hero skeleton-block" />
      <view class="product-loading-body">
        <view class="skeleton-line skeleton-line--eyebrow" />
        <view class="skeleton-line skeleton-line--title" />
        <view class="skeleton-line skeleton-line--meta" />
        <view class="skeleton-strip" />
        <view class="skeleton-row"><view class="skeleton-line" /><view class="skeleton-line skeleton-line--short" /></view>
        <view class="skeleton-row"><view class="skeleton-line" /><view class="skeleton-line skeleton-line--short" /></view>
        <view class="skeleton-line skeleton-line--section" />
        <view class="skeleton-story skeleton-block" />
      </view>
    </view>
    <EmptyState
      v-else-if="loadError"
      title="商品暂时无法加载"
      :description="loadError"
      button="重新加载"
      @action="loadDetail"
    />
    <!-- Keep the gallery mounted during refresh so cached H5 pages can reactivate its resize sensors. -->
    <view v-if="product" v-show="!loading && !loadError" @touchstart="detailContent?.cancelParameterScroll()">
      <swiper id="product-overview" class="detail-hero" :current="slide" @change="slide = $event.detail.current">
        <swiper-item v-for="(src, index) in photos" :key="src">
          <image v-if="!coverErrors[src]" :src="src" mode="aspectFit" :aria-label="`${product.name}，第 ${index + 1} 张图片，点击放大`" @error="coverErrors[src] = true" @click="previewImage(index)" />
          <view v-else class="cover-error"><AppIcon name="info" :size="28" tone="muted" /><text>这张图片暂时未加载</text><button @click="retryCover(src)">重新加载</button></view>
          <view class="image-count">{{ index + 1 }} / {{ photos.length }}</view>
        </swiper-item>
      </swiper>
      <view class="product-gallery-nav">
        <view class="gallery-caption"><text>{{ galleryLoading ? '正在加载更多图片…' : `商品图片 · 共${photos.length}张` }}</text><text>{{ photos.length > 1 ? '左右滑动 · 点击图片放大' : '点击图片查看大图' }}</text></view>
        <scroll-view v-if="photos.length > 1" scroll-x class="gallery-thumbnails" :scroll-into-view="`product-thumb-${slide}`" scroll-with-animation>
          <view class="gallery-thumbnail-track">
            <button v-for="(src, index) in photos" :id="`product-thumb-${index}`" :key="src" class="gallery-thumbnail" :class="{ active: slide === index }" :aria-label="`查看第${index + 1}张图片`" :aria-pressed="slide === index" @click="slide = index"><image :src="src" mode="aspectFit" /></button>
          </view>
        </scroll-view>
      </view>
      <button v-if="galleryError" class="gallery-retry" :disabled="galleryLoading" @click="loadPhotos">
        {{ galleryLoading ? '正在加载图片…' : '更多图片加载失败，点击重试' }}
      </button>
      <view class="detail-body">
        <view class="product-summary-row">
          <PriceTag :value="selectedSku?.price ?? product.price" :original="product.originalPrice" large />
          <button class="share-product" @click="openProductShare"><AppIcon name="share" :size="17" tone="brand" /><text>分享得返利</text></button>
        </view>
        <text class="detail-product-title block">{{ product.name }}</text>
        <text class="muted">{{ selectedSku?.skuName || product.spec }}</text>
        <ProductReferral actions @rules="promotionRulesOpen = true" @share="openProductShare" @earnings="go('promotion')" />
        <button v-if="product.id === 'XS-xiong'" class="link-row" aria-label="查看雄酒开瓶见礼活动规则" @click="drawRulesOpen = true">
          <text>开瓶见礼</text>
          <view class="row muted"><text>雄酒专属 · 活动规则</text><AppIcon name="chevron" :size="16" /></view>
        </button>
        <button class="detail-coupon" @click="go('coupons')">
          <AppIcon name="coupon" :size="23" />
          <text class="strong">领券</text>
          <text v-if="highlightCoupon">{{ displayValue(highlightCoupon.description, '满200减15') }}</text>
          <AppIcon name="chevron" :size="15" />
        </button>
        <button class="link-row product-spec-row" @click="sheet = true">
          <text>规格</text>
          <view class="row muted">
            <text>{{ selectedSku?.skuName || product.spec }} · {{ quantity }}件</text>
            <AppIcon name="chevron" :size="16" />
          </view>
        </button>
        <button class="link-row" @click="go('rules', { type: 'shipping' })">
          <text>配送</text>
          <view class="row muted">
            <text>{{ shippingLabel }}</text>
            <AppIcon name="chevron" :size="16" />
          </view>
        </button>
      </view>
      <view class="detail-anchor-tabs" :style="{ top: headerHeight + 'px' }">
        <button v-for="tab in detailTabs" :key="tab.id" :class="{ active: detailTab === tab.id }" @click="jumpTo(tab.id)">{{ tab.id === 'product-parameters' && parameterLocating ? '正在定位…' : tab.label }}</button>
      </view>
      <view id="product-story">
        <ProductDetails ref="detailContent" :product="product" :photos="photos" :editorial="galleryDetail" :stock="currentStock" :shipping-label="shippingLabel" :gallery-error="galleryError" :gallery-loading="galleryLoading" @retry-gallery="loadPhotos" @parameter-location-change="parameterLocating = $event" />
      </view>
      <view class="bottom-action">
        <button class="purchase-shortcut" @click="contact">
          <AppIcon name="headset" :size="25" />
          <text class="small muted">客服</text>
        </button>
        <button class="purchase-shortcut" aria-label="购物车" @click="go('cart')"><AppIcon name="cart" :size="23" /><text class="small muted">购物车</text></button>
        <button class="btn btn-outline" :disabled="adding || (!needsSku && currentStock <= 0)" :aria-busy="adding" @click="addToCart">{{ adding ? '加入中…' : '加入购物车' }}</button>
        <button class="btn" :disabled="adding || (!needsSku && currentStock <= 0)" @click="buy">{{ needsSku ? '选择规格' : currentStock <= 0 ? '暂时缺货' : '立即购买' }}</button>
      </view>
    </view>
    <EmptyState v-else-if="!loading && !loadError" title="商品不存在或已下架" description="去商城看看其他好酒" button="返回商城" @action="go('shop')" />
    <view v-if="sheet && product" class="sheet-backdrop" @click="sheet = false" @touchmove.stop.prevent>
      <view class="sheet product-sku-sheet" role="dialog" aria-modal="true" aria-label="选择商品规格与数量" @click.stop @touchmove.stop>
        <view class="between sku-sheet-header">
          <text class="sheet-title">选择规格</text>
          <button class="icon-button" aria-label="关闭" @click="sheet = false">
            <AppIcon name="close" />
          </button>
        </view>
        <scroll-view scroll-y class="sku-sheet-scroll" :style="{ height: skus.length ? '42vh' : '170px' }">
        <view class="order-product">
          <image class="order-photo" :src="productImage(product.image)" mode="aspectFit" />
          <view class="column sku-product-copy">
            <text class="strong">{{ product.name }}</text>
            <text class="muted">{{ selectedSku?.skuName || product.spec }}</text>
            <PriceTag :value="selectedSku?.price ?? product.price" />
            <text class="sku-stock">{{ needsSku ? '请选择下方规格' : currentStock > 0 ? `库存 ${currentStock} 件` : '当前规格暂时缺货' }}</text>
          </view>
        </view>
        <view v-if="skus.length" class="sku-options">
          <text class="strong block">商品规格</text>
          <view class="sku-option-list">
            <button v-for="sku in skus" :key="sku.skuCode" class="sku-option" :class="{ active: selectedSku?.skuCode === sku.skuCode }" :disabled="sku.stock <= 0" @click="selectSku(sku)">
              <text>{{ sku.skuName }}</text><text class="small">¥{{ (sku.price / 100).toFixed(2) }} · {{ sku.stock > 0 ? `库存 ${sku.stock} 件` : '暂时缺货' }}</text>
            </button>
          </view>
        </view>
        </scroll-view>
        <view class="sku-sheet-footer">
        <view class="between">
          <text>购买数量</text>
          <view class="stepper">
            <button aria-label="减少数量" :disabled="quantity <= 1" @click="quantity--">−</button>
            <text>{{ quantity }}</text>
            <button aria-label="增加数量" :disabled="needsSku || quantity >= currentStock" @click="quantity++">
              +
            </button>
          </view>
        </view>
        <button class="btn" :disabled="needsSku || currentStock <= 0" @click="sheet = false">{{ needsSku ? '请选择规格' : currentStock <= 0 ? '暂时缺货' : '确定' }}</button>
        </view>
      </view>
    </view>
    <view v-if="shareOpen && product" class="sheet-backdrop" @click="closeProductShare" @touchmove.stop.prevent>
      <view class="sheet product-share-sheet" role="dialog" aria-modal="true" aria-label="分享得返利" @click.stop @touchmove.stop>
        <view class="between"><text class="sheet-title">分享得返利</text><button class="icon-button" aria-label="关闭分享" @click="closeProductShare"><AppIcon name="close" /></button></view>
        <view class="share-item"><image :src="productImage(product.image)" mode="aspectFit" /><view class="column"><text class="strong">{{ product.name }}</text><text class="small muted">好友通过专属入口购买，有效订单计入推荐奖励</text></view></view>
        <text class="share-status" :class="{ 'share-status-error': shareError }">{{ shareLoading ? '正在准备专属分享链接…' : shareError || '专属分享链接已就绪' }}</text>
        <button v-if="shareError" class="text-button share-retry" @click="prepareProductShare">重新获取分享链接</button>
        <!-- #ifdef MP-WEIXIN -->
        <button class="btn share-friend" open-type="share" :disabled="!canShareProduct"><AppIcon name="wechat" tone="light" :size="20" />分享给好友</button>
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <button class="btn share-friend" :disabled="!canShareProduct" @click="copyProductShare"><AppIcon name="share" tone="light" :size="20" />复制专属链接</button>
        <!-- #endif -->
        <view class="share-secondary"><button @click="openProductPoster"><AppIcon name="qr" :size="23" /><text>生成海报</text></button><button @click="openEarnings"><AppIcon name="wallet" :size="23" /><text>我的佣金</text></button></view>
        <button class="share-rule-entry" @click="showShareRules">查看返利与提现规则 <AppIcon name="chevron" :size="12" /></button>
      </view>
    </view>
    <ActivityRules v-model="promotionRulesOpen" type="promotion" />
    <ActivityRules v-if="product?.id === 'XS-xiong'" v-model="drawRulesOpen" type="draw" />
  </PageShell>
</template>
<script setup>
import { ref, computed, watch, getCurrentInstance } from 'vue'
import { onLoad, onShow, onUnload, onHide, onShareAppMessage } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import ActivityRules from '../../components/ActivityRules.vue'
import ProductDetails from '../../components/ProductDetails.vue'
import ProductReferral from '../../components/ProductReferral.vue'
import { getProduct, loadProductCatalog, loadCouponCatalog, loadProductSkus, loadProductShipping, couponTemplates, products } from '../../services/catalog.js'
import { prepareCheckout, addCartItem, createPromotionCode } from '../../services/store.js'
import { acceptEntryInvitation } from '../../services/invitation.js'
import { productIdFromScene } from '../../services/product-scene.js'
import { go, contact, run, toast } from '../../services/navigation.js'
import { displayValue, isApiMode } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
import { loadProductPresentation, productPhotos } from '../../services/product-gallery.js'
const promotionRulesOpen = ref(false)
const drawRulesOpen = ref(false)
const adding = ref(false)
const selectionReady = ref(false)
const coverErrors = ref({})
function retryCover(src) { delete coverErrors.value[src] }
const detailTab = ref('product-overview')
const detailContent = ref(null)
const parameterLocating = ref(false)
const pageInstance = getCurrentInstance()
onHide(() => detailContent.value?.cancelParameterScroll())
const detailTabs = [{ id: 'product-overview', label: '商品' }, { id: 'product-story', label: '详情' }, { id: 'product-parameters', label: '参数' }]
let headerHeight = 74
// #ifdef MP-WEIXIN
if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
  const systemInfo = uni.getSystemInfoSync()
  const menuBounds = uni.getMenuButtonBoundingClientRect()
  headerHeight = (systemInfo.statusBarHeight || 20) + (menuBounds.top - (systemInfo.statusBarHeight || 20)) * 2 + menuBounds.height
}
// #endif
function jumpTo(target) {
  detailTab.value = target
  if (target !== 'product-parameters') detailContent.value?.cancelParameterScroll()
  if (target === 'product-overview') {
    uni.pageScrollTo({ scrollTop: 0, duration: 250 })
    return
  }
  if (target === 'product-parameters') {
    detailContent.value?.scrollToParameters(headerHeight + 46)
    return
  }
  uni.createSelectorQuery().in(pageInstance.proxy).select('#' + target).boundingClientRect().selectViewport().scrollOffset().exec(result => {
    if (!result[0] || !result[1]) return
    uni.pageScrollTo({ scrollTop: Math.max(0, result[0].top + result[1].scrollTop - headerHeight - 46), duration: 250 })
  })
}
const id = ref(isApiMode() ? '' : 'classic'),
  sceneProductId = ref(''),
  loading = ref(true),
  loadError = ref(''),
  quantity = ref(1),
  skus = ref([]),
  selectedSku = ref(null),
  couponReady = ref(!isApiMode()),
  sheet = ref(false),
  slide = ref(0)
let detailTask
const galleryPhotos = ref([])
const galleryDetail = ref(null)
const galleryError = ref(false)
const galleryLoading = ref(false)
let galleryRevision = 0
watch(id, () => {
  galleryRevision++
  galleryPhotos.value = []
  galleryDetail.value = null
  galleryError.value = false
  galleryLoading.value = false
  slide.value = 0
  selectedSku.value = null
  quantity.value = 1
  selectionReady.value = false
  coverErrors.value = {}
}, { flush: 'sync' })
onUnload(() => { galleryRevision++ })
async function loadPhotos() {
  const code = id.value
  const currentPhoto = photos.value[slide.value]
  const revision = ++galleryRevision
  galleryLoading.value = true
  try {
    const result = await loadProductPresentation(code)
    if (revision !== galleryRevision || code !== id.value) return
    galleryPhotos.value = result.photos
    galleryDetail.value = result.detail
    galleryError.value = false
    slide.value = Math.max(0, photos.value.indexOf(currentPhoto))
  } catch {
    if (revision === galleryRevision && code === id.value) galleryError.value = true
  } finally {
    if (revision === galleryRevision) galleryLoading.value = false
  }
}
const shippingQuote = ref(null)
const shippingError = ref(false)
const shippingLabel = computed(() => !isApiMode() ? '平台统一发货'
  : shippingError.value ? '运费暂未获取'
  : shippingQuote.value ? (shippingQuote.value.shipping === 0 ? '免运费' : `运费 ¥${(shippingQuote.value.shipping / 100).toFixed(2)}`)
  : '运费计算中')
let shippingRevision = 0
watch(() => [id.value, quantity.value, selectedSku.value?.skuCode, loading.value], async () => {
  const revision = ++shippingRevision
  shippingQuote.value = null
  shippingError.value = false
  if (!isApiMode() || !id.value || loading.value) return
  try {
    const result = await loadProductShipping(id.value, quantity.value, selectedSku.value?.skuCode || '')
    if (revision === shippingRevision) shippingQuote.value = result
  } catch { if (revision === shippingRevision) shippingError.value = true }
}, { immediate: true })
onLoad((q) => {
  sceneProductId.value = productIdFromScene(q.scene)
  id.value = q.id || sceneProductId.value || (isApiMode() ? '' : 'classic')
  acceptEntryInvitation({ path: 'pages/product/index', query: q }).catch(() => toast('推广关系暂未确认，将在下次操作时重试'))
  if (id.value) loadDetail()
  else loading.value = false
})
onShow(() => {
  if (id.value) loadDetail()
})
async function loadDetail() {
  if (detailTask) return detailTask
  detailTask = (async () => {
  loading.value = true
  loadError.value = ''
  try {
    couponReady.value = !isApiMode()
    if (isApiMode()) loadCouponCatalog().then(() => { couponReady.value = true }).catch(() => {})
    await loadProductCatalog()
    if (sceneProductId.value) {
      const sceneProduct = products.find(item => String(item.sceneId) === sceneProductId.value)
      if (!sceneProduct) {
        loadError.value = '商品可能已下架或暂未发布'
        return
      }
      id.value = String(sceneProduct.id)
      sceneProductId.value = ''
    }
    if (!getProduct(id.value)) {
      loadError.value = '商品可能已下架或暂未发布'
      return
    }
    // Optional photos must not delay or break product, stock and purchase controls.
    loadPhotos()
    try {
      skus.value = await loadProductSkus(id.value)
    } catch (error) {
      skus.value = []
      throw new Error(error.message || '规格信息暂时无法获取，请重新加载')
    }
    const previousCode = selectedSku.value?.skuCode
    selectedSku.value = selectionReady.value
      ? skus.value.find(item => item.skuCode === previousCode) || null
      : skus.value.find(item => item.stock > 0) || skus.value[0] || null
    // Keep the customer's choice when returning, while applying refreshed stock.
    const available = currentStock.value
    if (available > 0 && quantity.value > available) {
      quantity.value = available
      toast(`库存已更新，购买数量调整为 ${available} 件`)
    }
    selectionReady.value = true
  } catch (error) {
    loadError.value = error.message || '商品信息暂时无法获取，请稍后重试'
  } finally {
    loading.value = false
  }
  })().finally(() => { detailTask = null })
  return detailTask
}
const product = computed(() => getProduct(id.value)),
  needsSku = computed(() => skus.value.length > 0 && !selectedSku.value),
  currentStock = computed(() => selectedSku.value?.stock ?? (skus.value.length ? 0 : product.value?.stock) ?? 0),
  highlightCoupon = computed(() => couponReady.value ? couponTemplates.find((item) => !item.pointsOnly) || couponTemplates[0] : null),
  photos = computed(() => productPhotos(product.value, galleryPhotos.value))
const shareOpen = ref(false), shareLoading = ref(false), shareError = ref(''), shareCode = ref('')
let shareRevision = 0
const canShareProduct = computed(() => Boolean(product.value && !loading.value && !loadError.value && !shareLoading.value && !shareError.value && shareCode.value))
const productSharePath = computed(() => canShareProduct.value
  ? `/pages/product/index?id=${encodeURIComponent(product.value.id)}&inviteCode=${encodeURIComponent(shareCode.value)}`
  : '/pages/shop/index')
function syncProductShareMenu() {
  // #ifdef MP-WEIXIN
  if (canShareProduct.value) uni.showShareMenu?.({ menus: ['shareAppMessage'] })
  else uni.hideShareMenu?.({ menus: ['shareAppMessage'] })
  // #endif
}
watch(canShareProduct, syncProductShareMenu, { immediate: true })
onShow(syncProductShareMenu)
function resetProductShare() {
  shareRevision++
  shareOpen.value = false
  shareLoading.value = false
  shareCode.value = ''
  shareError.value = ''
}
watch(id, resetProductShare, { flush: 'sync' })
onUnload(resetProductShare)
async function prepareProductShare() {
  if (!product.value || shareLoading.value) return
  const productCode = String(product.value.id), revision = ++shareRevision
  shareLoading.value = true
  shareError.value = ''
  shareCode.value = ''
  try {
    const result = await createPromotionCode(productCode)
    if (revision !== shareRevision || productCode !== String(product.value?.id)) return
    const code = typeof result?.code === 'string' ? result.code.trim() : ''
    if (!/^[A-Za-z0-9_-]{3,128}$/.test(code)) throw new Error('专属分享身份尚未就绪，请重试')
    shareCode.value = code
  } catch (error) {
    if (revision === shareRevision) shareError.value = error.message || '分享链接暂未获取，请重试'
  } finally { if (revision === shareRevision) shareLoading.value = false }
}
function openProductShare() { shareOpen.value = true; return prepareProductShare() }
function closeProductShare() {
  shareOpen.value = false
  // A late login response must not re-enable a cancelled share request.
  if (shareLoading.value) { shareRevision++; shareLoading.value = false; shareCode.value = '' }
}
function openProductPoster() { closeProductShare(); go('poster', { id: product.value.id }) }
function openEarnings() { closeProductShare(); go('promotion') }
function showShareRules() { closeProductShare(); promotionRulesOpen.value = true }
onShareAppMessage(() => ({
  title: canShareProduct.value ? `雄森酒业 · ${product.value.name}` : '雄森酒业 · 精选好酒',
  path: productSharePath.value,
  ...(canShareProduct.value ? { imageUrl: productImage(product.value.image) } : {}),
}))
function copyProductShare() {
  // #ifdef H5
  if (!canShareProduct.value) return
  uni.setClipboardData({ data: `${window.location.origin}${window.location.pathname}#${productSharePath.value}`,
    success: () => toast('专属链接已复制'), fail: () => toast('复制未完成，请重试') })
  // #endif
}
function buy() {
  if (adding.value) return
  if (needsSku.value) { sheet.value = true; return }
  run(() => {
    if (skus.value.length && !selectedSku.value) throw new Error('请选择有库存的商品规格')
    if (quantity.value > currentStock.value) throw new Error('商品库存不足')
    prepareCheckout(id.value, quantity.value, selectedSku.value?.skuCode || '')
    go('checkout')
  })
}
async function addToCart() {
  if (adding.value) return
  if (needsSku.value) { sheet.value = true; return }
  adding.value = true
  try {
    if (skus.value.length && !selectedSku.value) throw new Error('请选择有库存的商品规格')
    if (quantity.value > currentStock.value) throw new Error('商品库存不足')
    await addCartItem(id.value, quantity.value, selectedSku.value?.skuCode || '')
    toast('已加入购物车')
  } catch (error) { toast(error.message) }
  finally { adding.value = false }
}
function selectSku(sku) { if (sku.stock <= 0) return; selectedSku.value = sku; quantity.value = Math.max(1, Math.min(quantity.value, sku.stock)) }
function previewImage(index) {
  uni.previewImage({ urls: photos.value, current: photos.value[index] })
}
</script>
<style scoped>
.product-share-sheet { max-height: 85vh; overflow-y: auto; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.share-item { display: flex; align-items: center; gap: 14px; margin-top: 20px; }
.share-item image { width: 64px; height: 72px; flex-shrink: 0; border-radius: 6px; background: #f4eee7; }
.share-item .column { gap: 7px; min-width: 0; line-height: 1.6; }
.share-status { display: block; margin: 18px 0 10px; font-size: 12px; line-height: 1.7; color: #817168; }
.share-status-error { color: #8c3543; }
.share-retry { margin-bottom: 12px; min-height: 44px; }
.share-friend { display: flex; align-items: center; justify-content: center; gap: 8px; }
.share-secondary { display: flex; margin-top: 18px; border-bottom: 1px solid #e8ddd2; padding-bottom: 16px; }
.share-secondary button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 44px; font-size: 13px; }
.share-rule-entry { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 44px; margin-top: 8px; color: #886344; font-size: 12px; }
.cover-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; height: 100%; color: #85817e; font-size: 13px; }
.cover-error button { color: #782d3b; padding: 10px 20px; border: 1px solid #cfb5ab; border-radius: 8px; font-size: 13px; }
.page-shell .product-sku-sheet { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.sku-sheet-header { padding: 16px 20px 6px; flex-shrink: 0; }
.sku-sheet-scroll { min-height: 0; max-height: 48vh; flex-shrink: 1; }
.sku-sheet-scroll .order-product { margin: 0 20px; }
.sku-product-copy { flex: 1; min-width: 0; gap: 6px; overflow-wrap: break-word; }
.sku-stock { color: #85817e; font-size: 12px; }
.sku-sheet-footer { padding: 16px 20px calc(20px + env(safe-area-inset-bottom)); border-top: 1px solid #e9e5e1; flex-shrink: 0; }
.page-shell .sku-sheet-footer .btn { margin-top: 16px; }
.sku-sheet-scroll .sku-options { margin: 0 20px 18px; }
.sku-sheet-scroll .sku-option { max-width: 100%; overflow-wrap: break-word; line-height: 1.6; }
.product-gallery-nav { padding: 12px 16px 16px; background: #f1efeb; }
.gallery-caption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; color: #69635d; font-size: 11px; line-height: 1.6; }
.gallery-caption > text:first-child { font-weight: 600; color: #514c48; }
.gallery-thumbnails { width: 100%; margin-top: 10px; white-space: nowrap; }
.gallery-thumbnail-track { display: inline-flex; gap: 8px; padding: 2px; }
.gallery-thumbnail { display: block; flex-shrink: 0; width: 62px; height: 54px; padding: 2px; border: 1px solid #d9d4ca; border-radius: 6px; background: #faf9f6; overflow: hidden; }
.gallery-thumbnail.active { border: 2px solid #782d3b; padding: 1px; }
.gallery-thumbnail image { width: 100%; height: 100%; }
.gallery-thumbnail::after { border: none; }
.share-product { display: flex; align-items: center; flex-shrink: 0; gap: 5px; min-height: 44px; padding: 0 12px; color: #782d3b; border: 1px solid #cfb5ab; border-radius: 22px; font-size: 12px; line-height: 20px; }
.share-product::after { border: none; }
.product-spec-row { display: flex; gap: 18px; }
.product-spec-row > text { flex: 0 0 34px; white-space: nowrap; }
.product-spec-row > .row { flex: 1; min-width: 0; justify-content: flex-end; }
.product-spec-row > .row > text { min-width: 0; text-align: right; line-height: 1.6; }
.gallery-retry { padding: 10px 16px; color: #805d20; background: #faf5e8; font-size: 13px; line-height: 1.5; border-radius: 0; }
.product-loading { min-height: calc(100vh - 102px); background: #fbfaf6; }
.product-loading-hero { width: 100%; height: 300px; }
.product-loading-body { padding: 20px 16px 96px; }
.skeleton-block, .skeleton-line, .skeleton-strip { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: product-skeleton-shimmer 1.4s ease-in-out infinite; }
.skeleton-line { width: 42%; height: 13px; border-radius: 7px; }
.skeleton-line--eyebrow { width: 25%; height: 11px; }
.skeleton-line--title { width: 62%; height: 28px; margin-top: 15px; border-radius: 6px; }
.skeleton-line--meta { width: 38%; margin-top: 10px; }
.skeleton-strip { width: 100%; height: 48px; margin: 24px 0 8px; border-radius: 6px; }
.skeleton-row { display: flex; align-items: center; justify-content: space-between; min-height: 58px; border-bottom: 1px solid #eeeae1; }
.skeleton-line--short { width: 28%; }
.skeleton-line--section { width: 30%; height: 19px; margin-top: 24px; }
.skeleton-story { width: 100%; height: 150px; margin-top: 14px; border-radius: 4px; }
@keyframes product-skeleton-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.bottom-action { gap: 8px; }
.bottom-action .btn { min-width: 0; padding-left: 10px; padding-right: 10px; font-size: 13px; }
.sku-options { margin: 18px 0; }
.sku-option-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.sku-option { display: flex; flex-direction: column; gap: 4px; min-width: 108px; padding: 9px 12px; border: 1px solid #d9d4ca; background: #fff; text-align: left; }
.sku-option.active { border-color: #782d3b; color: #782d3b; background: #f3e9eb; }
.sku-option:disabled { opacity: .45; }
@media (max-width: 380px) {
  .product-loading-hero { height: 270px; }
  .product-loading-body { padding-right: 14px; padding-left: 14px; }
}
</style>
