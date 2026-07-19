<script setup>
import MusicPlayerPanel from './MusicPlayerPanel.vue'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' }
})
</script>

<template>
  <MusicPlayerPanel :agent-label="props.agentLabel" />
</template>
