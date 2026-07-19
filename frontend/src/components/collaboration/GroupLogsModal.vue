<script setup>
import { computed } from 'vue'
import EmptyState from '../common/EmptyState.vue'

const props = defineProps({
  groupName: { type: String, default: '' },
  logs: { type: Array, default: () => [] },
  filter: { type: String, default: '' }
})

const emit = defineEmits(['close', 'clear', 'update:filter'])

const filteredLogs = computed(() => (
  props.filter ? props.logs.filter(log => log.category === props.filter) : props.logs
))
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-logs-styled">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3 class="modal-title-gradient">📋 群聊日志 - {{ groupName }}</h3>

      <div class="modal-toolbar-row">
        <div class="select-wrapper">
          <select class="custom-select-logs" :value="filter" @change="emit('update:filter', $event.target.value)">
            <option value="">全部类别</option>
            <option value="message">💬 消息</option>
            <option value="response">🤖 响应</option>
            <option value="forward">📤 转发</option>
            <option value="error">❌ 错误</option>
          </select>
        </div>
        <div class="spacer"></div>
        <span class="total-badge">共 {{ filteredLogs.length }} 条</span>
      </div>

      <div class="group-logs-content logs-styled-body" id="logsContent">
        <div id="logsContentInner" class="logs-inner">
          <EmptyState v-if="filteredLogs.length === 0" icon="📋" title="暂无日志" />
          <div v-for="(log, index) in filteredLogs" :key="index" class="log-entry-card" :class="log.level">
            <div class="log-entry-header">
              <span class="log-badge" :class="log.level">
                <span class="log-badge-dot"></span>
                {{ log.level?.toUpperCase() }}
              </span>
              <span class="log-time">{{ new Date(log.timestamp).toLocaleString('zh-CN') }}</span>
            </div>
            <div class="log-message-body">{{ log.message }}</div>
          </div>
        </div>
      </div>

      <div class="modal-footer-row">
        <button class="btn-clear-logs" @click="emit('clear')">清空日志</button>
        <button class="btn-close-logs" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; min-width: 420px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.modal-logs-styled { min-width: 650px; max-height: 85vh; display: flex; flex-direction: column; }
.modal-title-gradient { margin: 0 0 16px; font-size: 16px; color: var(--text-primary); }
.modal-toolbar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.spacer { flex: 1; }
.custom-select-logs { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.8); color: var(--text-primary); }
.total-badge { font-size: 11px; color: var(--text-muted); padding: 4px 8px; border-radius: 999px; background: rgba(15, 23, 42, 0.05); }
.group-logs-content { flex: 1; overflow-y: auto; min-height: 220px; max-height: 52vh; padding-right: 4px; }
.logs-inner { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.log-entry-card { padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 10px; background: rgba(255,255,255,0.48); }
.log-entry-card:hover { border-color: rgba(59, 130, 246, 0.18); }
.log-entry-card.success { border-color: rgba(34,197,94,0.18); }
.log-entry-card.error { border-color: rgba(239,68,68,0.18); }
.log-entry-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.log-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; color: var(--text-muted); }
.log-badge-dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.log-time { font-size: 10.5px; color: var(--text-muted); }
.log-message-body { color: var(--text-secondary); font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.modal-footer-row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.btn-clear-logs, .btn-close-logs { padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; }
.btn-clear-logs { color: #dc2626; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); }
.btn-close-logs { color: white; background: var(--gradient-blue); border: none; }
:global([data-theme="dark"] .modal-logs-styled){ background: rgba(18, 22, 33, 0.92) !important; }
:global([data-theme="dark"] .log-entry-card){ background: rgba(255,255,255,0.04); }
:global([data-theme="dark"] .group-logs-content){ color: var(--text-secondary); }
</style>
