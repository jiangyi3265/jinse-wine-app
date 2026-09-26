<template>
  <image
    :src="iconSource"
    :style="{ width: size + 'px', height: size + 'px' }"
    class="app-icon"
    mode="aspectFit"
    aria-hidden="true"
  />
</template>
<script setup>
import { computed } from 'vue'
import { isApiMode, mediaUrl } from '../services/config.js'

const props = defineProps({
  name: { type: String, default: 'arrow' },
  tone: { type: String, default: 'ink' },
  size: { type: Number, default: 24 },
})
const iconSource = computed(() => {
  const localPath = `/static/icons/${props.name}-${props.tone}.png`
  return isApiMode() ? mediaUrl(localPath.replace('/static/', '/mini-assets/')) : localPath
})
</script>
<style scoped>
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
