<script setup>
import ProjectManagerPanel from './ProjectManagerPanel.vue'

defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated'])
</script>

<template>
  <ProjectManagerPanel :active="active" :navigate-to="navigateTo" @navigated="emit('navigated')" />
</template>
