<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  config: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])
const form = reactive({ enabled: false, apiUrl: 'https://api.openai.com/v1', model: 'text-embedding-3-small', apiKey: '', hasKey: false, clearApiKey: false })

watch(() => [props.visible, props.config], () => {
  Object.assign(form, {
    enabled: !!props.config?.enabled,
    apiUrl: props.config?.apiUrl || 'https://api.openai.com/v1',
    model: props.config?.model || 'text-embedding-3-small',
    apiKey: '',
    hasKey: !!props.config?.hasKey,
    clearApiKey: false
  })
}, { immediate: true, deep: true })

const submit = () => emit('save', {
  enabled: form.enabled,
  apiUrl: form.apiUrl.trim(),
  model: form.model.trim(),
  ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
  clearApiKey: form.clearApiKey,
  rebuild: true
})
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="modal-layer" @click.self="emit('close')">
      <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-settings-title">
        <header>
          <div><h2 id="knowledge-settings-title">知识检索设置</h2><p>向量配置仅用于语义检索，未启用时仍可使用本地混合检索。</p></div>
          <button type="button" title="关闭" @click="emit('close')">×</button>
        </header>
        <div class="settings-body">
          <label class="toggle-row">
            <input v-model="form.enabled" type="checkbox">
            <span class="toggle-control"></span>
            <span><strong>启用语义向量</strong><small>索引更新时为文档分片生成 Embedding</small></span>
          </label>
          <div class="fields" :class="{ disabled: !form.enabled }">
            <label><span>Embedding API 地址</span><input v-model="form.apiUrl" type="url" :disabled="!form.enabled"></label>
            <label><span>模型</span><input v-model="form.model" type="text" :disabled="!form.enabled"></label>
            <label><span>API Key</span><input v-model="form.apiKey" type="password" :disabled="!form.enabled" :placeholder="form.hasKey ? '已保存，留空保持不变' : '请输入 API Key'"></label>
            <label v-if="form.hasKey" class="clear-key"><input v-model="form.clearApiKey" type="checkbox" :disabled="!form.enabled"><span>清除已保存的密钥</span></label>
          </div>
          <details>
            <summary>技术说明</summary>
            <p>Embedding 接口使用 OpenAI-compatible `/embeddings` 协议。配置不可用时查询会自动回退到本地关键词与 hashing 向量，不会中断知识检索。</p>
          </details>
        </div>
        <footer><button type="button" class="secondary" @click="emit('close')">取消</button><button type="button" class="primary" :disabled="saving || (form.enabled && (!form.apiUrl.trim() || !form.model.trim() || (!form.hasKey && !form.apiKey.trim())))" @click="submit">{{ saving ? '保存并重建中' : '保存并更新索引' }}</button></footer>
      </section>
    </div>
  </teleport>
</template>

<style scoped>
.modal-layer { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 20px; background: rgba(15,23,42,.55); }
.settings-modal { width: min(560px, 100%); max-height: calc(100vh - 40px); overflow: auto; border: 1px solid var(--border-color, #dbe2ea); border-radius: 8px; background: var(--surface, #fff); box-shadow: 0 24px 60px rgba(15,23,42,.24); }
header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); }h2 { margin: 0; color: var(--text-primary, #0f172a); font-size: 16px; letter-spacing: 0; }header p { margin: 5px 0 0; color: var(--text-secondary, #64748b); font-size: 11px; }header button { width: 30px; height: 30px; border: none; background: transparent; color: var(--text-secondary, #64748b); font-size: 21px; cursor: pointer; }
.settings-body { display: grid; gap: 16px; padding: 20px; }.toggle-row { display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 9px; cursor: pointer; }.toggle-row > input { position: absolute; opacity: 0; }.toggle-control { width: 34px; height: 19px; position: relative; border-radius: 10px; background: #cbd5e1; transition: .2s; }.toggle-control::after { content: ''; position: absolute; top: 3px; left: 3px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: .2s; }.toggle-row > input:checked + .toggle-control { background: #2563eb; }.toggle-row > input:checked + .toggle-control::after { transform: translateX(15px); }.toggle-row > span:last-child { display: flex; flex-direction: column; gap: 2px; }.toggle-row strong { color: var(--text-primary, #334155); font-size: 12px; }.toggle-row small { color: var(--text-secondary, #64748b); font-size: 10.5px; }
.fields { display: grid; gap: 11px; }.fields.disabled { opacity: .55; }.fields > label:not(.clear-key) { display: grid; gap: 5px; }.fields label > span { color: var(--text-secondary, #64748b); font-size: 10.5px; font-weight: 600; }.fields input[type="url"], .fields input[type="text"], .fields input[type="password"] { width: 100%; height: 35px; box-sizing: border-box; padding: 0 10px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--bg-primary, #f8fafc); color: var(--text-primary, #0f172a); font: inherit; font-size: 12px; outline: none; }.fields input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.1); }.clear-key { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #b91c1c; }
details { border-top: 1px solid var(--border-color, #e2e8f0); }summary { padding: 11px 0 0; color: var(--text-secondary, #64748b); font-size: 10.5px; cursor: pointer; }details p { margin: 9px 0 0; color: var(--text-secondary, #64748b); font-size: 10.5px; line-height: 1.6; }
footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-color, #e2e8f0); }footer button { height: 34px; padding: 0 14px; border-radius: 6px; font: inherit; font-size: 12px; cursor: pointer; }.secondary { border: 1px solid var(--border-color, #dbe2ea); background: transparent; color: var(--text-primary, #334155); }.primary { border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; font-weight: 600; }.primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
