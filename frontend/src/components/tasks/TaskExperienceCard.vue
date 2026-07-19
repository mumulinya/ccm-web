<script setup>
import TaskExperiencePanel from './TaskExperiencePanel.vue'

defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])
</script>

<template>
  <TaskExperiencePanel
    :card="card"
    :context="context"
    :busy="busy"
    @action="emit('action', $event)"
  />
</template>
