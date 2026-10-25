<template>
  <PageShell title="商品详情" dark footer>
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
    <template v-else-if="product">
      <swiper class="detail-hero" @change="slide = $event.detail.current">
        <swiper-item v-for="(src, index) in photos" :key="src">
          <image :src="src" mode="aspectFill" @click="previewImage(index)" />
          <view class="image-count">{{ index + 1 }} / {{ photos.length }}</view>
        </swiper-item>
      </swiper>
      <view class="detail-body">
        <text class="gold small">{{ product.series }}</text>
        <view class="between detail-price">
          <view>
            <text class="detail-product-title serif block">{{ product.name }}</text>
            <text class="muted">{{ product.description }}</text>
          </view>
          <PriceTag :value="selectedSku?.price ?? product.price" :original="product.originalPrice" large />
        </view>
        <button class="detail-coupon" @click="go('coupons')">
          <AppIcon name="coupon" :size="23" />
          <text class="strong">领券</text>
          <text v-if="highlightCoupon">{{ displayValue(highlightCoupon.description, '满200减15') }}</text>
          <AppIcon name="chevron" :size="15" />
        </button>
        <button class="link-row" @click="sheet = true">
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
        <view class="section-heading"><text class="section-title serif">商品详情</text></view>
        <view class="detail-story serif">
          <image v-if="hasProductImage" :src="productImage(product.image)" mode="aspectFill" />
          <text>
            传承酱香本味
            <br />
            酿造时间的厚度
          </text>
        </view>
        <view class="section-space">
          <view class="info-line">
            <text>商品名称</text>
            <text>{{ product.name }}</text>
          </view>
          <view class="info-line">
            <text>产品规格</text>
            <text>{{ product.spec }}</text>
          </view>
          <view class="info-line">
            <text>包装形式</text>
            <text>{{ product.category === '礼盒' ? '礼盒装' : '单瓶装' }}</text>
          </view>
          <text class="muted small block section-space">
            {{ isApiMode() ? '商品信息由服务端维护，以实际包装为准。' : '图片为设计示例，商品信息以实际包装为准。' }}
          </text>
        </view>
      </view>
      <view class="bottom-action">
        <button class="column center" @click="contact">
          <AppIcon name="headset" :size="25" />
          <text class="small muted">客服</text>
        </button>
        <button class="btn btn-outline" :disabled="currentStock <= 0" @click="addToCart">加入购物车</button>
        <button class="btn" :disabled="currentStock <= 0" @click="buy">{{ currentStock <= 0 ? '暂时缺货' : '立即购买' }}</button>
      </view>
    </template>
    <EmptyState v-else title="商品不存在或已下架" description="去商城看看其他好酒" button="返回商城" @action="go('shop')" />
    <view v-if="sheet && product" class="sheet-backdrop" @click="sheet = false">
      <view class="sheet" @click.stop>
        <view class="between">
          <text class="sheet-title">选择规格</text>
          <button class="icon-button" aria-label="关闭" @click="sheet = false">
            <AppIcon name="close" />
          </button>
        </view>
        <view class="order-product">
          <image class="order-photo" :src="productImage(product.image)" mode="aspectFill" />
          <view class="column">
            <text class="strong">{{ product.name }}</text>
            <text class="muted">{{ selectedSku?.skuName || product.spec }}</text>
            <PriceTag :value="selectedSku?.price ?? product.price" />
          </view>
        </view>
        <view v-if="skus.length" class="sku-options">
          <text class="strong block">商品规格</text>
          <view class="sku-option-list">
            <button v-for="sku in skus" :key="sku.skuCode" class="sku-option" :class="{ active: selectedSku?.skuCode === sku.skuCode }" :disabled="sku.stock <= 0" @click="selectSku(sku)">
              <text>{{ sku.skuName }}</text><text class="small">¥{{ (sku.price / 100).toFixed(2) }}</text>
            </button>
          </view>
        </view>
        <view class="between">
          <text>购买数量</text>
          <view class="stepper">
            <button aria-label="减少数量" :disabled="quantity <= 1" @click="quantity--">−</button>
            <text>{{ quantity }}</text>
            <button aria-label="增加数量" :disabled="quantity >= currentStock" @click="quantity++">
              +
            </button>
          </view>
        </view>
        <button class="btn" @click="sheet = false">确定</button>
      </view>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getProduct, loadProductCatalog, loadCouponCatalog, loadProductSkus, loadProductShipping, couponTemplates, products } from '../../services/catalog.js'
import { prepareCheckout, addCartItem } from '../../services/store.js'
import { acceptEntryInvitation } from '../../services/invitation.js'
import { productIdFromScene } from '../../services/product-scene.js'
import { go, contact, run, toast } from '../../services/navigation.js'
import { displayValue, isApiMode } from '../../services/config.js'
import { productImage } from '../../services/product-media.js'
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
    try {
      skus.value = await loadProductSkus(id.value)
    } catch (error) {
      skus.value = []
      throw new Error(error.message || '规格信息暂时无法获取，请重新加载')
    }
    selectedSku.value = skus.value.find(item => item.stock > 0) || null
    quantity.value = 1
  } catch (error) {
    loadError.value = error.message || '商品信息暂时无法获取，请稍后重试'
  } finally {
    loading.value = false
  }
  })().finally(() => { detailTask = null })
  return detailTask
}
const product = computed(() => getProduct(id.value)),
  currentStock = computed(() => selectedSku.value?.stock ?? product.value?.stock ?? 0),
  highlightCoupon = computed(() => couponReady.value ? couponTemplates.find((item) => !item.pointsOnly) || couponTemplates[0] : null),
  hasProductImage = computed(() => {
    const source = typeof product.value?.image === 'string' ? product.value.image.trim() : ''
    return Boolean(source) && !source.includes('product-placeholder')
  }),
  photos = computed(() => product.value ? [productImage(product.value.image)] : [])
function buy() {
  run(() => {
    if (skus.value.length && !selectedSku.value) throw new Error('请选择有库存的商品规格')
    if (quantity.value > currentStock.value) throw new Error('商品库存不足')
    prepareCheckout(id.value, quantity.value, selectedSku.value?.skuCode || '')
    go('checkout')
  })
}
async function addToCart() {
  try {
    if (skus.value.length && !selectedSku.value) throw new Error('请选择有库存的商品规格')
    if (quantity.value > currentStock.value) throw new Error('商品库存不足')
    await addCartItem(id.value, quantity.value, selectedSku.value?.skuCode || '')
    toast('已加入购物车')
  } catch (error) { toast(error.message) }
}
function selectSku(sku) { selectedSku.value = sku; quantity.value = Math.min(quantity.value, sku.stock) }
function previewImage(index) {
  uni.previewImage({ urls: photos.value, current: photos.value[index] })
}
</script>
<style scoped>
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
.sku-option.active { border-color: #a77b2d; color: #805d20; background: #faf5e8; }
.sku-option:disabled { opacity: .45; }
@media (max-width: 380px) {
  .product-loading-hero { height: 270px; }
  .product-loading-body { padding-right: 14px; padding-left: 14px; }
}
</style>
