<script setup>
import { Bell, Bot, Info, Palette, Terminal } from '@lucide/vue'

defineProps({
  activeSection: { type: String, default: 'channels' },
  version: { type: String, default: '' }
})

const emit = defineEmits(['update:activeSection'])

const sections = [
  { key: 'channels', icon: Bell, label: '通知与渠道', description: '飞书通知和任务会话' },
  { key: 'models', icon: Bot, label: '统一大模型', description: '全局、群聊与音乐 Agent' },
  { key: 'agent-providers', icon: Terminal, label: '开发 Agent', description: 'Claude、Codex、Cursor、Gemini 与 OpenCode' },
  { key: 'experience', icon: Palette, label: '外观与刷新', description: '主题、轮询和性能' },
  { key: 'system', icon: Info, label: '系统与重置', description: '运行信息和本地偏好' }
]
</script>

<template>
  <aside class="settings-sidebar" aria-label="设置分类">
    <nav class="settings-nav">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="settings-nav-item"
        :class="{ active: activeSection === section.key }"
        :aria-current="activeSection === section.key ? 'page' : undefined"
        @click="emit('update:activeSection', section.key)"
      >
        <component :is="section.icon" :size="18" />
        <span>
          <strong>{{ section.label }}</strong>
          <small>{{ section.description }}</small>
        </span>
      </button>
    </nav>
    <span v-if="version" class="settings-version">CCM v{{ version }}</span>
  </aside>
</template>
