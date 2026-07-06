<script setup>
const props = defineProps({
  files: { type: Array, default: () => [] },
})

const emit = defineEmits(['remove'])

const formatFileSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div v-if="props.files.length" class="attachment-row">
    <span
      v-for="(file, index) in props.files"
      :key="`${file.name || file.path || 'file'}-${index}`"
      class="attachment-chip"
    >
      <span>{{ file.name || file.path || '附件' }}</span>
      <small>{{ formatFileSize(file.size) }}</small>
      <button type="button" title="移除附件" @click="emit('remove', index)">x</button>
    </span>
  </div>
</template>

<style scoped>
.attachment-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-height: 70px;
  overflow-y: auto;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 260px;
  padding: 5px 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  font-size: 12px;
}

.attachment-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-chip small {
  color: var(--text-muted);
  white-space: nowrap;
  font-family: "Share Tech Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.attachment-chip button {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.2s;
}

.attachment-chip button:hover {
  color: var(--accent-red);
}

:global([data-theme="dark"]) .attachment-chip {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
