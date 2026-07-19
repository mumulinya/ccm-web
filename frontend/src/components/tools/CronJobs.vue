<script setup>
import CronJobsPanel from './CronJobsPanel.vue'

const emit = defineEmits(['navigate'])
</script>

<template>
  <CronJobsPanel @navigate="emit('navigate', $event)" />
</template>
