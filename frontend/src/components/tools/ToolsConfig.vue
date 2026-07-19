<script setup>
import ToolsConfigPanel from './ToolsConfigPanel.vue'

const emit = defineEmits(['navigate'])
</script>

<template>
  <ToolsConfigPanel @navigate="emit('navigate', $event)" />
</template>
