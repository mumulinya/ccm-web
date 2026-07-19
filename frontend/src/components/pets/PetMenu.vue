<script setup>
import PetMenuPanel from './PetMenuPanel.vue'

defineProps({
  agents: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['agents-updated'])
</script>

<template>
  <PetMenuPanel
    :active="active"
    :agents="agents"
    :projects="projects"
    @agents-updated="emit('agents-updated')"
  />
</template>
