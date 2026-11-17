<template>
  <view v-if="modelValue" class="rules-backdrop" @click="dismiss" @touchmove.stop.prevent>
    <view class="rules-dialog" role="dialog" aria-modal="true" :aria-label="title" @click.stop @touchmove.stop>
      <view class="rules-dialog-header">
        <text class="rules-dialog-brand">雄森酒业</text>
        <text class="rules-dialog-title serif">{{ title }}</text>
        <button class="rules-close" aria-label="关闭活动规则" @click="dismiss">×</button>
      </view>
      <scroll-view scroll-y class="rules-dialog-scroll">
        <view class="rules-dialog-content">
          <text v-if="loading" class="rules-dialog-status">正在加载活动规则…</text>
          <view v-else-if="error" class="rules-dialog-status"><text>{{ error }}</text><button class="rules-retry" @click="load">重新加载</button></view>
          <template v-else>
            <view v-for="(section, index) in sections" :key="section.heading" class="rules-dialog-section">
              <view class="rules-section-heading"><text class="rules-section-number">{{ index + 1 }}</text><text class="rules-section-title">{{ section.heading }}</text></view>
              <text v-for="line in section.lines" :key="line" class="rules-line">{{ line }}</text>
            </view>
            <view v-if="table && table.rows.length" class="rules-table-section">
              <text class="rules-table-title">{{ type === 'campaign' ? '优惠权益一览' : '活动权益一览' }}</text>
              <view class="rules-table">
              <view class="rules-table-row rules-table-head"><text v-for="column in table.columns" :key="column" class="rules-table-cell">{{ column }}</text></view>
              <view v-for="(row, index) in table.rows" :key="index" class="rules-table-row"><text v-for="(cell, cellIndex) in row" :key="cellIndex" class="rules-table-cell">{{ cell }}</text></view>
              </view>
            </view>
            <view v-for="prizeTable in prizeTables" :key="prizeTable.key" class="rules-table-section rules-prize-table">
              <text class="rules-table-title">{{ prizeTable.title }} · 奖品设置</text>
              <view class="rules-table">
                <view class="rules-table-row rules-table-head"><text v-for="column in prizeTable.columns" :key="column" class="rules-table-cell">{{ column }}</text></view>
                <view v-for="(row, index) in prizeTable.rows" :key="index" class="rules-table-row"><text v-for="(cell, cellIndex) in row" :key="cellIndex" class="rules-table-cell">{{ cell }}</text></view>
              </view>
              <text class="rules-table-note">剩余数量实时更新，以参与时的活动结果为准。</text>
            </view>
            <text v-if="!sections.length" class="rules-dialog-status">活动规则正在更新，请稍后查看。</text>
          </template>
        </view>
      </scroll-view>
      <view class="rules-dialog-footer">
        <view class="rules-consent">
          <button role="checkbox" :aria-checked="accepted" :aria-label="agreements.length ? '同意活动规则与协议' : '同意活动规则'" class="consent-check" @click="accepted = !accepted"><text :class="{ checked: accepted }">{{ accepted ? '✓' : '' }}</text></button>
          <view>我已阅读并同意 <template v-for="(agreement, index) in agreements" :key="agreement.type"><text class="agreement-link" @click="openAgreement(agreement.type)">{{ agreement.label }}</text><text>{{ index < agreements.length - 1 ? '和' : '及' }}</text></template>以上活动规则</view>
        </view>
        <button class="rules-confirm" :disabled="!accepted || loading || !!error || !sections.length" @click="accept">{{ confirmLabel }}</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { go } from '../services/navigation.js'
import { get } from '../services/api.js'
import { normalizeRuleContent, availableRuleAgreements, drawRuleTables } from '../services/rules-content.js'
const props = defineProps({ modelValue: Boolean, type: { type: String, default: 'campaign' }, confirmLabel: { type: String, default: '已阅读并同意' }, activities: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'agree', 'cancel'])
const accepted = ref(false)
function openAgreement(type) { go('rules', { type }) }
function accept() { if (!accepted.value || loading.value || error.value || !sections.value.length) return; emit('agree'); close() }
const loading = ref(false), error = ref(''), sections = ref([]), table = ref(null)
const agreements = ref([])
const title = computed(() => props.type === 'promotion' ? '分享返利规则' : '活动规则')
const prizeTables = computed(() => props.type === 'draw' && !table.value ? drawRuleTables(props.activities) : [])
let revision = 0
function close() { revision++; emit('update:modelValue', false) }
function dismiss() { close(); emit('cancel') }
async function load() {
  const current = ++revision
  loading.value = true
  error.value = ''
  sections.value = []
  table.value = null
  agreements.value = []
  try {
    const [itemResult, couponResult, agreementResult] = await Promise.allSettled([
      get(`/mini/content/${encodeURIComponent(`rules.${props.type}`)}`),
      props.type === 'campaign' ? get('/mini/coupons/templates') : Promise.resolve(null),
      get('/mini/content'),
    ])
    if (current !== revision) return
    if (itemResult.status === 'rejected') throw itemResult.reason
    if (agreementResult.status === 'rejected') throw agreementResult.reason
    agreements.value = availableRuleAgreements(agreementResult.value)
    const content = normalizeRuleContent(itemResult.value?.content, props.type)
    sections.value = content.sections
    table.value = content.table
    const coupons = couponResult.status === 'fulfilled' ? couponResult.value : null
    if (!table.value && Array.isArray(coupons)) table.value = {
      columns: ['优惠名称', '优惠权益', '使用条件'],
      rows: coupons.filter(coupon => !coupon.pointsOnly).map(coupon => [
        coupon.name,
        coupon.kind === 'percent' ? `${Number(coupon.rate) / 10}折` : `减${Number(coupon.amount) / 100}元`,
        [coupon.memberOnly ? '指定会员' : '', Number(coupon.minQuantity) > 1 ? `至少${coupon.minQuantity}件` : '', Number(coupon.minimum) > 0 ? `满${Number(coupon.minimum) / 100}元` : ''].filter(Boolean).join('，') || '按券面适用范围',
      ]),
    }
  } catch {
    if (current === revision) error.value = '活动规则暂时无法加载，请重试。'
  } finally { if (current === revision) loading.value = false }
}
watch(() => [props.modelValue, props.type], ([open]) => { if (open) { accepted.value = false; load(); } else revision++ }, { immediate: true })
onUnmounted(() => { revision++ })
</script>
<style scoped>
.rules-backdrop { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(24,20,16,.65); }
.rules-dialog { display: flex; flex-direction: column; width: 100%; max-width: 420px; max-height: calc(100vh - 40px); border-radius: 24px; background: #fff4e3; overflow: hidden; color: #654831; border: 1px solid #e5c490; }
.rules-dialog-header, .rules-dialog-footer { flex-shrink: 0; }
.rules-dialog-header { position: relative; padding: 0 48px 12px; text-align: center; }
.rules-dialog-brand { display: block; font-size: 10px; letter-spacing: 4px; padding: 14px 0 7px; color: #fff0d9; background: #bd3b2c; }
.rules-dialog-title { display: block; padding: 0 0 17px; font-size: 26px; font-weight: 600; letter-spacing: 2px; color: #fff4e3; background: #bd3b2c; border-radius: 0 0 24px 24px; }
.rules-close { position: absolute; top: 12px; right: 0; width: 44px; height: 44px; padding: 0; font-size: 28px; line-height: 44px; color: #a33a27; background: transparent; }
.rules-close::after { border: 0; }
.rules-dialog-scroll { height: 48vh; min-height: 0; max-height: 480px; flex-shrink: 1; }
.rules-dialog-content { padding: 0 18px 24px; }
.rules-dialog-section { padding-top: 20px; }
.rules-section-heading { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
.rules-section-number { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #bd3b2c; color: #fff4e3; font-size: 13px; font-weight: 600; }
.rules-section-title { display: block; color: #a33a27; font-size: 17px; font-weight: 600; }
.rules-line { display: block; font-size: 13px; line-height: 1.9; margin-top: 8px; }
.rules-dialog-status { display: block; padding: 30px 0; font-size: 14px; line-height: 1.8; }
.rules-retry { margin-top: 16px; padding: 10px; color: #993527; border: 1px solid #e9e5e1; background: #f7e4c8; font-size: 14px; }
.rules-table-section { margin-top: 24px; }
.rules-table-title { display: block; margin-bottom: 12px; color: #a33a27; font-size: 16px; font-weight: 600; }
.rules-table-note { display: block; font-size: 11px; line-height: 1.7; margin-top: 10px; }
.rules-table { border: 1px solid #c9a679; }
.rules-table-row { display: flex; border-top: 1px solid #c9a679; }
.rules-table-row:first-child { border-top: 0; }
.rules-table-head { background: #eed4ae; font-weight: 600; }
.rules-table-cell { flex: 1; min-width: 0; padding: 10px 6px; border-right: 1px solid #c9a679; font-size: 12px; line-height: 1.6; text-align: center; overflow-wrap: break-word; }
.rules-table-cell:last-child { border-right: 0; }
.rules-dialog-footer { padding: 12px 20px 20px; border-top: 1px solid #e5c490; background: #fae7ca; }
.rules-confirm { background: #bd3b2c; color: #fff4e3; border-radius: 28px; font-size: 16px; font-weight: 600; line-height: 48px; }
.rules-confirm::after { border: none; }
.rules-confirm[disabled], .rules-confirm:disabled { background: #e8d5bb; color: #79634c; opacity: 1; }
.rules-consent { display: flex; align-items: center; gap: 2px; font-size: 12px; line-height: 1.8; margin-bottom: 10px; }
.consent-check { display: flex; align-items: center; justify-content: center; background: transparent; width: 44px; height: 44px; margin-left: -10px; padding: 0; flex-shrink: 0; }
.consent-check::after { border: 0; }
.consent-check text { display: inline-flex; width: 20px; height: 20px; border: 1px solid #b4916e; border-radius: 5px; align-items: center; justify-content: center; font-size: 17px; line-height: 20px; }
.consent-check .checked { background: #bd3b2c; border-color: #bd3b2c; color: #fff4e3; }
.agreement-link { color: #a33a27; text-decoration: underline; }
</style>
