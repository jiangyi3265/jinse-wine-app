<template>
  <PageShell :title="title">
    <view class="rules-copy">
      <template v-if="type === 'coupon' && !isApiMode()">
        <text class="section-title">{{ coupon?.name || '优惠券使用说明' }}</text>
        <text>{{ coupon?.description || '在领券中心领取优惠券，结算时选择可用优惠券抵扣。' }}</text>
        <text>1. 每笔订单使用一张优惠券，不与其他券叠加。</text>
        <text>2. 满减门槛按适用商品的实际售价小计计算，运费不计入。</text>
        <text>3. 件数折扣券需达到最低购买件数。9.5折按售价的95%付款，9折按90%付款。</text>
        <text>4. 代金券用于购物抵扣，不可提现。</text>
        <text>5. 优惠券有效期以发放时服务端返回的规则为准。</text>
        <text>6. 未付款订单取消后退回优惠券；已付款订单的退款退券规则需以实际活动约定为准。</text>
      </template>
      <template v-else-if="type === 'coupon' && isApiMode()">
        <template v-for="section in content" :key="section.heading">
          <text class="section-title">{{ section.heading }}</text>
          <text v-for="line in section.lines" :key="line">{{ line }}</text>
        </template>
      </template>
      <template v-else v-for="section in content" :key="section.heading">
        <text class="section-title">{{ section.heading }}</text>
        <text v-for="line in section.lines" :key="line">{{ line }}</text>
      </template>
    </view>
  </PageShell>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import { getCouponTemplate } from '../../services/catalog.js'
import { config, isApiMode } from '../../services/config.js'
const type = ref('coupon'),
  id = ref('')
onLoad((q) => {
  type.value = q.type || 'coupon'
  id.value = q.id || ''
})
const coupon = computed(() => getCouponTemplate(id.value))
const title = computed(
  () =>
    ({
      coupon: '使用规则',
      points: '积分规则',
      draw: '活动规则',
      promotion: '推广规则',
      ranking: '排行规则',
      shipping: '配送说明',
      campaign: '中秋活动规则',
    })[type.value] || '规则说明',
)
const rules = {
  points: [
    {
      heading: '积分获取与兑换',
      lines: [
        '积分可通过参加指定活动获得，明细可在积分账户查询。',
        '可兑换代金券、优惠券和实物奖品。兑换前请确认所需积分和剩余库存。',
        '兑换成功后积分扣减，代金券进入我的优惠券，实物进入我的奖品。',
        '兑换结果、积分扣减和奖品发放以服务端最终结果为准。',
      ],
    },
  ],
  draw: [
    {
      heading: '扫码有礼',
      lines: [
        '通过瓶身活动码参与对应活动。每个活动码的参与次数和有效期以活动配置为准。',
        '奖励包含现金红包、积分、优惠券和实物商品。现金通过官方收款流程领取，实物凭个人兑奖资格到店兑换。',
        '活动资格、奖池、概率、金额和中奖结果均由服务端确定。',
      ],
    },
  ],
  promotion: [
    {
      heading: '分享好酒',
      lines: [
        '在推广中心生成专属海报，分享商品给有需要的朋友。',
        '实际推广关系、有效订单与佣金由服务端核定。订单达到约定的支付及核销条件后计佣。',
        '推广中心金额与成员以服务端结算数据为准，不代表可直接提取收益。',
      ],
    },
  ],
  ranking: [
    {
      heading: '本期排行',
      lines: [
        '按照本期有效分销佣金业绩排名。',
        '积分与补贴奖励、活动起止时间以正式公布的本期规则为准。',
        '页面排名与业绩以服务端返回的统计数据为准。',
      ],
    },
  ],
  shipping: [
    {
      heading: '配送与收货',
      lines: [
        '商城商品由平台统一发货，配送费用在确认订单页展示。',
        '请在提交订单前核对收货人、联系电话及详细地址。',
        '商品发货后可在我的订单中查看物流信息，运费以服务端报价为准。',
      ],
    },
  ],
  campaign: [
    {
      heading: '中秋好礼',
      lines: [
        '中秋全场9折券按适用商品售价的90%结算。',
        '社群专享券限有资格的会员领取，购买2件及以上享9.5折。',
        '每笔订单使用一张券，不叠加。活动期间、库存与适用范围以领取时显示的券规则为准。',
        '公众号与视频号为品牌内容入口，打开主页不等于验证关注或获得领券资格。',
      ],
    },
  ],
}
const content = computed(() => {
  if (!isApiMode()) return rules[type.value] || []
  const value = config.brand.rules?.[type.value] || config.brand.rules
  const configured = Array.isArray(value) ? value : (() => {
    try { return value ? JSON.parse(value) : [] } catch { return [] }
  })()
  if (Array.isArray(configured) && configured.length) return configured
  const item = config.content?.[`rules.${type.value}`]?.content
  if (!Array.isArray(item)) return []
  return item.map((section) => ({
    heading: section.heading || section.title || '规则说明',
    lines: Array.isArray(section.lines) ? section.lines : [section.text || ''],
  }))
})
</script>
