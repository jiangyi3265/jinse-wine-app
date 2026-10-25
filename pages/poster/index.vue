<template>
  <PageShell title="推广海报">
    <view class="poster-intro">
      <text class="poster-eyebrow">精选好酒 · 专属推荐</text>
      <text class="poster-heading">把好酒，推荐给好友</text>
      <text class="poster-intro-note">选一款心仪好酒，生成你的专属海报</text>
    </view>
    <view v-if="loading" class="poster-loading" aria-label="正在加载推广商品">
      <view class="poster-loading-head" />
      <view class="poster-loading-image" />
      <view class="poster-loading-foot" />
    </view>
    <template v-else-if="featured && !loadError">
    <picker :range="products" range-key="name" :value="selectedIndex" :disabled="saving" @change="selectProduct">
      <view class="poster-selector">
        <view class="poster-selector-copy"><text class="poster-selector-label">推广商品</text><text class="poster-selector-name">{{ featured.name }}</text></view>
        <text class="poster-selector-action">更换商品 ›</text>
      </view>
    </picker>
    <view class="poster-card">
      <view class="poster-photo">
        <view class="poster-copy">
          <view class="poster-brand-row">
            <text class="vip-brand">金色酒业</text>
            <text class="poster-brand-caption">甄选佳酿</text>
          </view>
          <text class="poster-copy-label">GOLDEN CELLAR · 精选系列</text>
          <text class="poster-product-name">{{ featured.name }}</text>
          <view class="poster-product-meta">
            <text class="poster-spec">{{ featured.spec }}</text>
            <view class="poster-prices">
              <view class="poster-price"><text>¥</text><text>{{ money(featured.price) }}</text></view>
              <text v-if="Number(featured.originalPrice) > Number(featured.price)" class="poster-original-price">¥{{ money(featured.originalPrice) }}</text>
            </view>
          </view>
        </view>
        <view class="poster-image-wrap">
          <image
            :src="productMedia(featured.image)"
            mode="aspectFit"
            aria-label="推广商品图片"
          />
        </view>
      </view>
      <view class="poster-bottom">
        <view class="grow column poster-recommender">
          <text class="poster-recommender-name serif">{{ state.user.name || '酒友' }}的精选推荐</text>
          <text class="muted small">{{ isApiMode() && !promotionCode && promotionInviteCode ? `邀请码：${promotionInviteCode}` : '长按识别，进入金色酒业' }}</text>
        </view>
        <QrCode :src="promotionCode" />
      </view>
      <text class="poster-price-note">展示价格仅供参考，以商品页及结算为准</text>
    </view>
    <view class="poster-status" :class="{ 'needs-attention': isApiMode() && (!promotionCode || !promotionInviteCode) }">
      <view class="poster-status-copy">
        <text class="poster-status-title">{{ statusTitle }}</text>
        <text class="poster-status-note">{{ statusNote }}</text>
      </view>
      <button v-if="isApiMode() && (!promotionCode || !promotionInviteCode)" class="poster-retry" :disabled="saving || codeLoading" @click="loadPoster">重新获取</button>
    </view>
    </template>
    <EmptyState
      v-else-if="!loading"
      :title="loadError ? '推广资料暂时无法加载' : '暂无可推广商品'"
      :description="loadError || '上架商品后，即可在这里生成专属海报'"
      :button="loadError ? '重新加载' : '查看商城'"
      @action="loadError ? loadPoster() : go('shop')"
    />
    <view v-if="!loading && featured && !loadError" class="section poster-actions">
      <button class="btn btn-outline" :disabled="!canSave" @click="savePoster">
        {{ saving ? '生成中…' : '保存海报' }}
      </button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="btn" :disabled="!canShare || saving" open-type="share">分享给好友</button>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <button class="btn" :disabled="!canShare || saving" @click="shareLink">复制推广链接</button>
      <!-- #endif -->
    </view>
    <canvas
      canvas-id="posterCanvas"
      id="posterCanvas"
      style="position: fixed; left: -2000px; top: 0; width: 390px; height: 660px"
    />
  </PageShell>
</template>
<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import { onLoad, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import QrCode from '../../components/QrCode.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, createPromotionCode } from '../../services/store.js'
import { products, loadProductCatalog } from '../../services/catalog.js'
import { go, toast } from '../../services/navigation.js'
import { isApiMode, assetUrl, mediaUrl } from '../../services/config.js'
import { productImage as productMedia } from '../../services/product-media.js'
import { money } from '../../services/pricing.js'
import { drawPromotionPoster } from '../../services/poster.js'
const saving = ref(false),
  loading = ref(true),
  loadError = ref(''),
  codeError = ref(''),
  codeLoading = ref(false),
  selectedId = ref(''),
  promotionCode = ref(''),
  promotionInviteCode = ref(''),
  instance = getCurrentInstance()
const selectedIndex = computed(() => Math.max(0, products.findIndex(p => String(p.id) === selectedId.value)))
const featured = computed(() => products[selectedIndex.value])
const canShare = computed(() => !loading.value && !loadError.value && !!featured.value && (!isApiMode() || !!promotionInviteCode.value))
const canSave = computed(() => canShare.value && !saving.value && !codeLoading.value && (!isApiMode() || !!promotionCode.value))
const statusTitle = computed(() => !isApiMode() ? '演示海报' : codeLoading.value ? '正在生成当前商品海报码' : promotionCode.value && promotionInviteCode.value ? '专属推广已就绪' : promotionInviteCode.value ? '可分享链接，海报码待生成' : '推广资料待获取')
const statusNote = computed(() => !isApiMode() ? '仅用于预览，二维码不用于真实推广。' : codeError.value || (!promotionInviteCode.value ? '请重新获取专属邀请码后再分享，以便记录推广关系。' : promotionCode.value ? '海报码直达当前商品；分享链接也携带你的邀请身份。' : '可先分享商品链接；海报码生成后，即可保存到相册。'))
onLoad((q) => { selectedId.value = String(q?.id || '') })
let loadTask
let codeVersion = 0
function loadPoster() {
  if (saving.value) return
  if (loadTask) return loadTask
  loadTask = loadPosterData().finally(() => { loadTask = null })
  return loadTask
}
async function loadPosterData() {
  loading.value = true
  loadError.value = ''
  codeError.value = ''
  codeVersion++
  codeLoading.value = false
  promotionCode.value = ''
  promotionInviteCode.value = ''
  // #ifdef MP-WEIXIN
  uni.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
  // #endif
  try {
    await loadProductCatalog()
    if (!featured.value) return
    selectedId.value = String(featured.value.id)
    if (!isApiMode()) return
    await loadProductCode()
  } catch (error) { loadError.value = error.message || '商品资料暂时无法获取，请稍后重试' }
  finally {
    loading.value = false
    // #ifdef MP-WEIXIN
    if (canShare.value) uni.showShareMenu({ menus: ['shareAppMessage'] })
    // #endif
  }
}
onShow(loadPoster)
async function loadProductCode() {
  const productId = featured.value?.id
  if (!isApiMode() || !productId) return
  const version = ++codeVersion
  codeLoading.value = true
  codeError.value = ''
  promotionCode.value = ''
  try {
    const result = await createPromotionCode(productId)
    if (version !== codeVersion || String(featured.value?.id) !== String(productId)) return
    promotionCode.value = mediaUrl(result?.qrCode || result?.image || result?.url || '')
    promotionInviteCode.value = result?.code || promotionInviteCode.value
  } catch (error) {
    if (version === codeVersion) codeError.value = error.message || '当前商品海报码暂时无法获取，请重试'
  } finally {
    if (version === codeVersion) codeLoading.value = false
  }
}
function selectProduct(event) {
  if (saving.value || loading.value) return
  const product = products[Number(event.detail.value)]
  if (product && String(product.id) !== selectedId.value) {
    selectedId.value = String(product.id)
    return loadProductCode()
  }
}
const sharePath = computed(() => featured.value
  ? `/pages/product/index?id=${encodeURIComponent(featured.value.id)}${promotionInviteCode.value ? `&inviteCode=${encodeURIComponent(promotionInviteCode.value)}` : ''}`
  : '/pages/shop/index')
onShareAppMessage(() => ({
  title: `金色酒业 · ${featured.value?.name || '精选好酒'}`,
  path: canShare.value ? sharePath.value : '/pages/shop/index',
}))
function shareLink() {
  // #ifdef H5
  if (!canShare.value || saving.value) return toast('推广资料尚未就绪，请稍后重试')
  uni.setClipboardData({
    data: `${window.location.origin}${window.location.pathname}#${sharePath.value}`,
    success: () => toast('推广链接已复制，可粘贴分享'),
    fail: () => toast('复制未完成，请重试'),
  })
  // #endif
}
async function savePoster() {
  if (!canSave.value) return
  saving.value = true
  try {
    const product = { ...featured.value }
    const userName = state.user.name
    const [productImage, qrImage] = await Promise.all([
      resolveCanvasImage(productMedia(product.image)),
      resolveCanvasImage(promotionCode.value || assetUrl('/static/design/qr-demo.png', 'brand.qr')),
    ])
    const ctx = uni.createCanvasContext('posterCanvas', instance.proxy)
    drawPromotionPoster(ctx, { product, userName, productImage, qrImage, demo: !isApiMode() })
    await new Promise((resolve) => ctx.draw(false, resolve))
    const image = await uni.canvasToTempFilePath(
      {
        canvasId: 'posterCanvas',
        width: 390,
        height: 660,
        destWidth: 780,
        destHeight: 1320,
        fileType: 'png',
      },
      instance.proxy,
    )
    // #ifdef H5
    const link = document.createElement('a')
    link.href = image.tempFilePath
    link.download = '金色酒业-推广海报.png'
    link.click()
    toast('海报已生成')
    // #endif
    // #ifdef MP-WEIXIN
    await uni.saveImageToPhotosAlbum({ filePath: image.tempFilePath })
    toast('海报已保存到相册')
    // #endif
  } catch (e) {
    toast(e.message || (e.errMsg?.includes('auth') ? '请在微信设置中允许保存到相册后重试' : '海报保存未完成，请检查网络或相册权限后重试'))
  } finally {
    saving.value = false
  }
}

function resolveCanvasImage(src) {
  if (!src) return Promise.reject(new Error('海报图片尚未配置'))
  return new Promise((resolve, reject) => {
    uni.getImageInfo({ src, success: (result) => {
      if (!result.width || !result.height) return reject(new Error('海报图片尺寸无效，请重新获取'))
      resolve(result)
    }, fail: () => reject(new Error('海报图片加载失败，请检查网络后重试')) })
  })
}
</script>

<style scoped>
.poster-intro { padding: 18px 20px 20px; }
.poster-eyebrow { display: block; color: #977348; font-size: 11px; letter-spacing: 2px; }
.poster-heading { display: block; margin-top: 8px; color: #213c30; font-size: 24px; font-weight: 650; }
.poster-intro-note { display: block; margin-top: 7px; color: #7b8077; font-size: 12px; }
.poster-selector { display: flex; align-items: center; gap: 12px; margin: 0 18px 14px; padding: 13px 14px; border: 1px solid #e1e5dd; border-radius: 8px; background: #fff; }
.poster-selector-copy { flex: 1; min-width: 0; }
.poster-selector-label { display: block; color: #848b81; font-size: 10px; }
.poster-selector-name { display: block; overflow: hidden; margin-top: 5px; color: #243e32; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.poster-selector-action { flex-shrink: 0; color: #947243; font-size: 12px; }
.poster-recommender { min-width: 0; }
.poster-recommender-name { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 18px; line-height: 1.5; overflow-wrap: anywhere; }
.poster-recommender .small { margin-top: 6px; overflow-wrap: anywhere; }
.poster-bottom :deep(.qr-block) { flex-shrink: 0; }
.poster-price-note { display: block; padding: 0 16px 14px; color: #8a857a; font-size: 10px; }
.poster-status { display: flex; align-items: center; gap: 10px; margin: 0 18px; padding: 13px 14px; border-radius: 8px; background: #eaf0e9; }
.poster-status.needs-attention { background: #f4eddf; }
.poster-status-copy { flex: 1; min-width: 0; }
.poster-status-title { display: block; color: #365542; font-size: 12px; font-weight: 600; }
.poster-status-note { display: block; margin-top: 4px; color: #72806f; font-size: 11px; line-height: 1.65; }
.poster-retry { flex-shrink: 0; margin: 0; padding: 0 9px; border: 1px solid #cbbc9e; border-radius: 5px; color: #806536; background: transparent; font-size: 11px; line-height: 30px; }
.poster-retry::after { border: 0; }
.poster-actions { padding-bottom: 22px; }
.poster-loading { margin: 6px 18px 19px; overflow: hidden; border: 1px solid #e4ddcd; border-radius: 7px; background: #f4f0e6; }
.poster-loading-head, .poster-loading-image, .poster-loading-foot { background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; animation: poster-skeleton 1.4s ease-in-out infinite; }
.poster-loading-head { height: 190px; background-color: #dfe7df; }
.poster-loading-image { height: 255px; margin-top: 1px; }
.poster-loading-foot { height: 116px; margin-top: 1px; }
.poster-prices { display: flex; flex-shrink: 0; align-items: baseline; gap: 8px; }
.poster-original-price { color: rgba(234, 209, 162, .62); font-size: 12px; text-decoration: line-through; }
@media (max-width: 360px) { .poster-recommender-name { font-size: 16px; } }
@keyframes poster-skeleton { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
