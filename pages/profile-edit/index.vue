<template>
  <PageShell title="个人资料">
    <view class="section">
      <view class="service-intro">
        <image
          src="/static/design/avatar.jpg"
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
      <text class="profile-demo">演示资料仅保存在当前设备</text>
    </view>
  </PageShell>
</template>
<script setup>
import { ref } from 'vue'
import PageShell from '../../components/PageShell.vue'
import { state, persist } from '../../services/store.js'
import { back, toast } from '../../services/navigation.js'
const name = ref(state.user.name)
function save() {
  if (!name.value.trim()) return toast('昵称不能为空')
  state.user.name = name.value.trim()
  persist()
  back()
}
</script>
