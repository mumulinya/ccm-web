<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { Bot, Cloud, ExternalLink, FolderCode, FolderGit2, FolderOpen, GitBranch, GitFork, RefreshCw, Save, X } from '@lucide/vue'

const props = defineProps({
  mode: { type: String, required: true },
  project: { type: Object, default: null },
  form: { type: Object, required: true },
  agentOptions: { type: Array, default: () => [] },
  platforms: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'submit', 'browse', 'open-feishu', 'refresh-git', 'update-field'])

const updateField = (field, event) => {
  emit('update-field', { field, value: event.target.value })
}
const setField = (field, value) => emit('update-field', { field, value })

const title = computed(() => props.mode === 'create' ? '新建项目' : '编辑项目')
const projectName = computed(() => props.project?.name || props.form.name || '未命名项目')
const hasValidPlatform = computed(() => props.platforms.some(item => item.value === props.form.platform))
const hasValidAgent = computed(() => props.agentOptions.some(item => item.type === props.form.agent))
const githubSource = computed(() => props.mode === 'create' && props.form.source_type === 'github')
const gitStatus = computed(() => props.form.git_status || null)
const canSubmit = computed(() => {
  const hasDirectory = String(props.form.work_dir || '').trim().length > 0
  const hasRepository = !githubSource.value || String(props.form.repository_url || '').trim().length > 0
  return props.mode === 'create'
    ? hasDirectory && hasRepository && hasValidAgent.value && hasValidPlatform.value && String(props.form.name || '').trim().length > 0
    : hasDirectory && hasValidAgent.value && hasValidPlatform.value
})

const handleKeydown = event => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="project-form-overlay" @click.self="emit('close')">
    <section class="project-form-modal" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
      <header class="project-form-header">
        <span class="project-form-icon"><FolderCode :size="20" /></span>
        <div class="project-form-heading">
          <h3 id="project-form-title">{{ title }}</h3>
          <p>{{ mode === 'create' ? '添加一个可由开发 Agent 执行的代码项目' : projectName }}</p>
        </div>
        <button type="button" class="project-form-close" title="关闭" aria-label="关闭" @click="emit('close')"><X :size="18" /></button>
      </header>

      <div class="project-form-body">
        <div v-if="mode === 'create'" class="project-source-field">
          <span>项目来源</span>
          <div class="project-source-segments" role="group" aria-label="项目来源">
            <button type="button" :class="{ active: form.source_type !== 'github' }" @click="setField('source_type', 'local')"><FolderCode :size="16" />本地目录</button>
            <button type="button" :class="{ active: form.source_type === 'github' }" @click="setField('source_type', 'github')"><GitFork :size="16" />GitHub 仓库</button>
          </div>
        </div>

        <label v-if="mode === 'create'" class="project-field">
          <span>项目名称</span>
          <input :value="form.name" autocomplete="off" placeholder="例如 my-app" @input="updateField('name', $event)">
        </label>

        <div v-if="githubSource" class="project-github-create-fields">
          <label class="project-field">
            <span><GitFork :size="14" />GitHub 仓库地址</span>
            <input :value="form.repository_url" autocomplete="off" placeholder="https://github.com/owner/repository" @input="updateField('repository_url', $event)">
          </label>
          <label class="project-field">
            <span><GitBranch :size="14" />克隆分支（可选）</span>
            <input :value="form.repository_branch" autocomplete="off" placeholder="留空使用仓库默认分支" @input="updateField('repository_branch', $event)">
          </label>
        </div>

        <label class="project-field project-directory-field">
          <span>{{ githubSource ? '克隆目标目录' : mode === 'create' ? '代码目录路径' : '代码目录' }}</span>
          <div class="project-directory-control">
            <input :value="form.work_dir" autocomplete="off" :placeholder="githubSource ? '例如 D:\projects\repository（目录需不存在或为空）' : mode === 'create' ? '例如 D:\projects\my-app' : '选择项目代码目录'" @input="updateField('work_dir', $event)">
            <button type="button" class="project-secondary-button browse-button" @click.prevent="emit('browse', 'work_dir')"><FolderOpen :size="16" /> 浏览</button>
          </div>
        </label>

        <div class="project-field-grid">
          <label class="project-field">
            <span><Bot :size="14" />{{ mode === 'create' ? '开发 Agent' : 'Agent 类型' }}</span>
            <select :value="form.agent" :disabled="!agentOptions.length" @change="updateField('agent', $event)">
              <option v-if="!agentOptions.length" value="" disabled>正在读取 Agent 注册表</option>
              <option v-for="agent in agentOptions" :key="agent.type" :value="agent.type">
                {{ agent.name }}{{ agent.enabled === false ? '（未启用）' : agent.ready ? '' : '（未就绪）' }}
              </option>
            </select>
          </label>

          <label class="project-field">
            <span><Cloud :size="14" />通知平台</span>
            <select :value="form.platform" @change="updateField('platform', $event)">
              <option v-if="!hasValidPlatform" :value="form.platform" disabled>请选择通知平台</option>
              <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </label>
        </div>

        <section v-if="mode === 'edit'" class="project-repository-section" aria-label="GitHub 仓库">
          <div class="project-repository-heading">
            <div>
              <strong><FolderGit2 :size="16" />GitHub 仓库</strong>
              <small v-if="form.git_loading">正在读取本地 Git 状态</small>
              <small v-else-if="gitStatus?.is_repository">{{ gitStatus.branch || '分离 HEAD' }}{{ gitStatus.upstream ? ` · ${gitStatus.upstream}` : '' }}</small>
              <small v-else>当前目录尚未初始化 Git</small>
            </div>
            <button type="button" class="project-icon-button" title="刷新 Git 状态" aria-label="刷新 Git 状态" :disabled="form.git_loading" @click="emit('refresh-git')"><RefreshCw :size="16" :class="{ spinning: form.git_loading }" /></button>
          </div>

          <div v-if="gitStatus?.is_repository" class="project-git-facts">
            <span :class="{ warning: gitStatus.dirty }">{{ gitStatus.dirty ? `${gitStatus.changed_files} 个文件未提交` : '工作区干净' }}</span>
            <span v-if="gitStatus.upstream">领先 {{ gitStatus.ahead }} · 落后 {{ gitStatus.behind }}</span>
            <span v-if="gitStatus.last_commit">最近提交 {{ gitStatus.last_commit.short_hash }} · {{ gitStatus.last_commit.summary }}</span>
          </div>

          <label v-if="!form.git_loading && !gitStatus?.is_repository" class="project-init-git">
            <input type="checkbox" :checked="form.initialize_repository === true" @change="setField('initialize_repository', $event.target.checked)">
            <span>保存时初始化 Git 仓库</span>
          </label>

          <label class="project-field repository-url-field">
            <span><GitFork :size="14" />origin 仓库地址</span>
            <div class="project-repository-control">
              <input :value="form.repository_url" autocomplete="off" placeholder="https://github.com/owner/repository" @input="updateField('repository_url', $event)">
              <a v-if="gitStatus?.remote_web_url" :href="gitStatus.remote_web_url" target="_blank" rel="noreferrer" class="project-icon-button" title="打开 GitHub 仓库" aria-label="打开 GitHub 仓库"><ExternalLink :size="16" /></a>
            </div>
            <small>留空保持现有 origin；私人仓库使用本机 Git 凭据。</small>
          </label>
        </section>

        <button v-if="form.platform === 'feishu' || form.platform === 'lark'" type="button" class="feishu-action" @click="emit('open-feishu')">
          <Bot :size="17" />
          <span><strong>配置飞书机器人</strong><small>扫码创建并获取项目凭证</small></span>
        </button>
      </div>

      <footer class="project-form-actions">
        <button type="button" class="project-secondary-button" @click="emit('close')">取消</button>
        <button type="button" class="project-primary-button" :disabled="!canSubmit" @click="emit('submit')"><Save :size="16" />{{ mode === 'create' ? '创建项目' : '保存修改' }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.project-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 10030;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #0f172a 38%, transparent);
  backdrop-filter: blur(4px);
}

.project-form-modal {
  width: min(620px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-primary));
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.project-form-header {
  min-height: 74px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
}

.project-form-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 24%, var(--border-color));
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-blue) 9%, var(--surface));
  color: var(--accent-blue);
}

.project-form-heading {
  min-width: 0;
  flex: 1;
}

.project-form-heading h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}

.project-form-heading p {
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-form-close {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.project-form-close:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.project-form-body {
  min-height: 0;
  overflow-y: auto;
  padding: 20px 18px;
}

.project-source-field {
  margin-bottom: 18px;
}

.project-source-field > span {
  display: block;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 650;
}

.project-source-segments {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-secondary);
}

.project-source-segments button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.project-source-segments button.active {
  background: var(--surface, var(--bg-primary));
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(15, 23, 42, .09);
}

.project-github-create-fields {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 14px;
}

.project-field {
  min-width: 0;
  display: block;
  margin-bottom: 16px;
}

.project-field > span {
  min-height: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 650;
}

.project-field input,
.project-field select {
  width: 100%;
  min-width: 0;
  height: 40px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  outline: none;
  background: var(--surface, var(--bg-primary));
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.project-field input:focus,
.project-field select:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-blue) 12%, transparent);
}

.project-directory-field input {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.project-directory-control {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.project-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.project-field-grid .project-field {
  margin-bottom: 0;
}

.project-repository-section {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-color);
}

.project-repository-heading,
.project-repository-control {
  display: flex;
  align-items: center;
  gap: 9px;
}

.project-repository-heading {
  justify-content: space-between;
}

.project-repository-heading > div {
  min-width: 0;
}

.project-repository-heading strong,
.project-repository-heading small {
  display: flex;
  align-items: center;
  gap: 7px;
}

.project-repository-heading strong {
  font-size: 12.5px;
}

.project-repository-heading small,
.repository-url-field > small {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.project-icon-button {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface, var(--bg-primary));
  color: var(--text-secondary);
  cursor: pointer;
}

.project-icon-button:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.project-icon-button:disabled {
  cursor: wait;
  opacity: .55;
}

.project-git-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 12px 0 14px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.project-git-facts span.warning {
  color: var(--warning-color, #a16207);
}

.project-init-git {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 13px 0;
  color: var(--text-secondary);
  font-size: 11.5px;
}

.project-init-git input {
  accent-color: var(--accent-blue);
}

.repository-url-field {
  margin: 14px 0 0;
}

.project-repository-control input {
  flex: 1;
}

.spinning {
  animation: project-spin .9s linear infinite;
}

@keyframes project-spin { to { transform: rotate(360deg); } }

.project-secondary-button,
.project-primary-button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.project-secondary-button {
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-primary));
  color: var(--text-secondary);
}

.project-secondary-button:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.browse-button {
  height: 40px;
  white-space: nowrap;
}

.project-primary-button {
  border: 1px solid var(--accent-blue);
  background: var(--accent-blue);
  color: #fff;
}

.project-primary-button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.feishu-action {
  width: 100%;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 9px 12px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
}

.feishu-action > svg {
  flex: 0 0 auto;
  color: var(--accent-blue);
}

.feishu-action span,
.feishu-action strong,
.feishu-action small {
  display: block;
}

.feishu-action strong {
  color: var(--text-primary);
  font-size: 12px;
}

.feishu-action small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.project-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding: 13px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

@media (max-width: 640px) {
  .project-form-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .project-form-modal {
    width: 100%;
    max-height: 92vh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 8px 8px 0 0;
  }

  .project-form-header,
  .project-form-body,
  .project-form-actions {
    padding-right: 14px;
    padding-left: 14px;
  }

  .project-field-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .project-github-create-fields {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .project-directory-control {
    grid-template-columns: 1fr;
  }

  .browse-button {
    width: 100%;
  }

  .project-form-actions > button {
    flex: 1;
  }
}
</style>
