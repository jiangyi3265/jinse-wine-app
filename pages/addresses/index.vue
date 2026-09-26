<template>
  <PageShell title="收货地址" footer>
    <view class="section">
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
        v-if="!state.addresses.length"
        title="还没有收货地址"
        description="添加地址，开启您的品鉴之旅"
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
import { go, back, toast } from '../../services/navigation.js'
const selecting = ref(false)
onLoad((q) => {
  selecting.value = q.select === '1'
})
onShow(() => refreshDomain('addresses').catch((error) => toast(error.message)))
function select(address) {
  if (!selecting.value) return go('address-edit', { id: address.id })
  state.checkout.addressId = address.id
  persist()
  back()
}
</script>
