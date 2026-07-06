<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  templates: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  activeIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:search-query', 'select'])

const filteredTemplates = computed(() => {
  const query = props.searchQuery.trim().toLowerCase()
  if (!query) return props.templates
  return props.templates.filter(item => String(item.name || '').toLowerCase().includes(query))
})
</script>

<template>
  <div v-if="props.open" class="template-dropdown">
    <div class="template-search">
      <input
        :value="props.searchQuery"
        placeholder="搜索对话模板..."
        class="search-input"
        @input="emit('update:search-query', $event.target.value)"
      >
    </div>
    <div class="template-list">
      <div
        v-for="(template, index) in filteredTemplates"
        :key="template.id"
        class="mention-item template-item"
        :data-id="template.id"
        :class="{ active: index === props.activeIndex }"
        @click="emit('select', template)"
      >
        <div class="template-main">
          <span class="template-icon">{{ template.icon || 'T' }}</span>
          <div class="template-copy">
            <span class="template-name">{{ template.name }}</span>
            <span class="template-desc">{{ template.description || '暂无描述' }}</span>
          </div>
        </div>
        <span class="tag template-tag">{{ template.category }}</span>
      </div>
      <div v-if="filteredTemplates.length === 0" class="template-empty">
        无匹配的模板
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 30;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(16px);
}

.template-search {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.search-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  outline: none;
  font-size: 12px;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.88);
}

.template-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12.5px;
  transition: background 0.15s ease, color 0.15s ease;
}

.mention-item:hover,
.mention-item.active {
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
}

.template-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.template-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.template-icon {
  width: 18px;
  flex: 0 0 18px;
  text-align: center;
  font-size: 14px;
}

.template-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  text-align: left;
}

.template-name {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-desc {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-tag {
  flex: 0 0 auto;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
  font-size: 9px;
}

.template-empty {
  padding: 12px;
  color: var(--text-muted);
  text-align: center;
  font-size: 11px;
}

:global([data-theme="dark"]) .template-dropdown {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.96);
}

:global([data-theme="dark"]) .search-input {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.78);
}
</style>
