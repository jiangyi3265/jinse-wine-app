<template>
  <PageShell title="我的" dark brand left active="profile" :back-button="false">
    <view v-if="profileLoading" class="profile-loading" aria-label="正在加载个人中心">
      <view class="profile-loading-hero">
        <view class="profile-loading-avatar" />
        <view class="profile-loading-copy"><view class="profile-loading-line profile-loading-line--name" /><view class="profile-loading-line profile-loading-line--badge" /></view>
        <view class="profile-loading-slogan" />
        <view class="profile-loading-stats"><view v-for="item in 3" :key="item" class="profile-loading-stat" /></view>
      </view>
      <view class="profile-loading-section"><view class="profile-loading-heading" /><view class="profile-loading-order" /><view class="profile-loading-banner" /><view v-for="item in 4" :key="item" class="profile-loading-link" /></view>
    </view>
    <view v-else-if="profileError" class="profile-error section">
      <AppIcon name="info" tone="gold" :size="30" />
      <text class="section-title serif">个人资料暂时无法加载</text>
      <text class="muted center">{{ profileError }}</text>
      <button class="btn" @click="loadProfile">重新加载</button>
    </view>
    <view v-if="!profileLoading && !profileError" class="profile-hero">
      <button class="row profile-identity" @click="handleIdentityClick">
        <image v-if="signedIn"
          :src="avatarSrc"
          class="profile-avatar"
          mode="aspectFill"
          @error="handleAvatarError"
        />
        <view v-else class="profile-avatar guest-avatar"><AppIcon name="user" tone="light" :size="36" /></view>
        <view class="column profile-identity-copy">
          <text class="profile-name">{{ signedIn ? (state.user.name === '微信用户' ? '请完善昵称' : state.user.name || '请完善昵称') : '请登录系统' }}</text>
          <text class="member-badge" :class="{ 'member-badge--standard': !state.user.vip }">{{ signedIn ? (state.user.vip ? 'VIP会员' : '普通会员') : '登录后查看会员权益' }}　›</text>
        </view>
      </button>
      <view v-if="!signedIn" class="guest-login-hint">
        <view class="grow">
          <text class="guest-login-title">微信账号登录</text>
        </view>
        <button class="guest-login-button" :disabled="loginBusy" @click="handleLogin">{{ loginBusy ? '正在登录' : '微信授权登录' }}</button>
      </view>
      <text class="profile-slogan">品味时光 · 金色相伴</text>
      <view class="profile-stats">
        <button class="profile-stat" @click="signedIn ? go('points') : handleLogin()">
          <text class="number">{{ domainReady.points ? state.points.toLocaleString() : '—' }}</text>
          <text class="label">积分</text>
        </button>
        <button class="profile-stat" @click="signedIn ? go('my-coupons') : handleLogin()">
          <text class="number">{{ domainReady.coupons ? unused : '—' }}</text>
          <text class="label">优惠券</text>
        </button>
        <button class="profile-stat" @click="signedIn ? go('awards') : handleLogin()">
          <text class="number">{{ domainReady.awards ? state.awardTotal ?? state.awards.length : '—' }}</text>
          <text class="label">我的奖品</text>
        </button>
      </view>
    </view>
    <view v-if="!profileLoading && !profileError && partialError" class="profile-refresh">
      <text>部分资产数据暂不可用</text>
      <button class="text-button" @click="loadProfile">重新加载</button>
    </view>
    <view v-if="!profileLoading && !profileError" class="profile-content">
      <view class="section-heading">
        <text class="section-title serif">我的订单</text>
        <button class="text-button muted" @click="signedIn ? go('orders') : handleLogin()">
          全部
          <AppIcon name="arrow" :size="18" />
        </button>
      </view>
      <view v-if="signedIn" class="order-shortcuts">
        <button
          v-for="item in orderLinks"
          :key="item.status"
          @click="go('orders', { status: item.status })"
        >
          <AppIcon :name="item.icon" :size="29" />
          <text>{{ item.name }}</text>
        </button>
      </view>
      <button class="vip-banner" @click="signedIn ? go('vip') : handleLogin()">
        <view>
          <text class="serif block">VIP社群</text>
          <text class="small">与知味之人，共赴佳酿之约</text>
        </view>
        <text class="small">查看会员活动 →</text>
      </button>
      <button
        v-for="item in entries"
        :key="item.name"
        class="link-row"
        @click="signedIn || ['stores', 'service'].includes(item.route) ? go(item.route, item.query || {}) : handleLogin()"
      >
        <view class="grow">
          <AppIcon :name="item.icon" :size="20" />
          <text>{{ item.name }}</text>
        </view>
        <AppIcon name="chevron" :size="16" />
      </button>
      <button v-if="signedIn && state.user.role === 'staff'" class="link-row" @click="go('verification')">
        <view class="grow">
          <AppIcon name="bag" :size="20" />
          <text>门店核销</text>
        </view>
        <AppIcon name="chevron" :size="16" />
      </button>
    </view>
  </PageShell>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import { state, refreshDomain } from '../../services/store.js'
import { go, toast } from '../../services/navigation.js'
import { assetUrl, mediaUrl } from '../../services/config.js'
import { hasSession, login } from '../../services/api.js'
import { offerProfileCompletion } from '../../services/profile-completion.js'
const fallbackAvatar = assetUrl('/static/design/avatar.jpg', 'brand.avatar')
const avatarSrc = ref(fallbackAvatar)
const profileLoading = ref(true)
const profileError = ref('')
const signedIn = ref(hasSession())
const loginBusy = ref(false)
const domainReady = ref({ points: true, coupons: true, awards: true })
let profileTask
function syncAvatar() {
  avatarSrc.value = signedIn.value ? mediaUrl(state.user.avatar) || fallbackAvatar : fallbackAvatar
}
watch(() => state.user.avatar, syncAvatar)
function handleAvatarError() {
  if (avatarSrc.value !== fallbackAvatar) avatarSrc.value = fallbackAvatar
}
const unused = computed(
  () => state.coupons.filter((c) => c.status === 'unused' && c.expiresAt > Date.now()).length,
)
const partialError = computed(() => signedIn.value && Object.values(domainReady.value).some((ready) => !ready))
async function loadProfile() {
  if (profileTask) return profileTask
  profileTask = (async () => {
    profileLoading.value = true
    profileError.value = ''
    signedIn.value = hasSession()
    if (!signedIn.value) {
      domainReady.value = { points: false, coupons: false, awards: false }
      syncAvatar()
      profileLoading.value = false
      return
    }
    const domains = ['user', 'points', 'coupons', 'awards']
    const results = await Promise.allSettled(domains.map((domain) => refreshDomain(domain,
      domain === 'awards' ? { pageNum: 1, pageSize: 20 } : undefined)))
    if (results[0].status === 'rejected') {
      profileError.value = results[0].reason?.message || '请稍后重试'
    } else {
      domainReady.value = Object.fromEntries(domains.slice(1).map((domain, index) => [domain, results[index + 1].status === 'fulfilled']))
      syncAvatar()
    }
    profileLoading.value = false
  })().finally(() => { profileTask = null })
  return profileTask
}
async function handleLogin() {
  if (loginBusy.value) return
  loginBusy.value = true
  try {
    const result = await login()
    if (result?.user) Object.assign(state.user, result.user)
    signedIn.value = true
    await loadProfile()
  } catch (error) {
    signedIn.value = hasSession()
    profileError.value = ''
    toast(error.message || '登录暂时不可用，请稍后重试')
  }
  finally { loginBusy.value = false }
}
function handleIdentityClick() {
  if (signedIn.value && (!state.user.avatar || !state.user.name || state.user.name === '微信用户')) offerProfileCompletion(state.user, true)
  else if (signedIn.value) go('profile-edit')
  else handleLogin()
}
onShow(loadProfile)
const orderLinks = [
  { status: 'pending', icon: 'wallet', name: '待付款' },
  { status: 'paid', icon: 'truck', name: '待发货' },
  { status: 'receiving', icon: 'box', name: '待收货' },
  { status: 'complete', icon: 'order', name: '已完成' },
]
const entries = [
  {
    name: '抽奖记录',
    route: 'records',
    query: { type: 'draw' },
    icon: 'gift',
  },
  { name: '推广中心', route: 'promotion', icon: 'navigation' },
  { name: '兑换网点', route: 'stores', icon: 'pin' },
  { name: '收货地址', route: 'addresses', icon: 'box' },
  { name: '在线客服', route: 'service', icon: 'headset' },
]
</script>

<style scoped>
.profile-loading { min-height: calc(100vh - 44px); background: #fafaf7; }
.profile-loading-hero { min-height: 272px; padding: 26px 20px 0; background: #102b22; }
.profile-loading-avatar, .profile-loading-line, .profile-loading-slogan, .profile-loading-stat, .profile-loading-heading, .profile-loading-order, .profile-loading-banner, .profile-loading-link { background: linear-gradient(100deg, rgba(255,255,255,.1) 20%, rgba(255,255,255,.22) 40%, rgba(255,255,255,.1) 60%); background-size: 300% 100%; animation: profile-skeleton-shimmer 1.4s ease-in-out infinite; }
.profile-loading-avatar { width: 70px; height: 70px; border-radius: 50%; opacity: .65; }
.profile-loading-copy { position: absolute; left: 110px; margin-top: -62px; }
.profile-loading-line { height: 15px; border-radius: 8px; }
.profile-loading-line--name { width: 120px; }
.profile-loading-line--badge { width: 74px; height: 12px; margin-top: 12px; }
.profile-loading-slogan { width: 170px; height: 13px; margin-top: 30px; opacity: .65; }
.profile-loading-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 32px; }
.profile-loading-stat { height: 52px; opacity: .45; }
.profile-loading-section { padding: 20px 18px; }
.profile-loading-heading { width: 54%; height: 22px; background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; }
.profile-loading-order, .profile-loading-banner, .profile-loading-link { height: 72px; margin-top: 18px; border-radius: 8px; background: linear-gradient(100deg, #eeeae1 20%, #f8f5ee 38%, #eeeae1 56%); background-size: 300% 100%; }
.profile-loading-banner { height: 80px; }
.profile-loading-link { height: 48px; margin-top: 10px; border-radius: 0; border-bottom: 1px solid #e8ece7; }
.profile-error { display: flex; min-height: 520px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.profile-error .btn { width: 100%; margin-top: 8px; }
.guest-login-hint { display: flex; align-items: center; gap: 14px; margin: 14px 18px 0; padding: 14px 16px; background: #fff8e9; border: 1px solid #f0dfb8; border-radius: 8px; }
.guest-login-title { display: block; color: #2f3d34; font-size: 14px; font-weight: 600; }
.guest-avatar { display: flex; align-items: center; justify-content: center; background: #59645e; }
.profile-identity { width: 100%; text-align: left; }
.profile-identity .profile-avatar { flex: 0 0 78px; }
.profile-identity-copy { flex: 1; min-width: 0; }
.profile-identity .profile-name { max-width: 100%; overflow-wrap: anywhere; white-space: normal; }
.guest-login-button { flex: 0 0 auto; min-width: 78px; padding: 8px 12px; background: #b78a45; border-radius: 5px; color: #fff; font-size: 13px; line-height: 1.3; }
.profile-refresh { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 8px 18px; background: #fff5de; color: #724820; font-size: 12px; }
.profile-refresh .text-button { flex: 0 0 auto; color: #73441d; font-size: 12px; }
@keyframes profile-skeleton-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
