<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  doc: { type: Object, default: null },
  tags: { type: Array, default: () => [] },
  newTag: { type: String, default: '' },
  scopeType: { type: String, default: 'global' },
  scopeId: { type: String, default: '' },
  visibility: { type: String, default: 'shared' },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'update:newTag', 'update:scopeType', 'update:scopeId', 'update:visibility', 'add-tag', 'remove-tag', 'save'])
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="modal-layer" @click.self="emit('close')">
      <section class="metadata-modal" role="dialog" aria-modal="true" aria-labelledby="document-metadata-title">
        <header><div><h2 id="document-metadata-title">文档范围与标签</h2><p :title="doc?.name">{{ doc?.name }}</p></div><button type="button" title="关闭" @click="emit('close')">×</button></header>
        <div class="modal-body">
          <div class="scope-grid">
            <label><span>知识范围</span><select :value="scopeType" @change="emit('update:scopeType', $event.target.value)"><option value="global">全局</option><option value="group">群聊</option><option value="project">项目</option><option value="agent">Agent</option></select></label>
            <label v-if="scopeType !== 'global'"><span>范围标识</span><input :value="scopeId" type="text" placeholder="填写群聊 ID、项目或 Agent 名称" @input="emit('update:scopeId', $event.target.value)"></label>
            <label><span>可见性</span><select :value="visibility" @change="emit('update:visibility', $event.target.value)"><option value="shared">范围内共享</option><option value="restricted">仅限定范围</option></select></label>
          </div>
          <div class="tag-section">
            <span class="field-label">标签</span>
            <div class="tag-list"><span v-for="tag in tags.filter(item => !item.startsWith('#scope:'))" :key="tag">{{ tag }}<button type="button" title="移除标签" @click="emit('remove-tag', tag)">×</button></span><i v-if="!tags.filter(item => !item.startsWith('#scope:')).length">暂无自定义标签</i></div>
            <div class="tag-input"><input :value="newTag" type="text" placeholder="新增标签" @input="emit('update:newTag', $event.target.value)" @keyup.enter="emit('add-tag')"><button type="button" @click="emit('add-tag')">添加</button></div>
          </div>
        </div>
        <footer><button type="button" class="secondary" @click="emit('close')">取消</button><button type="button" class="primary" :disabled="saving || (scopeType !== 'global' && !scopeId.trim())" @click="emit('save')">{{ saving ? '保存中' : '保存' }}</button></footer>
      </section>
    </div>
  </teleport>
</template>

<style scoped>
.modal-layer { position: fixed; inset: 0; z-index: 1210; display: grid; place-items: center; padding: 20px; background: rgba(15,23,42,.55); }.metadata-modal { width: min(500px, 100%); border: 1px solid var(--border-color, #dbe2ea); border-radius: 8px; background: var(--surface, #fff); box-shadow: 0 24px 60px rgba(15,23,42,.24); }header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 17px 19px; border-bottom: 1px solid var(--border-color, #e2e8f0); }h2 { margin: 0; color: var(--text-primary, #0f172a); font-size: 15px; letter-spacing: 0; }header p { max-width: 410px; overflow: hidden; margin: 4px 0 0; color: var(--text-secondary, #64748b); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }header > button { width: 28px; height: 28px; border: none; background: transparent; color: var(--text-secondary, #64748b); font-size: 20px; cursor: pointer; }.modal-body { display: grid; gap: 18px; padding: 19px; }.scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.scope-grid label { display: grid; gap: 5px; }.scope-grid label > span, .field-label { color: var(--text-secondary, #64748b); font-size: 10.5px; font-weight: 600; }input, select { width: 100%; height: 34px; box-sizing: border-box; padding: 0 9px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--bg-primary, #f8fafc); color: var(--text-primary, #0f172a); font: inherit; font-size: 11.5px; outline: none; }input:focus, select:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.1); }.tag-section { display: grid; gap: 7px; }.tag-list { min-height: 54px; display: flex; align-content: flex-start; flex-wrap: wrap; gap: 5px; padding: 8px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--bg-primary, #f8fafc); }.tag-list > span { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px; border: 1px solid #bfdbfe; border-radius: 4px; background: #eff6ff; color: #1d4ed8; font-size: 9.5px; }.tag-list button { padding: 0; border: none; background: transparent; color: #64748b; cursor: pointer; }.tag-list i { color: var(--text-secondary, #94a3b8); font-size: 10px; font-style: normal; }.tag-input { display: grid; grid-template-columns: 1fr auto; gap: 7px; }.tag-input button { padding: 0 12px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--surface, #fff); color: var(--text-primary, #334155); font-size: 11px; cursor: pointer; }footer { display: flex; justify-content: flex-end; gap: 8px; padding: 13px 19px; border-top: 1px solid var(--border-color, #e2e8f0); }footer button { height: 34px; padding: 0 14px; border-radius: 6px; font: inherit; font-size: 11.5px; cursor: pointer; }.secondary { border: 1px solid var(--border-color, #dbe2ea); background: transparent; color: var(--text-primary, #334155); }.primary { border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; font-weight: 600; }.primary:disabled { opacity: .5; cursor: not-allowed; }@media (max-width: 480px) { .scope-grid { grid-template-columns: 1fr; } }
</style>
