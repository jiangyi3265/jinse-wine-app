<template>
  <view v-if="detail" class="product-details" :class="{ 'pd-rice': product.category === '高度米酒系列' }">
    <view class="pd-intro">
      <text class="pd-collection-label">产品介绍</text>
      <text class="pd-eyebrow">雄森酒业 · {{ product.category }}</text>
      <text class="pd-title serif">{{ detail.title }}</text>
      <text class="pd-size">{{ detail.size }}</text>
      <text class="pd-copy">{{ detail.intro }}</text>
      <view v-if="detail.facts.length" class="pd-facts">
        <view v-for="fact in detail.facts" :key="fact.label" class="pd-fact">
          <text class="pd-number">{{ fact.value }}<text class="pd-unit">{{ fact.unit }}</text></text>
          <text class="pd-label">{{ fact.label }}</text>
        </view>
      </view>
    </view>
    <view v-for="(photo, index) in detail.images" :key="photo.src" class="pd-photo-section" :class="{ 'pd-photo-section-dark': index % 2 === 1, 'pd-photo-section-first': index === 0 }">
      <view class="pd-section-heading"><text class="pd-chapter">{{ index + 1 < 10 ? '0' : '' }}{{ index + 1 }}</text><view class="pd-section-copy"><text class="pd-eyebrow">{{ index === 0 ? '外观与包装' : '近看产品细节' }}</text><text class="pd-heading serif">{{ photo.heading }}</text></view></view>
      <image v-if="!imageErrors[photo.src]" class="pd-photo" :src="photo.src" mode="widthFix" :aria-label="`${detail.title}，${photo.heading}，点击查看大图`" @load="settledImages[photo.src] = true" @error="imageErrors[photo.src] = true" @click="preview(photo.src)" />
      <button v-else class="pd-photo-retry" @click="retryImage(photo.src)">图片加载失败，点击重新加载</button>
      <text v-if="photo.caption" class="pd-caption">{{ photo.caption }}</text>
      <view v-if="index === 0 && detail.highlights?.length" class="pd-highlights">
        <view v-for="item in detail.highlights" :key="item.title" class="pd-highlight">
          <text class="pd-heading serif">{{ item.title }}</text>
          <text class="pd-copy">{{ item.text }}</text>
        </view>
      </view>
    </view>
    <button v-if="galleryError" class="pd-photo-retry" :disabled="galleryLoading" @click="$emit('retry-gallery')">{{ galleryLoading ? '正在加载实拍…' : '更多实拍未加载，点击重试' }}</button>
    <text v-else-if="galleryLoading" class="pd-caption">正在加载更多实拍…</text>
    <view v-if="detail.featurePosters?.length" class="pd-feature-posters">
      <image v-for="poster in detail.featurePosters" :key="poster" v-show="!imageErrors[poster]" :src="poster" mode="widthFix" class="pd-photo" aria-label="产品介绍图，点击查看大图" @load="settledImages[poster] = true" @error="imageErrors[poster] = true" @click="preview(poster)" />
      <button v-for="poster in detail.featurePosters.filter(src => imageErrors[src])" :key="poster + '-retry'" class="pd-photo-retry" @click="retryImage(poster)">图片加载失败，点击重新加载</button>
    </view>
    <view v-else-if="detail.story" class="pd-brand-story">
      <view v-if="detail.story.imageUrl" class="pd-wine-city">
        <image v-if="!imageErrors[mediaUrl(detail.story.imageUrl)]" :src="mediaUrl(detail.story.imageUrl)" mode="widthFix" class="pd-photo" aria-label="雄森酒城，一座有故事的城" @load="settledImages[mediaUrl(detail.story.imageUrl)] = true" @error="imageErrors[mediaUrl(detail.story.imageUrl)] = true" />
        <button v-else class="pd-photo-retry" @click="retryImage(mediaUrl(detail.story.imageUrl))">图片加载失败，点击重新加载</button>
        <text v-if="detail.story.caption" class="pd-caption">{{ detail.story.caption }}</text>
      </view>
      <view class="pd-company-copy">
        <text class="pd-eyebrow">广西雄森酒业</text>
        <text class="pd-heading serif">{{ detail.story.title }}</text>
        <text v-for="(paragraph, index) in companyParagraphs" :key="index" class="pd-copy">{{ paragraph }}</text>
      </view>
    </view>
    <view id="product-parameters" class="pd-parameters">
      <text class="pd-eyebrow">规格与包装 · 一目了然</text>
      <text class="pd-heading serif">产品档案</text>
      <view v-for="row in detail.parameters" :key="row[0]" class="pd-parameter">
        <text class="pd-parameter-label">{{ row[0] }}</text><text class="pd-parameter-value">{{ row[1] }}</text>
      </view>
    </view>
    <view class="pd-purchase">
      <text class="pd-eyebrow">下单与售后</text>
      <text class="pd-heading serif">购买须知</text>
      <view v-for="notice in detail.purchaseNotices" :key="notice.title" class="pd-notice">
        <view class="pd-notice-heading"><AppIcon :name="notice.icon" tone="gold" :size="24" /><text class="pd-note-title">{{ notice.title }}</text></view>
        <text v-for="(paragraph, index) in notice.paragraphs" :key="index" class="pd-copy">{{ paragraph }}</text>
      </view>
      <view class="pd-note"><text class="pd-note-title">规格与数量</text><text class="pd-copy">{{ detail.selection }}</text></view>
      <view class="pd-note"><text class="pd-note-title">配送与库存</text><text class="pd-copy">{{ shippingLabel }}。{{ stock > 0 ? '可售数量以当前规格选择页为准。' : '当前规格暂时缺货，补货后可购买。' }}下单前请核对收货地址。</text></view>
      <text class="pd-ending">过量饮酒有害健康 · 孕妇及未成年人不宜饮酒</text>
    </view>
  </view>
</template>
<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount, getCurrentInstance } from 'vue'
import { mediaUrl } from '../services/config.js'
import { productDetail } from '../services/product-detail.js'
import AppIcon from './AppIcon.vue'
const props = defineProps({
  product: { type: Object, required: true },
  photos: { type: Array, default: () => [] },
  editorial: { type: Object, default: null },
  shippingLabel: { type: String, default: '运费计算中' },
  stock: { type: Number, default: 0 },
  galleryError: Boolean,
  galleryLoading: Boolean,
})
const emit = defineEmits(['retry-gallery', 'parameter-location-change'])
const detail = computed(() => productDetail(props.product, props.photos, props.editorial))
const companyParagraphs = computed(() => (detail.value?.story?.text || '').split(/\n\s*\n/).filter(Boolean))
const imageErrors = ref({})
const settledImages = ref({})
const parameterOffset = ref(null)
const imagesReady = computed(() => !props.galleryLoading && [
  ...(detail.value?.images || []).map(photo => photo.src),
  ...(detail.value?.featurePosters || []),
  ...(!detail.value?.featurePosters?.length && detail.value?.story?.imageUrl ? [mediaUrl(detail.value.story.imageUrl)] : []),
].every(src => settledImages.value[src] || imageErrors.value[src]))
const instance = getCurrentInstance()
function scrollToParameters(offset) { parameterOffset.value = offset }
function cancelParameterScroll() { parameterOffset.value = null }
onBeforeUnmount(cancelParameterScroll)
watch(parameterOffset, value => emit('parameter-location-change', value !== null), { flush: 'sync' })
// widthFix photos change the section position on first load. Locate only after
// the final gallery has settled, and abandon the request if the user moves on.
watch([parameterOffset, imagesReady], async ([offset, ready]) => {
  if (offset === null || !ready) return
  await nextTick()
  // uni-image schedules widthFix sizing in its own nextTick callback.
  await new Promise(resolve => setTimeout(resolve, 0))
  if (parameterOffset.value !== offset) return
  parameterOffset.value = null
  uni.createSelectorQuery().in(instance.proxy).select('#product-parameters').boundingClientRect().selectViewport().scrollOffset().exec(result => {
    if (!result[0] || !result[1]) return
    uni.pageScrollTo({ scrollTop: Math.max(0, result[0].top + result[1].scrollTop - offset), duration: 250 })
  })
}, { flush: 'post' })
defineExpose({ scrollToParameters, cancelParameterScroll })
watch(() => props.product.id, () => { imageErrors.value = {}; settledImages.value = {}; cancelParameterScroll() })
function retryImage(src) { delete imageErrors.value[src]; delete settledImages.value[src] }
function preview(src) {
  const posters = detail.value?.featurePosters || []
  uni.previewImage({ current: src, urls: posters.includes(src) ? posters : props.photos })
}
</script>
<style scoped>
.product-details { color: #232321; background: #faf9f6; overflow: hidden; }
.pd-intro { padding: 36px 24px 28px; text-align: center; background: #40252d; color: #faf4e9; }
.pd-collection-label { display: block; width: fit-content; margin: 0 auto 22px; padding-bottom: 8px; border-bottom: 1px solid #9a7766; color: #e2c6a3; font-size: 11px; letter-spacing: 4px; line-height: 1.6; }
.pd-eyebrow { display: block; color: #886344; font-size: 11px; letter-spacing: 1px; line-height: 1.8; }
.pd-intro .pd-eyebrow { color: #dec3a8; }
.product-details .pd-title { display: block; margin: 12px 0 10px; font-family: 'Songti SC', 'STSong', 'SimSun', serif; font-size: 28px; line-height: 1.5; font-weight: 500; letter-spacing: 2px; }
.pd-size { display: block; font-size: 13px; line-height: 1.8; color: #dec3a8; }
.pd-copy { display: block; font-size: 13px; line-height: 1.9; color: #625950; }
.pd-intro > .pd-copy { margin: 20px 0 0; color: #eee0d4; text-align: left; }
.pd-facts { display: flex; margin-top: 26px; padding-top: 22px; border-top: 1px solid #75565c; }
.pd-fact { flex: 1; min-width: 0; text-align: center; border-right: 1px solid #75565c; }
.pd-fact:last-child { border-right: 0; }
.pd-number { display: block; font-size: 26px; font-weight: 500; color: #faf4e9; line-height: 1.4; font-variant-numeric: tabular-nums; }
.pd-unit { font-size: 11px; padding-left: 3px; }
.pd-label { display: block; margin-top: 6px; font-size: 11px; color: #dec3a8; }
.pd-photo-section { background: #faf9f6; padding-bottom: 28px; }
.pd-photo-section-dark { background: #eee8df; }
.pd-section-heading { display: flex; align-items: center; gap: 16px; padding: 30px 24px 20px; }
.pd-chapter { flex-shrink: 0; color: #aa8a6d; font-size: 32px; font-weight: 400; line-height: 1.2; font-variant-numeric: tabular-nums; }
.pd-section-copy { flex: 1; min-width: 0; }
.pd-section-copy .pd-eyebrow { margin-bottom: 4px; }
.pd-heading { display: block; font-size: 20px; font-weight: 600; line-height: 1.6; color: #40252d; }
.pd-photo { display: block; width: 100%; height: auto; }
.pd-caption { display: block; margin: 16px 24px 0; font-size: 12px; line-height: 1.9; color: #6d6056; }
.pd-highlights { margin: 26px 24px 0; }
.pd-highlight { padding: 20px 0 0; margin-top: 20px; border-top: 1px solid #dfd4c7; }
.pd-highlight .pd-heading { font-size: 18px; margin-bottom: 8px; color: #782d3b; }
.pd-parameters { padding: 32px 24px; background: #faf9f6; }
.pd-parameters > .pd-heading { margin: 8px 0 18px; }
.pd-parameter { display: flex; gap: 14px; padding: 12px; font-size: 12px; line-height: 1.75; background: #f1efeb; }
.pd-parameter:nth-child(2n) { background: #f7f5f2; }
.pd-parameter-label { flex: 0 0 66px; color: #6d6056; }
.pd-parameter-value { flex: 1; min-width: 0; overflow-wrap: break-word; }
.pd-purchase { padding: 32px 24px; background: #f4eee3; }
.pd-purchase > .pd-heading { margin: 4px 0 24px; }
.pd-notice { padding: 22px 0; border-top: 1px solid #d9cbbb; }
.pd-notice-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.pd-notice-heading .pd-note-title { margin: 0; font-size: 17px; font-weight: 600; color: #40252d; }
.pd-notice .pd-copy { font-size: 14px; line-height: 1.9; }
.pd-notice .pd-copy + .pd-copy { margin-top: 10px; }
.pd-note { margin-top: 18px; }
.pd-note-title { display: block; margin-bottom: 6px; font-size: 13px; color: #232321; font-weight: 500; }
.pd-ending { display: block; margin-top: 28px; padding-top: 20px; border-top: 1px solid #d5c8b9; color: #6d6056; font-size: 11px; line-height: 1.8; text-align: center; }
.pd-photo-retry { margin: 20px; padding: 16px; color: #782d3b; background: #f3e9eb; font-size: 13px; line-height: 1.7; }
.pd-brand-story { background: #f4eee3; }
.pd-wine-city { padding-bottom: 20px; }
.pd-wine-city .pd-caption { text-align: center; color: #80644b; }
.pd-company-copy { padding: 16px 24px 32px; }
.pd-company-copy .pd-heading { margin: 4px 0 22px; }
.pd-company-copy .pd-copy { font-size: 14px; line-height: 2; color: #55483e; }
.pd-company-copy .pd-copy + .pd-copy { margin-top: 18px; }
</style>
