<script setup>
import { AlertTriangle, Check, Clock3, X } from '@lucide/vue'

const props = defineProps({
  preview: { type: Object, required: true },
  selectedIds: { type: Array, default: () => [] },
  confirmationText: { type: String, default: '' },
  running: { type: Boolean, default: false },
})

defineEmits(['toggle', 'toggle-all', 'update:confirmation-text', 'close', 'execute'])

const formatDate = (value) => {
  if (!value) return '时间未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false })
}

const allSelected = () => props.preview.preview?.items?.length > 0 && props.selectedIds.length === props.preview.preview.items.length
const canExecute = () => props.selectedIds.length > 0
  && (!props.preview.action.irreversible || props.confirmationText.trim() === '永久删除')
  && !props.running
</script>

<template>
  <section class="cleanup-preview" :class="{ danger: preview.action.irreversible }">
    <div class="cleanup-section-head">
      <div class="cleanup-preview-heading">
        <span class="head-icon">
          <AlertTriangle v-if="preview.action.irreversible" :size="17" />
          <Check v-else :size="17" />
        </span>
        <div>
          <h3>{{ preview.action.label }}</h3>
          <p>{{ preview.preview.note }}</p>
        </div>
      </div>
      <button type="button" class="cleanup-icon-button" title="关闭预览" @click="$emit('close')">
        <X :size="16" />
      </button>
    </div>

    <div class="cleanup-preview-meta font-mono">
      <span><Clock3 :size="13" /> 有效期至 {{ formatDate(preview.expires_at) }}</span>
      <strong>已选 {{ selectedIds.length }} / {{ preview.preview.items.length }} 项</strong>
    </div>

    <label v-if="preview.preview.items.length" class="cleanup-check-row select-all">
      <input type="checkbox" :checked="allSelected()" @change="$emit('toggle-all')">
      <span>选择全部预览结果 ({{ preview.preview.items.length }})</span>
    </label>

    <div v-if="preview.preview.items.length" class="cleanup-preview-list">
      <label v-for="item in preview.preview.items" :key="item.id" class="cleanup-check-row">
        <input type="checkbox" :checked="selectedIds.includes(item.id)" @change="$emit('toggle', item.id)">
        <span class="cleanup-preview-item">
          <strong>{{ item.title }}</strong>
          <small class="font-mono">{{ item.project || '未关联项目' }} · {{ formatDate(item.updated_at) }}</small>
        </span>
      </label>
    </div>
    <div v-else class="cleanup-empty">当前保留范围内没有可处理的数据</div>

    <div v-if="preview.action.irreversible && preview.preview.items.length" class="cleanup-confirmation">
      <label for="cleanup-confirmation-input">
        <AlertTriangle :size="14" />
        <span>输入“永久删除”以二次确认本次操作</span>
      </label>
      <input
        id="cleanup-confirmation-input"
        :value="confirmationText"
        autocomplete="off"
        placeholder="永久删除"
        class="confirm-input"
        @input="$emit('update:confirmation-text', $event.target.value)"
      >
    </div>

    <div class="cleanup-preview-actions">
      <button type="button" class="cleanup-button" @click="$emit('close')">取消</button>
      <button
        type="button"
        class="cleanup-button"
        :class="preview.action.irreversible ? 'danger-filled' : 'primary'"
        :disabled="!canExecute()"
        @click="$emit('execute')"
      >
        <span>{{ running ? '正在处理...' : preview.action.irreversible ? `永久删除 ${selectedIds.length} 项` : `归档 ${selectedIds.length} 项` }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.confirm-input {
  width: 100%;
  height: 34px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--accent-red) 40%, var(--border-color));
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: all 0.15s ease;
}

.confirm-input:focus {
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-red) 15%, transparent);
}
</style>
