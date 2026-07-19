<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  files: { type: Array, default: () => [] },
})

const emit = defineEmits(['remove'])
const imagePreviews = ref(new Map())

const releasePreview = (url) => {
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

watch(() => props.files, (files) => {
  const previous = imagePreviews.value
  const next = new Map()
  for (const file of files || []) {
    if (!String(file?.type || '').startsWith('image/')) continue
    if (previous.has(file)) {
      next.set(file, previous.get(file))
      continue
    }
    if (typeof Blob !== 'undefined' && file instanceof Blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      next.set(file, URL.createObjectURL(file))
    }
  }
  for (const [file, url] of previous) {
    if (!next.has(file)) releasePreview(url)
  }
  imagePreviews.value = next
}, { immediate: true })

onBeforeUnmount(() => {
  for (const url of imagePreviews.value.values()) releasePreview(url)
})

const imagePreviewFor = (file) => imagePreviews.value.get(file) || ''

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
      <img v-if="imagePreviewFor(file)" :src="imagePreviewFor(file)" :alt="file.name || '粘贴的图片'">
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

.attachment-chip img {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 5px;
  object-fit: cover;
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

:global([data-theme="dark"] .attachment-chip){
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
