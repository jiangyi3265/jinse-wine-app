<template>
  <view class="region-select">
    <view class="region-columns">
      <picker mode="selector" :range="regions" range-key="name" :value="provinceIndex" :disabled="disabled" @change="chooseProvince">
        <view class="region-cell" :class="{ placeholder: !modelValue[0] }"><text>{{ modelValue[0] || '请选择省' }}</text><text class="arrow">⌄</text></view>
      </picker>
      <picker mode="selector" :range="cities" range-key="name" :value="cityIndex" :disabled="disabled || !cities.length" @change="chooseCity">
        <view class="region-cell" :class="{ placeholder: !modelValue[1], unavailable: !cities.length }"><text>{{ modelValue[1] || '请选择市' }}</text><text class="arrow">⌄</text></view>
      </picker>
      <picker mode="selector" :range="districts" range-key="name" :value="districtIndex" :disabled="disabled || !districts.length" @change="chooseDistrict">
        <view class="region-cell" :class="{ placeholder: !modelValue[2], unavailable: !districts.length }"><text>{{ modelValue[2] || '请选择区县' }}</text><text class="arrow">⌄</text></view>
      </picker>
    </view>
    <button v-if="clearable && modelValue.length" class="region-clear" :disabled="disabled" @click="change([])">清除地区筛选</button>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import { regions } from '../services/regions.js'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, disabled: Boolean, clearable: Boolean })
const emit = defineEmits(['update:modelValue', 'change'])
const provinceIndex = computed(() => Math.max(0, regions.findIndex(p => p.name === props.modelValue[0])))
const cities = computed(() => regions.find(p => p.name === props.modelValue[0])?.children || [])
const cityIndex = computed(() => Math.max(0, cities.value.findIndex(c => c.name === props.modelValue[1])))
const districts = computed(() => cities.value.find(c => c.name === props.modelValue[1])?.children || [])
const districtIndex = computed(() => Math.max(0, districts.value.findIndex(d => d.name === props.modelValue[2])))
function change(path) { emit('update:modelValue', path); emit('change', path) }
function chooseProvince(e) { const p = regions[Number(e.detail.value)]; if (p) change([p.name]) }
function chooseCity(e) { const c = cities.value[Number(e.detail.value)]; if (c) change([props.modelValue[0], c.name]) }
function chooseDistrict(e) { const d = districts.value[Number(e.detail.value)]; if (d) change([props.modelValue[0], props.modelValue[1], d.name]) }
</script>
<style scoped>
.region-select { width: 100%; min-width: 0; }
.region-columns { display: flex; flex-direction: column; gap: 8px; }
.region-columns picker { width: 100%; min-width: 0; }
.region-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 11px 12px; border: 1px solid #e3e7e0; border-radius: 8px; background: #fafbf8; color: #203d31; font-size: 14px; line-height: 1.5; }
.region-cell text:first-child { flex: 1; min-width: 0; white-space: normal; }
.placeholder { color: #747e74; }
.unavailable { background: #f2f3ef; color: #999f96; }
.arrow { flex-shrink: 0; color: #899282; }
.region-clear { padding: 6px 0; margin: 6px 0 0; background: transparent; color: #647667; text-align: right; font-size: 12px; line-height: 1.6; }
.region-clear::after { border: none; }
</style>
