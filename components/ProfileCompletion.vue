<template>
  <view v-if="pageActive && profileCompletion.visible" class="identity-mask" @touchmove.stop.prevent>
    <view class="identity-sheet" role="dialog" aria-label="完善会员资料" @click.stop>
      <text class="identity-title">完善会员资料</text>
      <text class="identity-description">选择微信头像并填写昵称，保存到你的会员账号</text>
      <form @submit="save">
        <!-- #ifdef MP-WEIXIN -->
        <button class="identity-avatar-button" open-type="chooseAvatar" :disabled="saving" @chooseavatar="chooseAvatar">
          <image class="identity-avatar" :src="avatarSrc" mode="aspectFill" />
          <text>{{ avatarPath || profileCompletion.user?.avatar ? '更换头像' : '选择微信头像' }}</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="identity-avatar-button" :disabled="saving" @click="chooseImage">
          <image class="identity-avatar" :src="avatarSrc" mode="aspectFill" />
          <text>选择头像</text>
        </button>
        <!-- #endif -->
        <view class="identity-name-row">
          <text>昵称</text>
          <input name="nickname" type="nickname" :value="name" :disabled="saving" maxlength="20" placeholder="点击填写微信昵称" @input="name = $event.detail.value" @blur="name = $event.detail.value" />
        </view>
        <text v-if="error" class="identity-error">{{ error }}</text>
        <button class="identity-save" form-type="submit" :disabled="saving">{{ saving ? '正在保存…' : '保存资料' }}</button>
      </form>
      <button class="identity-later" :disabled="saving" @click="dismissProfileCompletion">暂时跳过</button>
      <text class="identity-footnote">稍后也可在“我的 → 个人资料”中修改</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { profileCompletion, dismissProfileCompletion } from '../services/profile-completion.js'
import { updateAvatar, updateProfile } from '../services/store.js'
import { assetUrl, mediaUrl } from '../services/config.js'
import { toast } from '../services/navigation.js'

const pageActive = ref(true)
const name = ref('')
const avatarPath = ref('')
const saving = ref(false)
const error = ref('')
const avatarSrc = computed(() => avatarPath.value || mediaUrl(profileCompletion.user?.avatar) || assetUrl('/static/design/avatar.jpg', 'brand.avatar'))
onShow(() => { pageActive.value = true })
onHide(() => { pageActive.value = false })
watch(() => profileCompletion.user, (user) => {
  name.value = user?.name === '微信用户' ? '' : user?.name || ''
  avatarPath.value = ''
  error.value = ''
}, { immediate: true })

function chooseAvatar(event) {
  if (event.detail?.avatarUrl && !saving.value) {
    avatarPath.value = event.detail.avatarUrl
    error.value = ''
  }
}
function chooseImage() {
  uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album'], success: result => {
    if (result.tempFilePaths?.[0]) avatarPath.value = result.tempFilePaths[0]
  } })
}
async function save(event) {
  if (saving.value) return
  name.value = String(event.detail?.value?.nickname ?? name.value).trim()
  if (!name.value) { error.value = '请填写昵称'; return }
  if (!avatarPath.value && !profileCompletion.user?.avatar) { error.value = '请选择头像'; return }
  saving.value = true
  error.value = ''
  try {
    if (avatarPath.value) {
      const user = await updateAvatar(avatarPath.value)
      profileCompletion.user.avatar = user.avatar
      avatarPath.value = ''
    }
    await updateProfile(name.value)
    dismissProfileCompletion()
    toast('昵称和头像已保存')
  } catch (failure) {
    error.value = failure.message || '保存失败，请重试'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.identity-mask { position: fixed; inset: 0; z-index: 1500; display: flex; align-items: flex-end; justify-content: center; background: rgba(0, 0, 0, .48); }
.identity-sheet { box-sizing: border-box; width: 100%; max-width: 560px; padding: 26px 24px calc(20px + env(safe-area-inset-bottom)); border-radius: 22px 22px 0 0; background: #fffdf8; }
.identity-title { display: block; color: #18382c; font-size: 21px; font-weight: 600; }
.identity-description { display: block; margin-top: 8px; color: #777b72; font-size: 13px; line-height: 1.6; }
.identity-avatar-button { display: flex; flex-direction: column; align-items: center; width: 150px; margin: 22px auto 16px; padding: 0; background: transparent; color: #496353; font-size: 13px; line-height: 2.3; }
.identity-avatar-button::after, .identity-later::after { border: 0; }
.identity-avatar { width: 78px; height: 78px; border-radius: 50%; background: #eeeee6; }
.identity-name-row { display: flex; align-items: center; gap: 20px; padding: 17px 0; border-top: 1px solid #e9e8df; border-bottom: 1px solid #e9e8df; color: #354337; font-size: 15px; }
.identity-name-row input { flex: 1; min-width: 0; text-align: right; font-size: 15px; }
.identity-save { margin-top: 22px; border-radius: 8px; background: #173b2d; color: #fff; font-size: 16px; line-height: 48px; }
.identity-later { margin-top: 8px; background: transparent; color: #777b72; font-size: 14px; line-height: 40px; }
.identity-footnote { display: block; text-align: center; color: #96998e; font-size: 12px; }
.identity-error { display: block; margin-top: 12px; color: #b34433; font-size: 13px; }
</style>
