<script setup>
import { computed } from 'vue'
import { Bell, Bot, FlaskConical, Info, Palette, ShieldCheck, Terminal } from '@lucide/vue'

const props = defineProps({
  activeSection: { type: String, default: 'channels' },
  version: { type: String, default: '' },
  role: { type: String, default: 'viewer' },
  features: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:activeSection'])

const allSections = [
  { key: 'channels', icon: Bell, label: '通知与渠道', description: '飞书通知和任务会话' },
  { key: 'models', icon: Bot, label: '统一大模型', description: '全局、群聊与音乐 Agent' },
  { key: 'agent-providers', icon: Terminal, label: '开发 Agent', description: 'Claude、Codex、Cursor、Gemini 与 OpenCode' },
  { key: 'test-agent', icon: FlaskConical, label: 'TestAgent', description: '独立验收与主 Agent 自验' },
  { key: 'experience', icon: Palette, label: '外观与刷新', description: '主题、轮询和性能' },
  { key: 'security', icon: ShieldCheck, label: '账户与安全', description: '登录、注册和密码' },
  { key: 'system', icon: Info, label: '系统与重置', description: '运行信息和本地偏好' }
]
const platformSections = new Set(['channels', 'models', 'agent-providers', 'test-agent', 'system'])
const sections = computed(() => props.role === 'admin'
  ? allSections
  : allSections.filter(section => ['experience', 'security'].includes(section.key) || (platformSections.has(section.key) && props.features.includes('platform_settings'))))
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
