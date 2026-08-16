<script setup>
import { ChevronDown, ChevronRight, LoaderCircle, Search } from '@lucide/vue'

defineProps({
  group: { type: Object, required: true },
})
defineEmits(['toggle'])
</script>

<template>
  <button
    type="button"
    class="cc-read-search-head"
    :class="{ running: group.running, failed: group.failed }"
    :aria-expanded="group.expanded"
    @click="$emit('toggle', group)"
  >
    <span class="cc-read-search-status">
      <LoaderCircle v-if="group.running" :size="12" />
      <Search v-else :size="12" />
    </span>
    <strong>{{ group.label }}</strong>
    <small>{{ group.children?.length || 0 }} 项</small>
    <span class="cc-read-search-chevron">
      <ChevronDown v-if="group.expanded" :size="13" />
      <ChevronRight v-else :size="13" />
    </span>
  </button>
</template>

<style scoped>
.cc-read-search-head {
  width: calc(100% - 12px);
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 7px;
  margin: 0 0 4px 12px;
  padding: 5px 4px;
  border: 0;
  border-radius: 5px;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.cc-read-search-head:hover { background: rgba(100, 116, 139, .035); }
.cc-read-search-head strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-read-search-head small { color: var(--text-muted); font-size: 9px; white-space: nowrap; }
.cc-read-search-status,
.cc-read-search-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #15803d;
}
.cc-read-search-head.running .cc-read-search-status { color: #2563eb; }
.cc-read-search-head.failed .cc-read-search-status { color: #dc2626; }
.cc-read-search-chevron { color: var(--text-muted); }
</style>
