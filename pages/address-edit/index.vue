<template>
  <PageShell :title="form.id ? '编辑收货地址' : '新增收货地址'">
    <view class="section">
      <view class="form-row">
        <text>收货人</text>
        <input v-model="form.name" placeholder="请输入姓名" aria-label="收货人" maxlength="30" />
      </view>
      <view class="form-row">
        <text>手机号码</text>
        <input
          v-model="form.phone"
          type="number"
          maxlength="11"
          placeholder="请输入手机号码"
          aria-label="手机号码"
        />
      </view>
      <view class="form-row region-row">
        <text>所在地区</text>
        <view class="region-field">
          <RegionSelect v-model="regionPath" :disabled="saving" />
          <text v-if="form.region && !isCompleteRegion(regionPath)" class="region-hint">原地区：{{ form.region }}，请补全省市区。</text>
        </view>
      </view>
      <view class="form-row">
        <text>详细地址</text>
        <textarea
          v-model="form.detail"
          placeholder="街道、门牌号等"
          aria-label="详细地址"
          maxlength="180"
        />
      </view>
      <view class="form-row between">
        <text style="width: auto">设为默认地址</text>
        <switch
          :checked="form.isDefault"
          color="#18382d"
          @change="form.isDefault = $event.detail.value"
        />
      </view>
      <button class="btn form-actions" :disabled="saving" :loading="saving" @click="save">保存地址</button>
    </view>
  </PageShell>
</template>
<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import RegionSelect from '../../components/RegionSelect.vue'
import { resolveRegion, regionFields, isCompleteRegion } from '../../services/regions.js'
import { state, saveAddress } from '../../services/store.js'
import { back, toast } from '../../services/navigation.js'
const form = reactive({
  id: '',
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false,
})
const regionPath = ref([])
const saving = ref(false)
onLoad((q) => {
  const item = state.addresses.find((a) => String(a.id) === String(q.id))
  if (item) Object.assign(form, item)
  regionPath.value = resolveRegion(form)
})
async function save() {
  if (saving.value) return
  if (!isCompleteRegion(regionPath.value)) return toast('请选择完整的省、市、区县')
  saving.value = true
  try {
    await saveAddress({ ...form, ...regionFields(regionPath.value), region: regionPath.value.join(' ') })
    back()
  } catch (error) { toast(error.message) }
  finally { saving.value = false }
}
</script>
<style scoped>
.region-row { align-items: flex-start; }
.region-field { flex: 1; min-width: 0; }
.region-hint { display: block; margin-top: 8px; color: #947442; font-size: 12px; line-height: 1.6; }
</style>
