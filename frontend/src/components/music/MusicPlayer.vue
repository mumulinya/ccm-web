<script setup>
import MusicPlayerPanel from './MusicPlayerPanel.vue'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' },
  active: { type: Boolean, default: true },
})
</script>

<template>
  <MusicPlayerPanel :agent-label="props.agentLabel" :active="props.active" />
</template>
