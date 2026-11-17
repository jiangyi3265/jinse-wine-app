<template>
  <view class="product-referral">
    <view class="product-sharing">
      <view class="referral-heading">
        <view class="referral-title"><AppIcon name="gift" :size="18" tone="brand" /><text>分享返利</text></view>
        <button class="referral-more" aria-label="查看完整分享返利规则" @click="$emit('rules')"><text class="share-rules-link">完整规则</text><AppIcon name="chevron" :size="13" /></button>
      </view>
      <text v-if="loading" class="referral-status">正在加载返利说明…</text>
      <template v-else-if="guide.length">
        <template v-if="!expanded">
          <text v-for="line in summary" :key="line" class="referral-copy">{{ line }}</text>
          <text v-if="!summary.length" class="referral-copy">参与前，请查看下方详细分销说明与当前活动规则。</text>
        </template>
        <view v-else class="referral-guide">
          <text class="referral-guide-title">从分享，到收益到账</text>
          <text class="referral-guide-lead">先了解推荐关系，再查看计佣与提现条件。</text>
          <view v-for="(section, index) in guide" :key="index" class="referral-step">
            <text class="referral-step-index">{{ index + 1 < 10 ? '0' : '' }}{{ index + 1 }}</text>
            <view class="referral-step-content"><text class="referral-step-title">{{ section.heading }}</text><text v-for="(line, lineIndex) in section.lines" :key="lineIndex" class="referral-copy">{{ line }}</text></view>
          </view>
        </view>
        <button class="referral-expand" :aria-expanded="expanded" @click="expanded = !expanded">{{ expanded ? '收起详细说明' : '了解分销流程与提现条件' }}<AppIcon name="chevron" :size="12" tone="brand" /></button>
      </template>
      <text v-else class="referral-status">{{ failed ? '返利说明暂未加载，请重试或查看完整规则。' : '查看当前活动的推荐奖励与提现规则。' }}</text>
    </view>
    <button v-if="failed" class="referral-retry" :disabled="loading" @click="load">重新加载返利说明</button>
    <view v-if="actions" class="referral-actions"><button class="referral-share" @click="$emit('share')"><AppIcon name="share" tone="brand" :size="16" />立即分享</button><button @click="$emit('earnings')">我的佣金 <AppIcon name="chevron" :size="12" /></button></view>
  </view>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'
import { get } from '../services/api.js'
import { referralSummary, referralGuide } from '../services/referral-summary.js'
const props = defineProps({ actions: { type: Boolean, default: false }, detailed: { type: Boolean, default: false } })
defineEmits(['rules', 'share', 'earnings'])
const loading = ref(true), failed = ref(false), summary = ref([]), guide = ref([])
const expanded = ref(props.detailed)
let revision = 0
async function load() {
  const current = ++revision
  loading.value = true
  failed.value = false
  summary.value = []
  guide.value = []
  try {
    const item = await get('/mini/content/rules.promotion')
    if (current === revision) {
      summary.value = referralSummary(item?.content)
      guide.value = referralGuide(item?.content)
    }
  } catch { if (current === revision) failed.value = true }
  finally { if (current === revision) loading.value = false }
}
onMounted(load)
onUnmounted(() => { revision++ })
</script>
<style scoped>
.product-referral { margin: 18px 0 8px; border: 1px solid #e5d6c7; border-radius: 10px; overflow: hidden; background: #f5ebdf; }
.product-sharing { display: block; padding: 10px 16px; text-align: left; color: #514c48; line-height: 1.7; }
.referral-heading, .referral-title, .referral-more { display: flex; align-items: center; }
.referral-heading { justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.referral-title { gap: 7px; color: #782d3b; font-size: 14px; font-weight: 600; }
.referral-more { gap: 3px; color: #795334; font-size: 12px; padding: 0; min-height: 44px; margin: 0; background: transparent; }
.referral-more::after, .referral-expand::after, .referral-retry::after { border: none; }
.referral-copy { display: block; margin-top: 6px; font-size: 13px; line-height: 1.85; overflow-wrap: break-word; }
.referral-status { display: block; padding: 8px 0; font-size: 12px; }
.referral-guide { padding-top: 8px; }
.referral-guide-title { display: block; color: #532331; font-size: 20px; font-weight: 600; line-height: 1.5; }
.referral-guide-lead { display: block; margin: 8px 0 20px; color: #795f4d; font-size: 12px; line-height: 1.8; }
.referral-step { display: flex; align-items: flex-start; gap: 12px; padding: 18px 0; border-top: 1px solid #e5d6c7; }
.referral-step-index { flex-shrink: 0; color: #947354; font-size: 18px; font-weight: 500; line-height: 1.5; }
.referral-step-content { flex: 1; min-width: 0; }
.referral-step-title { display: block; color: #532331; font-size: 15px; font-weight: 600; line-height: 1.7; }
.referral-expand { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px 0; margin-top: 12px; min-height: 44px; border-top: 1px solid #e5d6c7; border-radius: 0; color: #782d3b; background: transparent; font-size: 12px; line-height: 1.8; }
.referral-retry { border-top: 1px solid #e5d6c7; border-radius: 0; min-height: 44px; padding: 10px; font-size: 12px; color: #782d3b; background: transparent; }
.referral-actions { display: flex; border-top: 1px solid #e5d6c7; }
.referral-actions button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px; border-radius: 0; font-size: 12px; color: #78665a; }
.referral-actions button::after { border: none; }
.referral-actions .referral-share { color: #782d3b; font-weight: 600; }
.referral-more:active, .referral-expand:active, .referral-actions button:active { background: #eddfd0; }
</style>

