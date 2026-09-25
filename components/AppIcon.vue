<template>
  <image
    :src="`/static/icons/${name}-${tone}.png`"
    :style="{ width: size + 'px', height: size + 'px' }"
    class="app-icon"
    mode="aspectFit"
    aria-hidden="true"
  />
</template>
<script setup>
defineProps({
  name: { type: String, default: 'arrow' },
  tone: { type: String, default: 'ink' },
  size: { type: Number, default: 24 },
})
</script>
<style scoped>
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
