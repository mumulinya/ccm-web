<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  uploading: { type: Boolean, default: false },
  importingUrl: { type: Boolean, default: false },
  pathAdding: { type: Boolean, default: false },
  watchPaths: { type: Array, default: () => [] }
})

const emit = defineEmits(['upload', 'import-url', 'add-path', 'remove-path'])

const tab = ref('file')
const fileInput = ref(null)
const isDragging = ref(false)
const scopeType = ref('global')
const scopeId = ref('')
const visibility = ref('shared')
const tags = ref('')
const onlineUrl = ref('')
const onlineTitle = ref('')
const watchPath = ref('')

const scopeNeedsId = computed(() => scopeType.value !== 'global')
const scopeValid = computed(() => !scopeNeedsId.value || scopeId.value.trim())

const options = () => ({
  scopeType: scopeType.value,
  scopeId: scopeId.value.trim(),
  visibility: visibility.value,
  tags: tags.value.split(/[,，]/).map(item => item.trim()).filter(Boolean)
})

const selectFiles = files => {
  if (!files?.length || !scopeValid.value) return
  emit('upload', { files: Array.from(files), options: options() })
}

const submitUrl = () => {
  if (!onlineUrl.value.trim() || !scopeValid.value) return
  emit('import-url', { url: onlineUrl.value.trim(), title: onlineTitle.value.trim(), ...options() })
}

const submitPath = () => {
  if (!watchPath.value.trim()) return
  emit('add-path', watchPath.value.trim())
  watchPath.value = ''
}
</script>

<template>
  <section class="import-panel tool-panel">
    <div class="panel-heading">
      <div><h2>添加资料</h2><span>文档会按所选业务范围参与检索</span></div>
    </div>

    <div class="source-tabs" role="tablist">
      <button v-for="item in [{ id: 'file', label: '本地文档' }, { id: 'url', label: '在线文档' }, { id: 'directory', label: '同步目录' }]" :key="item.id" type="button" :class="{ active: tab === item.id }" @click="tab = item.id">
        {{ item.label }}
      </button>
    </div>

    <div v-if="tab !== 'directory'" class="governance-form">
      <label>
        <span>知识范围</span>
        <select v-model="scopeType">
          <option value="global">全局</option>
          <option value="group">群聊</option>
          <option value="project">项目</option>
          <option value="agent">Agent</option>
        </select>
      </label>
      <label v-if="scopeNeedsId" class="scope-id-field">
        <span>范围标识</span>
        <input v-model="scopeId" type="text" :placeholder="scopeType === 'group' ? '群聊 ID' : scopeType === 'project' ? '项目名称' : 'Agent 名称'">
      </label>
      <label>
        <span>可见性</span>
        <select v-model="visibility">
          <option value="shared">范围内共享</option>
          <option value="restricted">仅限定范围</option>
        </select>
      </label>
      <label class="tags-field">
        <span>标签</span>
        <input v-model="tags" type="text" placeholder="产品, 客户, 规范">
      </label>
    </div>

    <div v-if="tab === 'file'" class="source-body">
      <input ref="fileInput" class="hidden-input" type="file" multiple accept=".md,.txt,.json,.csv,.yaml,.yml,.toml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.vue,.log,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.sh,.bat,.ps1,.ini,.conf,.sql,.php,.rb,.swift,.kt,.pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp" @change="selectFiles($event.target.files); $event.target.value = ''">
      <button
        type="button"
        class="drop-zone"
        :class="{ dragging: isDragging, disabled: uploading || !scopeValid }"
        :disabled="uploading || !scopeValid"
        @click="fileInput?.click()"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="isDragging = false; selectFiles($event.dataTransfer.files)"
      >
        <span class="upload-symbol">↑</span>
        <strong>{{ uploading ? '正在解析与索引' : '选择或拖入文档' }}</strong>
        <small>PDF、Office、图片、Markdown、文本与代码文件</small>
      </button>
      <p v-if="!scopeValid" class="field-error">请填写范围标识后再导入。</p>
    </div>

    <form v-else-if="tab === 'url'" class="url-form" @submit.prevent="submitUrl">
      <label><span>文档链接</span><input v-model="onlineUrl" type="url" placeholder="https://docs.qq.com/..." required></label>
      <label><span>显示名称</span><input v-model="onlineTitle" type="text" placeholder="可选"></label>
      <button class="primary-action" type="submit" :disabled="importingUrl || !onlineUrl.trim() || !scopeValid">
        {{ importingUrl ? '正在读取' : '导入在线文档' }}
      </button>
      <p class="source-note">腾讯文档需要公开分享；需要登录的链接会明确提示授权状态。</p>
    </form>

    <div v-else class="directory-form">
      <div class="path-input-row">
        <label><span>本地目录</span><input v-model="watchPath" type="text" placeholder="C:\project\docs" @keyup.enter="submitPath"></label>
        <button class="primary-action" type="button" :disabled="pathAdding || !watchPath.trim()" @click="submitPath">{{ pathAdding ? '添加中' : '添加' }}</button>
      </div>
      <div v-if="watchPaths.length" class="watch-list">
        <div v-for="item in watchPaths" :key="item" class="watch-row">
          <span class="watch-state"></span>
          <code :title="item">{{ item }}</code>
          <button type="button" title="停止监控" @click="emit('remove-path', item)">×</button>
        </div>
      </div>
      <div v-else class="empty-inline">暂无同步目录</div>
    </div>
  </section>
</template>

<style scoped>
.tool-panel { background: var(--surface, #fff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 12px; }
.panel-heading h2 { margin: 0; color: var(--text-primary, #0f172a); font-size: 14px; letter-spacing: 0; }
.panel-heading span { display: block; margin-top: 3px; color: var(--text-secondary, #64748b); font-size: 11px; }
.source-tabs { display: flex; gap: 2px; padding: 0 18px; border-bottom: 1px solid var(--border-color, #e2e8f0); }
.source-tabs button { padding: 9px 11px; border: none; border-bottom: 2px solid transparent; background: transparent; color: var(--text-secondary, #64748b); font-size: 12px; cursor: pointer; }
.source-tabs button.active { border-color: #2563eb; color: #1d4ed8; font-weight: 600; }
.governance-form { display: grid; grid-template-columns: minmax(100px, .7fr) minmax(100px, .75fr) minmax(130px, 1fr); gap: 10px; padding: 14px 18px 0; }
.scope-id-field + label { grid-column: auto; }
.tags-field { grid-column: 1 / -1; }
label { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
label > span { color: var(--text-secondary, #64748b); font-size: 10.5px; font-weight: 600; }
input, select { width: 100%; height: 34px; box-sizing: border-box; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; padding: 0 9px; outline: none; background: var(--bg-primary, #f8fafc); color: var(--text-primary, #0f172a); font: inherit; font-size: 12px; }
input:focus, select:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.1); }
.source-body, .url-form, .directory-form { padding: 14px 18px 18px; }
.hidden-input { display: none; }
.drop-zone { width: 100%; min-height: 132px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1px dashed #94a3b8; border-radius: 7px; background: var(--bg-primary, #f8fafc); color: var(--text-primary, #0f172a); cursor: pointer; }
.drop-zone:hover, .drop-zone.dragging { border-color: #2563eb; background: rgba(37,99,235,.04); }
.drop-zone.disabled { opacity: .55; cursor: not-allowed; }
.upload-symbol { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: #dbeafe; color: #1d4ed8; font-size: 18px; }
.drop-zone strong { font-size: 12.5px; }.drop-zone small { color: var(--text-secondary, #64748b); font-size: 10.5px; }
.field-error { margin: 8px 0 0; color: #b91c1c; font-size: 11px; }
.url-form { display: grid; grid-template-columns: 1fr minmax(130px, .35fr) auto; align-items: end; gap: 10px; }
.primary-action { height: 34px; padding: 0 13px; border: 1px solid #1d4ed8; border-radius: 6px; background: #1d4ed8; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.primary-action:disabled { opacity: .5; cursor: not-allowed; }
.source-note { grid-column: 1 / -1; margin: 0; color: var(--text-secondary, #64748b); font-size: 10.5px; }
.path-input-row { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 10px; }
.watch-list { display: grid; gap: 6px; margin-top: 12px; }
.watch-row { min-width: 0; display: grid; grid-template-columns: 8px minmax(0, 1fr) 28px; align-items: center; gap: 8px; padding: 7px 8px; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; }
.watch-state { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; }
.watch-row code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary, #334155); font-size: 10.5px; }
.watch-row button { width: 26px; height: 26px; border: none; background: transparent; color: var(--text-secondary, #64748b); font-size: 18px; cursor: pointer; }
.empty-inline { margin-top: 12px; padding: 18px; border: 1px dashed var(--border-color, #dbe2ea); border-radius: 6px; text-align: center; color: var(--text-secondary, #64748b); font-size: 11px; }
@media (max-width: 720px) { .governance-form { grid-template-columns: 1fr 1fr; } .tags-field { grid-column: 1 / -1; } .url-form { grid-template-columns: 1fr; } .url-form .primary-action { width: 100%; } }
@media (max-width: 470px) { .governance-form { grid-template-columns: 1fr; } .tags-field { grid-column: auto; } .path-input-row { grid-template-columns: 1fr; } }
</style>
