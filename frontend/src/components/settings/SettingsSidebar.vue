<script setup>
defineProps({
  activeSection: { type: String, default: 'feishu' }
})

const emit = defineEmits(['update:activeSection'])

const sections = [
  { key: 'feishu', icon: '🔔', label: '飞书机器人' },
  { key: 'agent', icon: '🤖', label: '群聊主 Agent 模型' },
  { key: 'perf', icon: '🎨', label: '个性化与体验' },
  { key: 'system', icon: 'ℹ️', label: '系统信息及重置' },
]
</script>

<template>
  <div class="settings-sidebar">
    <div class="sidebar-header">
      <h3>⚙️ 系统控制台</h3>
      <span class="version-tag">v1.0.8</span>
    </div>
    <div class="nav-list">
      <button
        v-for="section in sections"
        :key="section.key"
        class="nav-item"
        :class="{ active: activeSection === section.key }"
        @click="emit('update:activeSection', section.key)"
      >
        <span class="nav-icon">{{ section.icon }}</span>
        <span class="nav-label">{{ section.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-sidebar { background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 16px; padding: 16px; height: fit-content; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sidebar-header h3 { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.version-tag { font-size: 10px; color: var(--text-muted); padding: 2px 6px; background: rgba(0, 0, 0, 0.04); border-radius: 4px; }
.nav-list { display: flex; flex-direction: column; gap: 6px; }
.nav-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; border-radius: 10px; background: transparent; color: var(--text-secondary); cursor: pointer; text-align: left; transition: all 0.2s; }
.nav-item:hover { background: rgba(59, 130, 246, 0.05); color: var(--text-primary); }
.nav-item.active { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); font-weight: 700; }
.nav-icon { width: 20px; text-align: center; }
.nav-label { font-size: 12.5px; }
:global([data-theme="dark"]) .settings-sidebar { background: rgba(10, 10, 20, 0.38); border-color: rgba(255,255,255,0.06); }
</style>
