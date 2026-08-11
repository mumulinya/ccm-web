<script setup>
import CronJobsPanel from './CronJobsPanel.vue'

defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigate', 'navigated'])
</script>

<template>
  <CronJobsPanel :navigate-to="navigateTo" @navigate="emit('navigate', $event)" @navigated="emit('navigated')" />
</template>
