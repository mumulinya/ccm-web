<script setup>
import { FileImage, FileText, Paperclip, Upload, X } from '@lucide/vue'

const props = defineProps({
  files: { type: Array, default: () => [] },
  existing: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:files', 'remove-existing'])

const formatSize = (value) => {
  const bytes = Math.max(0, Number(value || 0))
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const identity = (file) => `${file.name}:${file.size}:${file.lastModified || 0}`
const appendFiles = (incoming) => {
  const rows = Array.from(incoming || []).filter(file => file && file.name)
  const existingKeys = new Set(props.files.map(identity))
  const next = [...props.files]
  for (const file of rows) {
    if (next.length + props.existing.length >= 10) break
    if (file.size > 25 * 1024 * 1024 || existingKeys.has(identity(file))) continue
    existingKeys.add(identity(file))
    next.push(file)
  }
  emit('update:files', next)
}

const selectFiles = (event) => {
  appendFiles(event.target.files)
  event.target.value = ''
}

const dropFiles = (event) => appendFiles(event.dataTransfer?.files)
const removeFile = (index) => emit('update:files', props.files.filter((_, itemIndex) => itemIndex !== index))

defineExpose({ appendFiles })
</script>

<template>
  <section class="task-attachment-picker" @dragover.prevent @drop.prevent="dropFiles">
    <input ref="fileInput" class="task-attachment-input" type="file" multiple @change="selectFiles">
    <div class="task-attachment-dropzone">
      <span class="task-attachment-icon"><Paperclip :size="17" /></span>
      <div>
        <strong>任务附件</strong>
        <small>拖放文件到这里，也可以在任务弹窗内直接粘贴图片或文件</small>
      </div>
      <button type="button" class="task-attachment-button" @click="$refs.fileInput.click()"><Upload :size="14" />选择文件</button>
    </div>
    <div v-if="existing.length || files.length" class="task-attachment-list">
      <article v-for="item in existing" :key="`existing-${item.id}`" class="task-attachment-row">
        <FileImage v-if="item.type === 'image'" :size="16" />
        <FileText v-else :size="16" />
        <span><strong>{{ item.name }}</strong><small>{{ formatSize(item.size) }} · {{ item.readable ? '已解析' : item.status === 'failed' ? '解析失败，执行时按原文件核验' : '已保存' }}</small></span>
        <button type="button" title="移除附件" aria-label="移除附件" @click="emit('remove-existing', item.id)"><X :size="14" /></button>
      </article>
      <article v-for="(file, index) in files" :key="identity(file)" class="task-attachment-row pending">
        <FileImage v-if="file.type?.startsWith('image/')" :size="16" />
        <FileText v-else :size="16" />
        <span><strong>{{ file.name }}</strong><small>{{ formatSize(file.size) }} · 保存时解析</small></span>
        <button type="button" title="移除附件" aria-label="移除附件" @click="removeFile(index)"><X :size="14" /></button>
      </article>
    </div>
    <small class="task-attachment-limit">最多 10 个，单文件 25 MB，总计 60 MB；支持图片、PDF、Office、文本和代码文件。</small>
  </section>
</template>

<style scoped>
.task-attachment-picker{display:grid;gap:8px}.task-attachment-input{display:none}.task-attachment-dropzone{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border:1px dashed var(--border-color);border-radius:7px;background:color-mix(in srgb,var(--accent-blue) 3%,var(--surface))}.task-attachment-dropzone:hover{border-color:color-mix(in srgb,var(--accent-blue) 55%,var(--border-color))}.task-attachment-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:6px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface));color:var(--accent-blue)}.task-attachment-dropzone strong,.task-attachment-row strong{display:block;color:var(--text-primary);font-size:11.5px;line-height:1.4}.task-attachment-dropzone small,.task-attachment-row small,.task-attachment-limit{display:block;color:var(--text-muted);font-size:10px;line-height:1.45}.task-attachment-button{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 9px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-secondary);font-size:10.5px;font-weight:700;cursor:pointer}.task-attachment-list{display:grid;gap:6px}.task-attachment-row{display:grid;grid-template-columns:20px minmax(0,1fr) 28px;gap:7px;align-items:center;padding:7px 8px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--accent-blue)}.task-attachment-row.pending{border-style:dashed}.task-attachment-row>button{width:26px;height:26px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;color:var(--text-muted);cursor:pointer}.task-attachment-row>button:hover{background:var(--bg-secondary);color:var(--accent-red)}.task-attachment-limit{margin:0 2px}@media(max-width:620px){.task-attachment-dropzone{grid-template-columns:32px minmax(0,1fr)}.task-attachment-button{grid-column:1/-1;justify-content:center;width:100%}}
</style>
