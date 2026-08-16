<script setup>
import { computed, ref, watch } from 'vue'
import {
  FilePlus2,
  FolderGit2,
  Globe,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from '@lucide/vue'

const props = defineProps({
  uploading: { type: Boolean, default: false },
  importingUrl: { type: Boolean, default: false },
  pathAdding: { type: Boolean, default: false },
  watchPaths: { type: Array, default: () => [] },
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

const importTabs = [
  { id: 'file', label: '本地文档', icon: UploadCloud },
  { id: 'url', label: '在线文档', icon: Globe },
  { id: 'directory', label: '同步目录', icon: FolderGit2 },
]

const scopeNeedsId = computed(() => scopeType.value !== 'global')
const scopeValid = computed(() => !scopeNeedsId.value || scopeId.value.trim())

watch(tab, (value) => {
  if (value === 'directory') visibility.value = 'restricted'
})

const options = () => ({
  scopeType: scopeType.value,
  scopeId: scopeId.value.trim(),
  visibility: visibility.value,
  tags: tags.value.split(/[,，]/).map(item => item.trim()).filter(Boolean),
})

const selectFiles = (files) => {
  if (!files?.length || !scopeValid.value) return
  emit('upload', { files: Array.from(files), options: options() })
}

const submitUrl = () => {
  if (!onlineUrl.value.trim() || !scopeValid.value) return
  emit('import-url', { url: onlineUrl.value.trim(), title: onlineTitle.value.trim(), ...options() })
}

const submitPath = () => {
  if (!watchPath.value.trim() || !scopeValid.value) return
  emit('add-path', { path: watchPath.value.trim(), ...options() })
  watchPath.value = ''
}
</script>

<template>
  <section class="import-panel tool-panel">
    <!-- 面板头部 -->
    <div class="panel-heading">
      <div class="heading-text">
        <div class="heading-title-row">
          <FilePlus2 :size="16" class="panel-icon" />
          <h2>添加与导入资料</h2>
        </div>
        <span>文档会按所选业务权限范围参与 RAG 语义索引</span>
      </div>

      <!-- Segmented Pill 选项卡 -->
      <div class="source-segmented-pills">
        <button
          v-for="item in importTabs"
          :key="item.id"
          type="button"
          class="pill-btn"
          :class="{ active: tab === item.id }"
          @click="tab = item.id"
        >
          <component :is="item.icon" :size="12" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <!-- 知识范围治理表单 -->
    <div class="governance-form">
      <div class="field-item">
        <label>知识范围</label>
        <select v-model="scopeType">
          <option value="global">全局 (全系统共享)</option>
          <option value="group">群聊会话</option>
          <option value="project">指定项目</option>
          <option value="agent">指定 Agent</option>
        </select>
      </div>

      <div v-if="scopeNeedsId" class="field-item">
        <label>范围标识</label>
        <input
          v-model="scopeId"
          type="text"
          :placeholder="scopeType === 'group' ? '填写群聊 ID' : scopeType === 'project' ? '填写项目名称' : '填写 Agent 名称'"
        >
      </div>

      <div class="field-item">
        <label>可见性规则</label>
        <select v-model="visibility">
          <option value="shared">范围内全员共享</option>
          <option value="restricted">仅限定专属范围</option>
        </select>
      </div>

      <div class="field-item full-width">
        <label>分类标签 (用逗号分隔)</label>
        <input v-model="tags" type="text" placeholder="例如：产品文档, API 规范, 架构设计">
      </div>
    </div>

    <!-- 1. 本地文档拖拽上传 -->
    <div v-if="tab === 'file'" class="source-body">
      <input
        ref="fileInput"
        class="hidden-input"
        type="file"
        multiple
        accept=".md,.txt,.json,.csv,.yaml,.yml,.toml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.vue,.log,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.sh,.bat,.ps1,.ini,.conf,.sql,.php,.rb,.swift,.kt,.pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp"
        @change="selectFiles($event.target.files); $event.target.value = ''"
      >
      <div
        class="drop-zone"
        :class="{ dragging: isDragging, disabled: uploading || !scopeValid }"
        @click="!uploading && scopeValid && fileInput?.click()"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="isDragging = false; selectFiles($event.dataTransfer.files)"
      >
        <div class="upload-icon-circle">
          <UploadCloud :size="22" />
        </div>
        <strong>{{ uploading ? '正在解析并生成语义索引...' : '点击选择或将文档拖入此处' }}</strong>
        <p>支持 Markdown、PDF、Office (Docx/Xlsx/Pptx)、代码文件、纯文本及图片</p>
      </div>
      <p v-if="!scopeValid" class="field-error">请先填写正确的范围标识再导入文档。</p>
    </div>

    <!-- 2. 在线文档抓取 -->
    <form v-else-if="tab === 'url'" class="url-form" @submit.prevent="submitUrl">
      <div class="url-fields-row">
        <div class="field-item flex-2">
          <label>在线文档链接</label>
          <input v-model="onlineUrl" type="url" placeholder="https://docs.qq.com/... 或 Web 网页 URL" required>
        </div>
        <div class="field-item flex-1">
          <label>自定义显示名称 (可选)</label>
          <input v-model="onlineTitle" type="text" placeholder="留空自动解析标题">
        </div>
        <button class="primary-action-btn" type="submit" :disabled="importingUrl || !onlineUrl.trim() || !scopeValid">
          <Globe :size="13" />
          <span>{{ importingUrl ? '正在抓取' : '导入在线文档' }}</span>
        </button>
      </div>
      <p class="source-note">公开 Web 文档可直接读取；私有腾讯文档请先在“设置中心”配置对应授权。</p>
    </form>

    <!-- 3. 本地目录监控同步 -->
    <div v-else class="directory-form">
      <div class="path-input-row">
        <div class="field-item">
          <label>本地监控目录绝对路径</label>
          <input v-model="watchPath" type="text" placeholder="例如：C:\projects\my-app\docs" @keyup.enter="submitPath">
        </div>
        <button class="primary-action-btn" type="button" :disabled="pathAdding || !watchPath.trim()" @click="submitPath">
          <Plus :size="13" />
          <span>{{ pathAdding ? '添加中' : '添加同步目录' }}</span>
        </button>
      </div>

      <div v-if="watchPaths.length" class="watch-list">
        <div v-for="item in watchPaths" :key="item.path || item" class="watch-row">
          <span class="watch-state-dot"></span>
          <div class="watch-info">
            <code :title="item.path || item">{{ item.path || item }}</code>
            <small v-if="item.legacyShared">历史共享范围</small>
            <small v-else>{{ item.scope?.type || 'global' }} · {{ item.visibility || 'restricted' }}</small>
          </div>
          <button type="button" class="remove-watch-btn" title="停止监控此目录" @click="emit('remove-path', item.path || item)">
            <Trash2 :size="13" />
          </button>
        </div>
      </div>
      <div v-else class="empty-inline">暂无正在同步的本地目录</div>
    </div>
  </section>
</template>

<style scoped>
.tool-panel {
  background: var(--surface, var(--bg-card));
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--border-color);
}

.heading-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  color: var(--accent-blue);
}

.panel-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.panel-heading span {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

/* 选项卡 Segmented Pills */
.source-segmented-pills {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pill-btn:hover {
  color: var(--text-primary);
  background: var(--surface);
}

.pill-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue, #2563eb);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 治理表单 */
.governance-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  padding: 14px 18px 0;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field-item.full-width {
  grid-column: 1 / -1;
}

.field-item label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.field-item input,
.field-item select {
  width: 100%;
  height: var(--control-height, 34px);
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  padding: 0 10px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.field-item input:focus,
.field-item select:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

/* 拖拽上传区 */
.source-body,
.url-form,
.directory-form {
  padding: 12px 18px 16px;
}

.hidden-input { display: none; }

.drop-zone {
  width: 100%;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px dashed var(--border-strong, var(--border-color));
  border-radius: 8px;
  background: var(--panel-muted, rgba(148, 163, 184, 0.05));
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 16px;
  box-sizing: border-box;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--accent-blue);
  background: var(--accent-soft, rgba(37, 99, 235, 0.06));
}

.drop-zone.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.upload-icon-circle {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-blue);
  margin-bottom: 2px;
}

.drop-zone strong {
  font-size: 13px;
  font-weight: 700;
}

.drop-zone p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.field-error {
  margin: 8px 0 0;
  color: var(--accent-red, #ef4444);
  font-size: 11px;
}

/* URL 表单 */
.url-fields-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.flex-2 { flex: 2; }
.flex-1 { flex: 1; }

.primary-action-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-md, 6px);
  background: var(--accent-blue, #2563eb);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.primary-action-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.primary-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.source-note {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 11px;
}

/* 目录监控 */
.path-input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.path-input-row .field-item {
  flex: 1;
}

.watch-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.watch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
}

.watch-state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  flex-shrink: 0;
}

.watch-info {
  flex: 1;
  min-width: 0;
}

.watch-info code {
  font-family: var(--font-mono, monospace);
  font-size: 11.5px;
  color: var(--text-primary);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watch-info small {
  color: var(--text-muted);
  font-size: 10px;
}

.remove-watch-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.remove-watch-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-inline {
  margin-top: 12px;
  padding: 20px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  text-align: center;
  color: var(--text-muted);
  font-size: 11.5px;
}

@media (max-width: 680px) {
  .panel-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .source-segmented-pills { width: 100%; justify-content: space-between; }
  .url-fields-row { flex-direction: column; align-items: stretch; }
  .path-input-row { flex-direction: column; align-items: stretch; }
}
</style>
