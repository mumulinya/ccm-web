<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['navigate'])

const preview = (value, max = 80) => {
  const text = String(value || '')
  return text.slice(0, max) + (text.length > max ? '...' : '')
}
</script>

<template>
  <div v-if="props.items.length > 1" class="msg-navigator">
    <div class="msg-nav-track">
      <div
        v-for="item in props.items"
        :key="item.originalIndex"
        class="navigator-dot"
        :class="item.role"
        @click="emit('navigate', item.originalIndex)"
      >
        <div class="dot-cluster">
          <span class="dot-bar user-bar"></span>
          <span v-if="item.assistantContent" class="dot-bar assistant-bar"></span>
        </div>
        <div class="nav-tooltip-card">
          <div class="nav-tt-user">{{ preview(item.userContent || '附件内容') }}</div>
          <div v-if="item.assistantContent" class="nav-tt-assistant">{{ preview(item.assistantContent) }}</div>
          <div v-if="item.files && item.files.length" class="nav-tt-tags">
            <span v-for="file in item.files" :key="file.name || file.path">📄 {{ file.name || file.path }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="msg-nav-scrollbar">
      <div class="msg-nav-thumb"></div>
    </div>
  </div>
</template>

<style scoped>
.msg-navigator {
  position: absolute;
  right: 6px;
  top: 8px;
  bottom: 8px;
  z-index: 100;
  display: flex;
  width: 28px;
  flex-direction: column;
  overflow: hidden;
  padding: 6px 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(12px);
}

.msg-nav-track {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 2px 0;
  scrollbar-width: none;
}

.msg-nav-track::-webkit-scrollbar {
  display: none;
}

.navigator-dot {
  position: relative;
  display: flex;
  width: 24px;
  min-height: 16px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 2px 0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.navigator-dot:hover {
  transform: scale(1.1);
}

.dot-cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.dot-bar {
  display: block;
  width: 14px;
  height: 3px;
  border-radius: 999px;
}

.user-bar {
  background: var(--accent-blue, #2563eb);
}

.assistant-bar {
  background: var(--accent-green, #16a34a);
}

.nav-tooltip-card {
  position: fixed;
  right: 44px;
  z-index: 999;
  display: none;
  width: min(280px, calc(100vw - 72px));
  padding: 8px 10px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  color: var(--text-primary);
  font-size: 11px;
  line-height: 1.4;
  pointer-events: none;
}

.navigator-dot:hover .nav-tooltip-card {
  display: block;
}

.nav-tt-user,
.nav-tt-assistant {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-tt-user {
  font-weight: 800;
}

.nav-tt-assistant {
  margin-top: 3px;
  color: var(--text-secondary);
}

.nav-tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.nav-tt-tags span {
  padding: 2px 5px;
  border-radius: 5px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
}

.msg-nav-scrollbar {
  display: none;
}

:global([data-theme="dark"]) .msg-navigator {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(15, 23, 42, 0.6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

:global([data-theme="dark"]) .nav-tooltip-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.96);
}
</style>
