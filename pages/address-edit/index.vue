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
      <view class="form-row">
        <text>所在地区</text>
        <input
          v-model="form.region"
          placeholder="省 / 市 / 区"
          aria-label="所在地区"
          maxlength="80"
        />
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
      <button class="btn form-actions" @click="save">保存地址</button>
    </view>
  </PageShell>
</template>
<script setup>
import { reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
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
onLoad((q) => {
  const item = state.addresses.find((a) => a.id === q.id)
  if (item) Object.assign(form, item)
})
async function save() {
  try {
    await saveAddress({ ...form })
    back()
  } catch (error) { toast(error.message) }
}
</script>
