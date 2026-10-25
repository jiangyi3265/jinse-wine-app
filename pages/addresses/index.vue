<template>
  <PageShell title="收货地址" footer>
    <view class="section">
      <view v-if="loading" class="address-loading" aria-label="正在加载收货地址">
        <view v-for="item in 2" :key="item" class="address-loading-card" />
      </view>
      <view v-for="address in state.addresses" :key="address.id" class="address-card">
        <button class="column" style="text-align: left; width: 100%" @click="select(address)">
          <view class="row">
            <text class="strong">{{ address.name }}　{{ address.phone }}</text>
            <text v-if="address.isDefault" class="badge badge-green">默认</text>
          </view>
          <text class="muted">{{ address.region }} {{ address.detail }}</text>
        </button>
        <view class="between">
          <button class="text-button" @click="go('address-edit', { id: address.id })">
            编辑地址
          </button>
          <button v-if="selecting" class="text-button ink" @click="select(address)">
            选择此地址
            <AppIcon name="check" :size="18" />
          </button>
        </view>
      </view>
      <EmptyState
        v-if="!loading && !state.addresses.length"
        :title="loadError ? '收货地址暂时无法加载' : '还没有收货地址'"
        :description="loadError || '添加地址，开启您的品鉴之旅'"
        :button="loadError ? '重新加载' : ''"
        @action="loadError ? loadAddresses() : undefined"
      />
    </view>
    <view class="bottom-action">
      <button class="btn" @click="go('address-edit')">＋ 新增收货地址</button>
    </view>
  </PageShell>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PageShell from '../../components/PageShell.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { state, persist, refreshDomain } from '../../services/store.js'
import { go, back } from '../../services/navigation.js'
import { isApiMode } from '../../services/config.js'
const selecting = ref(false), loading = ref(false), loadError = ref('')
onLoad((q) => {
  selecting.value = q.select === '1'
})
async function loadAddresses() {
  if (!isApiMode()) return
  loading.value = true
  loadError.value = ''
  try { await refreshDomain('addresses') }
  catch (error) { loadError.value = error.message || '收货地址暂时无法获取，请稍后重试' }
  finally { loading.value = false }
}
onShow(loadAddresses)
function select(address) {
  if (!selecting.value) return go('address-edit', { id: address.id })
  state.checkout.addressId = address.id
  persist()
  back()
}
</script>
<style scoped>
.address-loading { display: grid; gap: 12px; }
.address-loading-card { height: 108px; border: 1px solid #ece9e0; border-radius: 8px; background: linear-gradient(100deg, #f0eee8 20%, #faf9f5 38%, #f0eee8 56%); background-size: 300% 100%; animation: address-shimmer 1.4s ease-in-out infinite; }
@keyframes address-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
