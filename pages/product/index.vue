<template>
  <PageShell title="商品详情" dark footer>
    <template v-if="product">
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
          <PriceTag :value="product.price" :original="product.originalPrice" large />
        </view>
        <button class="detail-coupon" @click="go('coupons')">
          <AppIcon name="coupon" :size="23" />
          <text class="strong">领券</text>
          <text>满200减15</text>
          <AppIcon name="chevron" :size="15" />
        </button>
        <button class="link-row" @click="sheet = true">
          <text>规格</text>
          <view class="row muted">
            <text>{{ product.id === 'double' ? '双瓶礼盒' : '单件装' }} · {{ quantity }}件</text>
            <AppIcon name="chevron" :size="16" />
          </view>
        </button>
        <button class="link-row" @click="go('rules', { type: 'shipping' })">
          <text>配送</text>
          <view class="row muted">
            <text>平台统一发货</text>
            <AppIcon name="chevron" :size="16" />
          </view>
        </button>
        <view class="section-heading"><text class="section-title serif">商品详情</text></view>
        <view class="detail-story serif">
          <image src="/static/design/detail-landscape.jpg" mode="aspectFill" />
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
            图片为设计示例，商品信息以实际包装为准。
          </text>
        </view>
      </view>
      <view class="bottom-action">
        <button class="column center" @click="contact">
          <AppIcon name="headset" :size="25" />
          <text class="small muted">客服</text>
        </button>
        <button class="btn" @click="buy">立即购买</button>
      </view>
    </template>
    <EmptyState
      v-else
      title="商品不存在或已下架"
      description="去商城看看其他好酒"
      button="返回商城"
      @action="go('shop')"
    />
    <view v-if="sheet && product" class="sheet-backdrop" @click="sheet = false">
      <view class="sheet" @click.stop>
        <view class="between">
          <text class="sheet-title">选择规格</text>
          <button class="icon-button" aria-label="关闭" @click="sheet = false">
            <AppIcon name="close" />
          </button>
        </view>
        <view class="order-product">
          <image class="order-photo" :src="product.image" mode="aspectFill" />
          <view class="column">
            <text class="strong">{{ product.name }}</text>
            <text class="muted">{{ product.spec }}</text>
            <PriceTag :value="product.price" />
          </view>
        </view>
        <view class="between">
          <text>购买数量</text>
          <view class="stepper">
            <button aria-label="减少数量" :disabled="quantity <= 1" @click="quantity--">−</button>
            <text>{{ quantity }}</text>
            <button aria-label="增加数量" :disabled="quantity >= product.stock" @click="quantity++">
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
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import PriceTag from '../../components/PriceTag.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getProduct } from '../../services/catalog.js'
import { prepareCheckout } from '../../services/store.js'
import { go, contact, run } from '../../services/navigation.js'
const id = ref('classic'),
  quantity = ref(1),
  sheet = ref(false),
  slide = ref(0)
onLoad((q) => {
  id.value = q.id || 'classic'
})
const product = computed(() => getProduct(id.value)),
  photos = computed(() =>
    product.value
      ? [
          product.value.id === 'classic'
            ? '/static/design/detail-scene-clean.jpg'
            : product.value.image,
          product.value.image,
          product.value.id === 'classic' ? '/static/design/hero-product.jpg' : product.value.image,
        ]
      : [],
  )
function buy() {
  run(() => {
    prepareCheckout(id.value, quantity.value)
    go('checkout')
  })
}
function previewImage(index) {
  uni.previewImage({ urls: photos.value, current: photos.value[index] })
}
</script>
