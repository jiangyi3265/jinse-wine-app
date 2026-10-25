<template>
  <PageShell title="个人资料">
    <view class="profile-edit">
      <view class="identity-block">
        <!-- #ifdef MP-WEIXIN -->
        <button class="avatar-picker" open-type="chooseAvatar" :disabled="avatarBusy || saving" @chooseavatar="chooseAvatar">
          <image :src="avatarSrc" class="profile-avatar" mode="aspectFill" />
          <view class="avatar-edit-mark">更换</view>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="avatar-picker" :disabled="avatarBusy || saving" @click="chooseAvatarFallback">
          <image :src="avatarSrc" class="profile-avatar" mode="aspectFill" />
          <view class="avatar-edit-mark">更换</view>
        </button>
        <!-- #endif -->
        <text class="identity-name">{{ name || '设置你的昵称' }}</text>
        <text class="identity-note">{{ state.user.vip ? 'VIP会员' : '金色酒业会员' }}</text>
      </view>
      <form @submit="save">
      <view class="profile-fields">
        <view class="field-row">
          <text class="field-label"><text class="required">*</text> 昵称</text>
          <input v-model="name" name="nickname" class="field-input" type="nickname" placeholder="请输入昵称" maxlength="20" aria-label="昵称" :disabled="saving" @blur="name = $event.detail.value" />
        </view>
        <view class="field-row">
          <text class="field-label">手机号码</text>
          <input v-model="phone" name="phone" class="field-input" type="number" maxlength="11" placeholder="请输入手机号码" aria-label="手机号码" :disabled="saving" @blur="phone = $event.detail.value" />
        </view>
      </view>
      <button class="btn save-button" form-type="submit" :disabled="saving || avatarBusy">
        {{ saving ? '正在保存…' : '保存资料' }}
      </button>
      </form>
      <text v-if="avatarBusy" class="profile-demo">正在上传头像</text>
    </view>
  </PageShell>
</template>
<script setup>
import { computed, ref } from 'vue'
import PageShell from '../../components/PageShell.vue'
import { state, updateAvatar, updateProfile } from '../../services/store.js'
import { back, toast } from '../../services/navigation.js'
import { assetUrl, mediaUrl } from '../../services/config.js'
const name = ref(state.user.name === '微信用户' ? '' : state.user.name || '')
const phone = ref(state.user.phone || '')
const saving = ref(false)
const avatarBusy = ref(false)
const avatarSrc = computed(() => mediaUrl(state.user.avatar) || assetUrl('/static/design/avatar.jpg', 'brand.avatar'))

async function saveAvatar(path) {
  if (!path || avatarBusy.value || saving.value) return
  avatarBusy.value = true
  try {
    await updateAvatar(path)
    toast('头像已更新')
  } catch (error) {
    toast(error.message || '头像上传失败')
  } finally {
    avatarBusy.value = false
  }
}

function chooseAvatar(event) {
  saveAvatar(event.detail?.avatarUrl)
}

function chooseAvatarFallback() {
  uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (result) => saveAvatar(result.tempFilePaths?.[0]) })
}

async function save(event) {
  if (saving.value || avatarBusy.value) return
  name.value = String(event?.detail?.value?.nickname ?? name.value).trim()
  phone.value = String(event?.detail?.value?.phone ?? phone.value).trim()
  if (!name.value) return toast('请输入昵称')
  if (phone.value && !/^1[3-9]\d{9}$/.test(phone.value)) return toast('请输入正确的11位手机号码')
  saving.value = true
  try {
    await updateProfile(name.value, phone.value)
    toast('保存成功')
    back()
  } catch (error) { toast(error.message) }
  finally { saving.value = false }
}
</script>
<style scoped>
.profile-edit { padding: 18px 18px 28px; }
.identity-block { display: flex; flex-direction: column; align-items: center; padding: 14px 0 25px; }
.avatar-picker { position: relative; width: 92px; height: 92px; padding: 0; overflow: visible; border-radius: 50%; background: transparent; }
.avatar-picker:after { border: 0; }
.profile-avatar { width: 92px; height: 92px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 3px 14px #243c3020; }
.avatar-edit-mark { position: absolute; right: -5px; bottom: -2px; padding: 3px 8px; border: 1px solid #fff; border-radius: 12px; background: #173b2d; color: #fff; font-size: 11px; line-height: 16px; }
.identity-name { max-width: 100%; margin-top: 15px; color: #202924; font-size: 18px; font-weight: 600; text-align: center; overflow-wrap: anywhere; }
.identity-note { margin-top: 4px; color: #858b83; font-size: 12px; }
.profile-fields { border-top: 1px solid #e9ebe5; }
.field-row { min-height: 58px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #e9ebe5; }
.field-label { width: 78px; flex: 0 0 78px; color: #59625a; font-size: 14px; }
.required { color: #b53434; }
.field-input, .field-value { flex: 1; min-width: 0; color: #202924; font-size: 15px; text-align: right; }
.field-value { color: #81877f; }
.save-button { width: 100%; height: 48px; margin-top: 28px !important; border-radius: 4px !important; background: #173b2d !important; color: #fff !important; font-size: 15px !important; font-weight: 600; line-height: 48px !important; }
.profile-demo { display: block; margin-top: 12px; color: #969b94; font-size: 12px; text-align: center; }
</style>
