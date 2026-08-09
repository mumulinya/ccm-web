<script setup>
import ProjectManagerPanel from './ProjectManagerPanel.vue'

defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated', 'switch-tab', 'set-navigation'])
</script>

<template>
  <ProjectManagerPanel
    :active="active"
    :navigate-to="navigateTo"
    @navigated="emit('navigated')"
    @switch-tab="emit('switch-tab', $event)"
    @set-navigation="emit('set-navigation', $event)"
  />
</template>
