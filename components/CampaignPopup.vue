<template>
  <view v-if="modelValue" class="campaign-backdrop" @click="close" @touchmove.stop.prevent>
    <view class="campaign-popup-wrap" @click.stop @touchmove.stop>
      <button class="campaign-close" aria-label="关闭活动弹窗" @click="close">×</button>
      <view class="campaign-popup" role="dialog" aria-modal="true" :aria-label="campaign.title || '活动礼遇'">
      <scroll-view scroll-y class="campaign-popup-body">
        <view class="campaign-popup-heading">
          <text class="campaign-brand">雄森酒业</text>
          <text class="campaign-popup-title serif">{{ campaign.title }}</text>
          <text class="campaign-popup-subtitle">{{ campaign.subtitle }}</text>
        </view>
        <image v-if="campaign.image && !imageError" class="campaign-popup-image" :src="mediaUrl(campaign.image)" mode="aspectFill" @error="imageError = true" />
        <view class="campaign-popup-content">
          <text class="campaign-popup-copy">{{ campaign.description }}</text>
          <view class="campaign-rule-summary">
            <view class="campaign-rule-heading"><text class="serif">活动规则</text><text class="campaign-rule-label">规则摘要</text></view>
            <text v-if="loading" class="campaign-rule-status">正在加载活动规则…</text>
            <template v-else-if="summary.length">
              <view v-for="(section, index) in summary" :key="section.heading" class="campaign-rule-item">
                <text class="campaign-rule-number">{{ index + 1 }}</text>
                <view><text class="campaign-rule-title">{{ section.heading }}</text><text class="campaign-rule-copy">{{ section.line }}</text></view>
              </view>
            </template>
            <text v-else class="campaign-rule-status">{{ failed ? '活动规则暂时无法加载，请重试。' : '活动规则正在更新，请稍后查看。' }}</text>
            <button v-if="failed" class="campaign-rule-retry" @click="loadRules">重新加载规则</button>
          </view>
        </view>
      </scroll-view>
      <view class="campaign-popup-actions">
        <button class="campaign-rules" @click="showRules"><text>完整活动规则</text><text aria-hidden="true"> ›</text></button>
        <button class="campaign-action" @click="participate">{{ campaign.button || '立即领券' }}</button>
      </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { mediaUrl } from '../services/config.js'
import { get } from '../services/api.js'
import { campaignRuleSummary } from '../services/campaign-popup.js'
const props = defineProps({ modelValue: Boolean, campaign: { type: Object, required: true } })
const emit = defineEmits(['update:modelValue', 'rules', 'participate'])
const imageError = ref(false)
const loading = ref(false), failed = ref(false), summary = ref([])
let revision = 0
async function loadRules() {
  const current = ++revision
  loading.value = true
  failed.value = false
  summary.value = []
  try {
    const item = await get('/mini/content/rules.campaign')
    if (current === revision) summary.value = campaignRuleSummary(item?.content)
  } catch { if (current === revision) failed.value = true }
  finally { if (current === revision) loading.value = false }
}
function close() { revision++; emit('update:modelValue', false) }
watch(() => props.campaign.image, () => { imageError.value = false })
watch(() => props.modelValue, open => { if (open) loadRules(); else revision++ }, { immediate: true })
onUnmounted(() => { revision++ })
function participate() { close(); emit('participate') }
function showRules() { close(); emit('rules') }
</script>
<style scoped>
.campaign-backdrop { position: fixed; inset: 0; z-index: 1100; padding: 24px; background: rgba(20,24,18,.65); display: flex; align-items: center; justify-content: center; }
.campaign-popup-wrap { width: 100%; max-width: 390px; position: relative; padding-bottom: 52px; }
.campaign-close { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 34px; height: 34px; padding: 0; color: #f9f1e4; line-height: 30px; border: 1px solid #eee0c6; border-radius: 50%; font-size: 29px; background: transparent; }
.campaign-close::after { border: none; }
.campaign-popup { display: flex; flex-direction: column; max-height: calc(100vh - 100px); border: 1px solid #e5c490; border-radius: 24px; background: #fff4e3; overflow: hidden; color: #654831; }
.campaign-popup-body { height: calc(100vh - 224px); max-height: 560px; min-height: 0; flex-shrink: 1; }
.campaign-popup-heading { padding: 22px 16px 16px; text-align: center; background: linear-gradient(135deg, #f8dfae, #fff6e7 52%, #f7dfb7); }
.campaign-brand { display: block; font-size: 12px; letter-spacing: 5px; color: #7b653e; }
.campaign-popup-title { display: block; margin-top: 8px; color: #a33a27; font-size: 29px; line-height: 1.5; letter-spacing: 3px; font-weight: 600; }
.campaign-popup-subtitle { display: block; margin-top: 5px; color: #846438; font-size: 13px; line-height: 1.8; }
.campaign-popup-image { display: block; width: 100%; height: 22vh; max-height: 180px; }
.campaign-popup-content { padding: 14px 20px 18px; }
.campaign-popup-copy { display: block; margin-bottom: 16px; font-size: 12px; line-height: 1.8; text-align: center; color: #705b3e; }
.campaign-rule-summary { padding-top: 14px; border-top: 1px solid #dfd1bd; }
.campaign-rule-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; color: #a33a27; font-size: 19px; }
.campaign-rule-label { font-size: 10px; color: #846438; }
.campaign-rule-item { display: flex; align-items: flex-start; gap: 10px; margin-top: 12px; }
.campaign-rule-number { width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; flex-shrink: 0; font-size: 11px; color: #782d3b; background: #ecdfce; }
.campaign-rule-title { display: block; font-size: 13px; font-weight: 600; line-height: 20px; color: #573e36; }
.campaign-rule-copy, .campaign-rule-status { display: block; font-size: 12px; line-height: 1.85; margin-top: 4px; }
.campaign-rule-retry { margin-top: 10px; padding: 0 10px; font-size: 12px; line-height: 44px; color: #782d3b; border: 1px solid #dfd1bd; background: transparent; }
.campaign-popup-actions { flex-shrink: 0; padding: 4px 20px 18px; border-top: 1px solid #e5c490; background: #fae7ca; }
.campaign-action { border-radius: 28px; background: #bd3b2c; color: #fff4e3; font-size: 17px; line-height: 48px; font-weight: 600; }
.campaign-rules { padding: 0; color: #a33a27; background: transparent; font-size: 14px; line-height: 44px; font-weight: 600; }
.campaign-action::after, .campaign-rules::after, .campaign-rule-retry::after { border: none; }
@media (max-height: 650px) {
  .campaign-popup-heading { padding-top: 14px; padding-bottom: 10px; }
  .campaign-popup-title { font-size: 23px; }
  .campaign-popup-image { height: 15vh; }
}
</style>
