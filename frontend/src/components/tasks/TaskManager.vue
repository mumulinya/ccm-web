<script setup>
import TaskManagerPanel from './TaskManagerPanel.vue'

defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated', 'navigate'])
</script>

<template>
  <TaskManagerPanel :navigate-to="navigateTo" @navigated="emit('navigated')" @navigate="emit('navigate', $event)" />
</template>
