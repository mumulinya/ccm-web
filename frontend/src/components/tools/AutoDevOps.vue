<script setup>
import AutoDevOpsPanel from './AutoDevOpsPanel.vue'

const emit = defineEmits(['navigate'])
</script>

<template>
  <AutoDevOpsPanel @navigate="emit('navigate', $event)" />
</template>
