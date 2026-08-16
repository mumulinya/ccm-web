<script setup>
import { computed, reactive, watch } from 'vue'
import {
  Check,
  CheckCircle2,
  Cpu,
  Globe,
  Layers,
  LoaderCircle,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from '@lucide/vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  config: { type: Object, default: () => ({}) },
  status: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save', 'prepare-local', 'remove-local', 'repair-vectors', 'cleanup-index'])

const form = reactive({
  mode: 'auto',
  apiUrl: 'https://api.openai.com/v1',
  model: 'text-embedding-3-small',
  apiKey: '',
  hasKey: false,
  clearApiKey: false,
  mirrorUrl: '',
})

const remoteMode = computed(() => form.mode === 'remote' || form.mode === 'auto')
const localMode = computed(() => form.mode === 'local' || form.mode === 'auto')
const localModel = computed(() => props.status?.localModel || {})

const modes = [
  { id: 'auto', label: '智能自动模式', hint: '优先外部 API，本地轻量模型保底', icon: Sparkles },
  { id: 'local', label: '本地嵌入语义', hint: '纯 CPU 本地推理，无 API 费用', icon: Cpu },
  { id: 'remote', label: '外部 Embedding 接口', hint: '连接 OpenAI 兼容向量接口', icon: Globe },
  { id: 'lexical', label: '仅词面检索', hint: '纯关键词与哈希匹配', icon: Search },
]

watch(() => [props.visible, props.config], () => {
  Object.assign(form, {
    mode: props.config?.mode || (props.config?.enabled ? 'remote' : 'auto'),
    apiUrl: props.config?.apiUrl || 'https://api.openai.com/v1',
    model: props.config?.model || 'text-embedding-3-small',
    apiKey: '',
    hasKey: !!props.config?.hasKey,
    clearApiKey: false,
    mirrorUrl: props.config?.mirrorUrl || '',
  })
}, { immediate: true, deep: true })

const submit = () => emit('save', {
  mode: form.mode,
  enabled: form.mode === 'remote',
  apiUrl: form.apiUrl.trim(),
  model: form.model.trim(),
  ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
  clearApiKey: form.clearApiKey,
  mirrorUrl: form.mirrorUrl.trim(),
  rebuild: true,
})
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="modal-layer" @click.self="emit('close')">
      <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-settings-title">
        <!-- 头部 -->
        <header class="modal-header">
          <div class="header-titles">
            <div class="title-with-icon">
              <Settings :size="16" class="header-icon" />
              <h2 id="knowledge-settings-title">知识检索与向量模型设置</h2>
            </div>
            <p>配置语义向量 Embedding 来源；词面检索将始终保留作为安全降级方案。</p>
          </div>
          <button type="button" class="btn-close" title="关闭" @click="emit('close')">
            <X :size="16" />
          </button>
        </header>

        <!-- 主体 -->
        <div class="settings-body">
          <!-- 模式选择网格 -->
          <div class="mode-grid" role="radiogroup" aria-label="知识检索模式">
            <div
              v-for="item in modes"
              :key="item.id"
              class="mode-card"
              :class="{ active: form.mode === item.id }"
              @click="form.mode = item.id"
            >
              <div class="mode-card-header">
                <component :is="item.icon" :size="15" class="mode-icon" />
                <strong>{{ item.label }}</strong>
                <span v-if="form.mode === item.id" class="check-pill">
                  <Check :size="11" />
                </span>
              </div>
              <small>{{ item.hint }}</small>
            </div>
          </div>

          <!-- 本地模型状态区 -->
          <div v-if="localMode" class="local-model-section" :data-state="localModel.state || 'idle'">
            <div class="local-head">
              <div class="local-title">
                <Cpu :size="14" />
                <strong>本地轻量多语言向量模型</strong>
              </div>
              <span class="model-name-pill font-mono">
                {{ localModel.model || config.localModel || 'Xenova/multilingual-e5-small' }} · INT8
              </span>
            </div>

            <div class="model-progress-track">
              <div class="model-progress-fill" :style="{ width: `${localModel.progress || 0}%` }"></div>
            </div>

            <p class="local-desc">
              {{ localModel.state === 'ready' ? '模型已就绪，可在本地生成高质量语义嵌入向量' : localModel.state === 'downloading' ? `后台正在下载与准备模型 ${Number(localModel.progress || 0).toFixed(0)}%` : localModel.error || '首次启动后会在后台自动下载并校验约 118MB 的嵌入模型' }}
            </p>

            <div class="local-actions-row">
              <button type="button" class="btn-tool-action" :disabled="saving" @click="emit('prepare-local')">
                <RefreshCw :size="12" />
                <span>{{ localModel.state === 'ready' ? '重新校验/下载' : '准备本地模型' }}</span>
              </button>
              <button v-if="localModel.state === 'ready'" type="button" class="btn-tool-action danger" :disabled="saving" @click="emit('remove-local')">
                <Trash2 :size="12" />
                <span>删除模型缓存</span>
              </button>
            </div>

            <div class="field-item mirror-field">
              <label>下载镜像地址 (可选)</label>
              <input v-model="form.mirrorUrl" type="url" placeholder="留空使用 Hugging Face 默认源">
            </div>
          </div>

          <!-- 外部接口配置 -->
          <div v-if="remoteMode" class="remote-fields-section">
            <div class="field-item">
              <label>Embedding API 地址</label>
              <input v-model="form.apiUrl" type="url" placeholder="https://api.openai.com/v1">
            </div>

            <div class="field-item">
              <label>模型名称</label>
              <input v-model="form.model" type="text" placeholder="例如：text-embedding-3-small">
            </div>

            <div class="field-item">
              <label>API Key</label>
              <input
                v-model="form.apiKey"
                type="password"
                :placeholder="form.hasKey ? '已加密保存密钥 (留空保持不变)' : '请输入 API Key'"
              >
            </div>

            <label v-if="form.hasKey" class="clear-key-label">
              <input v-model="form.clearApiKey" type="checkbox">
              <span>清除已保存的 API Key</span>
            </label>
          </div>

          <!-- 维护与诊断栏 -->
          <div class="maintenance-bar">
            <div class="maintenance-info">
              <span class="font-mono">
                <b>{{ status.semanticReady || 0 }}</b> 个语义向量可用，
                <b>{{ (status.semanticFailed || 0) + (status.semanticPending || 0) }}</b> 个待处理
              </span>
            </div>
            <div class="maintenance-buttons">
              <button type="button" class="btn-tool-action" :disabled="saving" @click="emit('repair-vectors')">
                <Wrench :size="12" />
                <span>修复缺失向量</span>
              </button>
              <button type="button" class="btn-tool-action" :disabled="saving" @click="emit('cleanup-index')">
                <Trash2 :size="12" />
                <span>清理失效索引</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <footer class="modal-footer">
          <button type="button" class="btn-cancel" @click="emit('close')">取消</button>
          <button
            type="button"
            class="btn-save"
            :disabled="saving || (form.mode === 'remote' && (!form.apiUrl.trim() || !form.model.trim() || (!form.hasKey && !form.apiKey.trim())))"
            @click="submit"
          >
            {{ saving ? '正在保存并重建...' : '保存并更新索引' }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<style scoped>
.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--overlay-scrim, rgba(15, 23, 42, 0.55));
  backdrop-filter: blur(3px);
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.settings-modal {
  width: min(580px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 10px);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-lg, 0 24px 60px rgba(15, 23, 42, 0.24));
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--accent-blue);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

.modal-header p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 11px;
}

.btn-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.btn-close:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
}

/* 4 种模式 Radio Cards */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-card:hover {
  border-color: var(--accent-blue);
}

.mode-card.active {
  border-color: var(--accent-blue);
  background: var(--accent-soft, rgba(37, 99, 235, 0.08));
  box-shadow: 0 0 0 1px var(--accent-blue);
}

.mode-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-icon {
  color: var(--accent-blue);
}

.mode-card-header strong {
  font-size: 12px;
  color: var(--text-primary);
}

.check-pill {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-blue);
  color: #fff;
}

.mode-card small {
  color: var(--text-muted);
  font-size: 10.5px;
  line-height: 1.4;
}

/* 本地模型区 */
.local-model-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-muted, rgba(148, 163, 184, 0.05));
}

.local-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.local-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 12px;
}

.model-name-pill {
  font-size: 10.5px;
  color: var(--accent-blue);
  background: var(--accent-soft);
  padding: 1px 6px;
  border-radius: 4px;
}

.model-progress-track {
  height: 4px;
  border-radius: 999px;
  background: var(--border-color);
  overflow: hidden;
}

.model-progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: inherit;
}

.local-desc {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.local-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-tool-action {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool-action:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.btn-tool-action.danger:hover:not(:disabled) {
  border-color: var(--accent-red);
  color: var(--accent-red);
}

.btn-tool-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 字段 */
.remote-fields-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.field-item input {
  height: var(--control-height, 34px);
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.field-item input:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.clear-key-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-red, #ef4444);
  font-size: 11px;
  cursor: pointer;
}

/* 维护栏 */
.maintenance-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
}

.maintenance-info {
  font-size: 11px;
  color: var(--text-muted);
}

.maintenance-info b {
  color: var(--text-primary);
}

.maintenance-buttons {
  display: flex;
  gap: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.btn-cancel,
.btn-save {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--radius-md, 6px);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel {
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
}

.btn-save {
  border: 0;
  background: var(--accent-blue, #2563eb);
  color: #fff;
}

.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 540px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }
  .maintenance-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
