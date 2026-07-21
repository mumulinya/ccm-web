<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Check, KeyRound, MonitorCheck, Plus, Save, Trash2, X } from '@lucide/vue'

const props = defineProps({
  groupName: { type: String, default: '' },
  projects: { type: Array, default: () => [] },
  targets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save', 'delete'])

const kindOptions = [
  ['web', 'Web'], ['h5', 'H5'], ['api', 'API'], ['hybrid_app', '混合应用'],
  ['native_app', '原生应用'], ['other', '其他'],
]
const authOptions = [
  ['none', '无需登录'], ['credentials', '账号凭据'], ['storage_state', 'Storage State'], ['existing_session', '已有浏览器会话'],
]
const selectedId = ref('')
const editing = ref(false)
const form = reactive({})

function emptyForm() {
  return {
    id: '', project: props.projects[0] || '', name: '', kind: 'web', environment: 'test',
    enabled: true, required: false, baseUrl: '', startupCommand: '', verificationCommandsText: '', notes: '',
    auth: {
      mode: 'none', loginPath: '/login', submitLabel: '登录', successText: '', successUrlIncludes: '',
      storageStatePath: '', existingSessionProvider: 'auto', fields: [],
    },
  }
}

function assignForm(target = null) {
  const next = target ? {
    ...target,
    verificationCommandsText: (target.verificationCommands || []).join('\n'),
    auth: {
      ...target.auth,
      fields: (target.auth?.fields || []).map(field => ({ ...field, value: '', clearValue: false })),
    },
  } : emptyForm()
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, next)
}

function editTarget(target) {
  selectedId.value = target.id
  editing.value = true
  assignForm(target)
}

function addTarget() {
  selectedId.value = ''
  editing.value = true
  assignForm()
}

function addAuthField() {
  form.auth.fields.push({
    id: '', label: '', envName: `TEST_CREDENTIAL_${form.auth.fields.length + 1}`,
    inputLabel: '', value: '', hasValue: false, clearValue: false,
  })
}

function submit() {
  emit('save', {
    ...form,
    verificationCommands: String(form.verificationCommandsText || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean),
    auth: { ...form.auth, fields: form.auth.fields.map(field => ({ ...field })) },
  })
}

const configuredCount = computed(() => props.targets.filter(target => target.enabled).length)
const projectLabel = target => target.projectAvailable === false ? `${target.project}（项目已移除）` : target.project

watch(() => props.targets, targets => {
  if (!editing.value && targets.length && !selectedId.value) selectedId.value = targets[0].id
  if (selectedId.value && !targets.some(target => target.id === selectedId.value)) {
    selectedId.value = ''
    editing.value = false
  }
}, { deep: true })
</script>

<template>
  <div class="target-overlay" @click.self="emit('close')">
    <section class="target-modal" role="dialog" aria-modal="true" aria-label="测试目标配置">
      <header class="target-header">
        <div class="title-mark"><MonitorCheck :size="18" /></div>
        <div>
          <h3>测试目标</h3>
          <p>{{ groupName }} · 可为每个项目配置任意数量的验证入口</p>
        </div>
        <button class="icon-button close-button" title="关闭" aria-label="关闭" @click="emit('close')"><X :size="17" /></button>
      </header>

      <div class="target-summary">
        <span><strong>{{ targets.length }}</strong> 个目标</span>
        <span><strong>{{ configuredCount }}</strong> 个已启用</span>
        <button class="primary-command" type="button" @click="addTarget"><Plus :size="15" />添加目标</button>
      </div>

      <div class="target-body">
        <aside class="target-list" aria-label="测试目标列表">
          <div v-if="loading" class="empty-copy">正在读取配置...</div>
          <div v-else-if="!targets.length" class="empty-copy">还没有测试目标</div>
          <button
            v-for="target in targets"
            :key="target.id"
            type="button"
            class="target-row"
            :class="{ active: selectedId === target.id }"
            @click="editTarget(target)"
          >
            <span class="target-state" :class="{ enabled: target.enabled }"><Check :size="11" /></span>
            <span class="target-copy">
              <strong>{{ target.name }}</strong>
              <small>{{ projectLabel(target) }} · {{ target.environment || '默认环境' }}</small>
            </span>
            <span class="kind-label">{{ kindOptions.find(item => item[0] === target.kind)?.[1] || '其他' }}</span>
          </button>
        </aside>

        <form v-if="editing" class="target-editor" @submit.prevent="submit">
          <div class="form-grid two-columns">
            <label><span>所属项目</span><select v-model="form.project" required><option v-for="project in projects" :key="project" :value="project">{{ project }}</option></select></label>
            <label><span>目标名称</span><input v-model.trim="form.name" required maxlength="120" placeholder="例如：Web 用户端" /></label>
            <label><span>目标类型</span><select v-model="form.kind"><option v-for="item in kindOptions" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select></label>
            <label><span>运行环境</span><input v-model.trim="form.environment" maxlength="80" placeholder="test / staging / preview" /></label>
          </div>

          <div class="toggle-line">
            <label><input v-model="form.enabled" type="checkbox" />启用该目标</label>
            <label><input v-model="form.required" type="checkbox" />每次验收必测</label>
          </div>

          <div class="form-grid">
            <label><span>访问地址</span><input v-model.trim="form.baseUrl" type="url" placeholder="http://127.0.0.1:5173" /></label>
            <label><span>启动命令</span><input v-model.trim="form.startupCommand" placeholder="npm run dev -- --port 5173" /></label>
            <label><span>验证命令</span><textarea v-model="form.verificationCommandsText" rows="3" placeholder="每行一条，例如 npm run test\nnpm run build"></textarea></label>
          </div>

          <div class="section-heading"><KeyRound :size="15" /><span>登录与认证</span></div>
          <div class="form-grid two-columns">
            <label><span>认证方式</span><select v-model="form.auth.mode"><option v-for="item in authOptions" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select></label>
            <label v-if="form.auth.mode === 'credentials'"><span>登录路径</span><input v-model.trim="form.auth.loginPath" placeholder="/login" /></label>
          </div>

          <template v-if="form.auth.mode === 'credentials'">
            <div class="credential-head">
              <span>登录字段只在 TestAgent 运行前解密</span>
              <button type="button" class="secondary-command" @click="addAuthField"><Plus :size="14" />添加字段</button>
            </div>
            <div v-for="(field, index) in form.auth.fields" :key="field.id || index" class="credential-row">
              <input v-model.trim="field.label" aria-label="字段名称" placeholder="账号" />
              <input v-model.trim="field.envName" aria-label="环境变量" placeholder="TEST_USERNAME" @input="field.envName = field.envName.toUpperCase()" />
              <input v-model.trim="field.inputLabel" aria-label="页面输入框标签" placeholder="页面标签，如 用户名" />
              <input v-model="field.value" aria-label="凭据值" type="password" :placeholder="field.hasValue ? '已安全保存，留空不修改' : '填写凭据'" />
              <button type="button" class="icon-button danger" title="移除字段" aria-label="移除字段" @click="form.auth.fields.splice(index, 1)"><Trash2 :size="15" /></button>
            </div>
            <div class="form-grid two-columns">
              <label><span>提交按钮名称</span><input v-model.trim="form.auth.submitLabel" placeholder="登录" /></label>
              <label><span>登录后 URL 包含</span><input v-model.trim="form.auth.successUrlIncludes" placeholder="/dashboard" /></label>
              <label class="full-column"><span>登录后应出现文本</span><input v-model.trim="form.auth.successText" placeholder="例如：工作台" /></label>
            </div>
          </template>

          <div v-else-if="form.auth.mode === 'storage_state'" class="form-grid">
            <label><span>Storage State 文件</span><input v-model.trim="form.auth.storageStatePath" placeholder=".ccm/test-auth/user.json" /></label>
            <p class="field-note">路径必须位于项目目录内，状态内容不会发送给模型。</p>
          </div>

          <div v-else-if="form.auth.mode === 'existing_session'" class="form-grid">
            <label><span>已有会话 Provider</span><select v-model="form.auth.existingSessionProvider"><option value="auto">自动</option><option value="claude-in-chrome">Claude in Chrome</option><option value="chrome-devtools">Chrome DevTools</option></select></label>
            <p class="field-note warning">当前正式 worker 没有浏览器 MCP 执行器时，该目标会明确阻止，不会伪装成已登录。</p>
          </div>

          <label class="notes-field"><span>测试说明</span><textarea v-model="form.notes" rows="2" maxlength="800" placeholder="补充入口用途、角色或验收重点"></textarea></label>

          <footer class="editor-footer">
            <button v-if="form.id" type="button" class="danger-command" :disabled="saving" @click="emit('delete', form.id)"><Trash2 :size="15" />删除</button>
            <span v-else></span>
            <div>
              <button type="button" class="secondary-command" @click="editing = false">取消</button>
              <button type="submit" class="primary-command" :disabled="saving"><Save :size="15" />{{ saving ? '保存中...' : '保存目标' }}</button>
            </div>
          </footer>
        </form>

        <div v-else class="editor-empty">
          <MonitorCheck :size="28" />
          <strong>选择一个目标进行编辑</strong>
          <span>目标名称和类型不固定，可覆盖 Web、管理端、H5、API 与客户端。</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.target-overlay{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.26);backdrop-filter:blur(10px)}
.target-modal{width:min(1040px,96vw);height:min(780px,92vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);box-shadow:0 24px 70px rgba(15,23,42,.18)}
.target-header{min-height:68px;display:flex;align-items:center;gap:11px;padding:14px 18px;border-bottom:1px solid var(--border-color)}
.title-mark{width:36px;height:36px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface));color:var(--accent-blue)}
.target-header h3{margin:0;color:var(--text-primary);font-size:16px}.target-header p{margin:3px 0 0;color:var(--text-muted);font-size:11px}.close-button{margin-left:auto}
.target-summary{min-height:48px;display:flex;align-items:center;gap:18px;padding:7px 18px;border-bottom:1px solid var(--border-color);background:var(--panel-muted);color:var(--text-muted);font-size:11px}.target-summary strong{color:var(--text-primary);font-size:13px}.target-summary .primary-command{margin-left:auto}
.target-body{min-height:0;flex:1;display:grid;grid-template-columns:280px minmax(0,1fr)}
.target-list{min-height:0;overflow:auto;padding:10px;border-right:1px solid var(--border-color);background:var(--panel-muted)}
.target-row{width:100%;display:flex;align-items:center;gap:9px;padding:10px;margin-bottom:6px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text-secondary);text-align:left;cursor:pointer}.target-row:hover{background:var(--control-hover)}.target-row.active{border-color:color-mix(in srgb,var(--accent-blue) 28%,var(--border-color));background:var(--surface)}
.target-state{width:18px;height:18px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:var(--control-hover);color:var(--text-muted)}.target-state.enabled{background:rgba(16,185,129,.12);color:#047857}.target-copy{min-width:0;display:grid;gap:3px}.target-copy strong,.target-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.target-copy strong{color:var(--text-primary);font-size:12px}.target-copy small{color:var(--text-muted);font-size:10px}.kind-label{margin-left:auto;flex:0 0 auto;color:var(--text-muted);font-size:10px}
.target-editor{min-height:0;overflow:auto;padding:18px}.form-grid{display:grid;gap:12px;margin-bottom:14px}.two-columns{grid-template-columns:repeat(2,minmax(0,1fr))}.full-column{grid-column:1/-1}.form-grid label,.notes-field{display:grid;gap:6px}.form-grid label>span,.notes-field>span{color:var(--text-secondary);font-size:11px;font-weight:650}
input,select,textarea{width:100%;box-sizing:border-box;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-primary);font:inherit;font-size:12px;outline:0}input,select{height:34px;padding:0 9px}textarea{padding:8px 9px;resize:vertical;line-height:1.5}input:focus,select:focus,textarea:focus{border-color:color-mix(in srgb,var(--accent-blue) 48%,var(--border-color));box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue) 8%,transparent)}
.toggle-line{display:flex;gap:20px;margin:0 0 15px;padding:9px 10px;border:1px solid var(--border-color);border-radius:7px;background:var(--panel-muted)}.toggle-line label{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:11px}.toggle-line input{width:14px;height:14px;accent-color:var(--accent-blue)}
.section-heading{display:flex;align-items:center;gap:7px;margin:20px 0 11px;padding-top:15px;border-top:1px solid var(--border-color);color:var(--text-primary);font-size:12px;font-weight:750}.credential-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;color:var(--text-muted);font-size:10px}.credential-row{display:grid;grid-template-columns:.7fr 1fr 1fr 1.1fr 32px;gap:7px;margin-bottom:7px}.credential-row .icon-button{height:34px}.field-note{margin:-5px 0 14px;color:var(--text-muted);font-size:10px}.field-note.warning{color:#92400e}.notes-field{margin-top:15px}
.editor-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border-color)}.editor-footer>div{display:flex;gap:8px}.primary-command,.secondary-command,.danger-command,.icon-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;font-size:11px;font-weight:650}.primary-command,.secondary-command,.danger-command{min-height:32px;padding:0 11px}.primary-command{border-color:var(--accent-blue);background:var(--accent-blue);color:#fff}.secondary-command{background:var(--surface);color:var(--text-secondary)}.danger-command,.icon-button.danger{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06);color:#b91c1c}.icon-button{width:32px;height:32px;background:transparent;color:var(--text-secondary)}button:disabled{opacity:.55;cursor:not-allowed}.empty-copy{padding:24px 10px;text-align:center;color:var(--text-muted);font-size:11px}.editor-empty{display:grid;place-content:center;justify-items:center;gap:8px;padding:30px;color:var(--text-muted);text-align:center}.editor-empty strong{color:var(--text-secondary);font-size:13px}.editor-empty span{max-width:400px;font-size:11px;line-height:1.5}
@media(max-width:760px){.target-overlay{padding:0}.target-modal{width:100vw;height:100vh;max-height:none;border:0;border-radius:0}.target-body{grid-template-columns:1fr}.target-list{max-height:180px;border-right:0;border-bottom:1px solid var(--border-color)}.two-columns{grid-template-columns:1fr}.credential-row{grid-template-columns:1fr 1fr}.credential-row .icon-button{grid-column:2;justify-self:end}.target-summary{gap:10px}.target-header p{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
