<template>
  <PageShell title="个人资料">
    <view class="section">
      <view class="service-intro">
        <image
          :src="displayValue(state.user.avatar, assetUrl('/static/design/avatar.jpg', 'brand.avatar'))"
          class="profile-avatar"
          style="margin: 0 auto"
          mode="aspectFill"
        />
      </view>
      <view class="form-row">
        <text>昵称</text>
        <input v-model="name" placeholder="请输入昵称" maxlength="20" aria-label="昵称" />
      </view>
      <view class="form-row">
        <text>手机号码</text>
        <text class="grow">{{ state.user.phone }}</text>
      </view>
      <button class="btn form-actions" @click="save">保存修改</button>
      <text class="profile-demo">{{ isApiMode() ? '昵称由服务端保存' : '演示资料仅保存在当前设备' }}</text>
    </view>
  </PageShell>
</template>
<script setup>
import { ref } from 'vue'
import PageShell from '../../components/PageShell.vue'
import { state, updateProfile } from '../../services/store.js'
import { back, toast } from '../../services/navigation.js'
import { displayValue, assetUrl } from '../../services/config.js'
import { isApiMode } from '../../services/config.js'
const name = ref(state.user.name)
async function save() {
  if (!name.value.trim()) return toast('昵称不能为空')
  try {
    await updateProfile(name.value)
    toast('保存成功')
    back()
  } catch (error) { toast(error.message) }
}
</script>
