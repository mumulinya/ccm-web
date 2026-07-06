<script setup>
defineProps({
  groupName: { type: String, default: '' },
  tools: { type: Object, default: () => ({ mcp: [], skill: [] }) }
})

const emit = defineEmits(['close', 'save'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal resource-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>🔧 群聊工具配置 - {{ groupName }}</h3>
      <div class="modal-desc">配置此群聊可用的工具</div>
      <div class="resource-body">
        <div class="resource-section-title">🔌 MCP 服务器</div>
        <div v-for="tool in tools.mcp" :key="tool" class="resource-row">
          <input type="checkbox" :checked="true">
          <span>🔌</span>
          <span>{{ tool }}</span>
        </div>
        <div v-if="tools.mcp.length === 0" class="resource-empty">暂无配置</div>

        <div class="resource-section-title spaced">⚡ Skills</div>
        <div v-for="tool in tools.skill" :key="tool" class="resource-row">
          <input type="checkbox" :checked="true">
          <span>⚡</span>
          <span>{{ tool }}</span>
        </div>
        <div v-if="tools.skill.length === 0" class="resource-empty">暂无配置</div>
      </div>
      <div class="resource-footer">
        <button class="btn btn-cancel" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="emit('save')">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; min-width: 420px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.resource-modal { min-width: 500px; max-height: 80vh; display: flex; flex-direction: column; }
.modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.modal-desc, .resource-empty { font-size: 12px; color: var(--text-muted); }
.modal-desc { margin-bottom: 16px; }
.resource-body { flex: 1; overflow-y: auto; }
.resource-section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }
.resource-section-title.spaced { margin-top: 16px; }
.resource-row { display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 6px; color: var(--text-secondary); }
.resource-row input { accent-color: var(--accent-blue); }
.resource-empty { padding: 8px; }
.resource-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-cancel { background: transparent; border: 1px solid rgba(0,0,0,0.08); color: var(--text-secondary); }
</style>
