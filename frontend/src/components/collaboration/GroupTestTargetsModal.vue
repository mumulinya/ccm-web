<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Check, KeyRound, MonitorCheck, Plus, Save, Trash2, X } from '@lucide/vue'

const props = defineProps({
  groupName: { type: String, default: '' },
  ownerLabel: { type: String, default: '' },
  fixedProject: { type: String, default: '' },
  projects: { type: Array, default: () => [] },
  targets: { type: Array, default: () => [] },
  projectAuth: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save', 'delete'])

const kindOptions = [
  ['web', 'Web'], ['h5', 'H5'], ['api', 'API'], ['hybrid_app', '混合应用'],
  ['native_app', '原生应用'], ['other', '其他'],
]
const authOptions = [
  ['none', '无需登录'], ['credentials', '使用项目账号密码'], ['storage_state', '使用项目 Storage State'], ['existing_session', '使用项目浏览器会话'],
]
const selectedId = ref('')
const editing = ref(false)
const form = reactive({})
const projectAuthForm = reactive({})

function emptyProjectAuth() {
  return {
    enabled: false, mode: 'credentials', baseUrl: '', loginPath: '/login', username: '', password: '',
    usernameConfigured: false, passwordConfigured: false, usernameLabel: '用户名', passwordLabel: '密码',
    submitLabel: '登录', successText: '', successUrlIncludes: '', storageStatePath: '', existingSessionProvider: 'auto',
  }
}

function assignProjectAuth(profile = null) {
  const next = profile ? {
    ...emptyProjectAuth(), ...profile, mode: profile.mode === 'none' ? 'credentials' : (profile.mode || 'credentials'),
    username: '', password: '',
  } : emptyProjectAuth()
  Object.keys(projectAuthForm).forEach(key => delete projectAuthForm[key])
  Object.assign(projectAuthForm, next)
}

function emptyForm() {
  return {
    id: '', project: props.fixedProject || props.projects[0] || '', name: '', kind: 'web', environment: 'test',
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

function submit() {
  const authMode = form.auth.mode || 'none'
  emit('save', {
    ...form,
    project: props.fixedProject || form.project,
    verificationCommands: String(form.verificationCommandsText || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean),
    auth: { mode: authMode, fields: [] },
    projectAuth: props.fixedProject && authMode !== 'none' ? {
      ...projectAuthForm,
      enabled: true,
      mode: authMode,
      baseUrl: form.baseUrl || projectAuthForm.baseUrl,
    } : null,
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

watch(() => props.projectAuth, profile => assignProjectAuth(profile), { deep: true, immediate: true })
watch(() => form.auth?.mode, mode => {
  if (props.fixedProject && mode && mode !== 'none') projectAuthForm.mode = mode
})
</script>

<template>
  <div class="target-overlay" @click.self="emit('close')">
    <section class="target-modal" role="dialog" aria-modal="true" aria-label="测试目标配置">
      <header class="target-header">
        <div class="title-mark"><MonitorCheck :size="18" /></div>
        <div>
          <h3>测试目标</h3>
          <p>{{ ownerLabel || groupName }} · {{ fixedProject ? '当前项目的独立验收入口' : '可为每个项目配置任意数量的验证入口' }}</p>
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
            <label v-if="!fixedProject"><span>所属项目</span><select v-model="form.project" required><option v-for="project in projects" :key="project" :value="project">{{ project }}</option></select></label>
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
          <div class="form-grid">
            <label><span>认证方式</span><select v-model="form.auth.mode"><option v-for="item in authOptions" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select></label>
          </div>

          <template v-if="fixedProject && form.auth.mode === 'credentials'">
            <div class="form-grid two-columns project-auth-fields">
              <label><span>登录页面路径</span><input v-model.trim="projectAuthForm.loginPath" placeholder="/login" /><small>填写前端页面路由，不是后端登录接口。</small></label>
              <label><span>登录按钮名称</span><input v-model.trim="projectAuthForm.submitLabel" placeholder="登录" /></label>
              <label><span>登录用户名</span><input v-model="projectAuthForm.username" autocomplete="off" :placeholder="projectAuthForm.usernameConfigured ? '已安全保存，留空不修改' : '填写测试账号'" /></label>
              <label><span>登录密码</span><input v-model="projectAuthForm.password" type="password" autocomplete="new-password" :placeholder="projectAuthForm.passwordConfigured ? '已安全保存，留空不修改' : '填写测试密码'" /></label>
              <label><span>用户名输入框标签</span><input v-model.trim="projectAuthForm.usernameLabel" placeholder="用户名 / 邮箱" /></label>
              <label><span>密码输入框标签</span><input v-model.trim="projectAuthForm.passwordLabel" placeholder="密码" /></label>
              <label><span>登录后 URL 包含</span><input v-model.trim="projectAuthForm.successUrlIncludes" placeholder="/dashboard" /></label>
              <label><span>登录后页面文本</span><input v-model.trim="projectAuthForm.successText" placeholder="例如：工作台" /></label>
            </div>
            <p class="field-note project-auth-note">用户名和密码按“{{ fixedProject }}”项目加密保存；项目 TestAgent和引用该项目的群聊 TestAgent共同读取。</p>
          </template>

          <div v-else-if="fixedProject && form.auth.mode === 'storage_state'" class="form-grid project-auth-fields">
            <label><span>Storage State 文件</span><input v-model.trim="projectAuthForm.storageStatePath" placeholder=".ccm/test-auth/user.json" /><small>路径必须位于项目目录内。</small></label>
          </div>

          <div v-else-if="fixedProject && form.auth.mode === 'existing_session'" class="form-grid project-auth-fields">
            <label><span>已有会话 Provider</span><select v-model="projectAuthForm.existingSessionProvider"><option value="auto">自动</option><option value="claude-in-chrome">Claude in Chrome</option><option value="chrome-devtools">Chrome DevTools</option></select></label>
          </div>

          <p v-else-if="form.auth.mode !== 'none'" class="field-note project-auth-note">
            登录信息从“{{ form.project }}”项目的测试目标配置读取；当前群聊不单独保存用户名或密码。
          </p>

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
input,select,textarea{width:100%;box-sizing:border-box;border:1px solid var(--border-color);border-radius:var(--radius-md,6px);background:var(--control-bg);color:var(--text-primary);font:inherit;font-size:12px;outline:0;transition:border-color .15s ease,box-shadow .15s ease}input,select{height:var(--control-height,34px);padding:0 var(--control-padding-x,10px)}textarea{min-height:64px;padding:8px var(--control-padding-x,10px);resize:vertical;line-height:1.5}input:focus,select:focus,textarea:focus{border-color:var(--accent-blue);box-shadow:var(--focus-ring)}
.toggle-line{display:flex;gap:20px;margin:0 0 15px;padding:9px 10px;border:1px solid var(--border-color);border-radius:7px;background:var(--panel-muted)}.toggle-line label{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:11px}.toggle-line input{width:14px;height:14px;accent-color:var(--accent-blue)}
.section-heading{display:flex;align-items:center;gap:7px;margin:20px 0 11px;padding-top:15px;border-top:1px solid var(--border-color);color:var(--text-primary);font-size:12px;font-weight:750}.credential-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;color:var(--text-muted);font-size:10px}.credential-row{display:grid;grid-template-columns:.7fr 1fr 1fr 1.1fr 32px;gap:7px;margin-bottom:7px}.credential-row .icon-button{height:34px}.field-note{margin:-5px 0 14px;color:var(--text-muted);font-size:10px}.field-note.warning{color:#92400e}.notes-field{margin-top:15px}
.editor-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border-color)}.editor-footer>div{display:flex;gap:8px}.primary-command,.secondary-command,.danger-command,.icon-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;font-size:11px;font-weight:650}.primary-command,.secondary-command,.danger-command{min-height:32px;padding:0 11px}.primary-command{border-color:var(--accent-blue);background:var(--accent-blue);color:#fff}.secondary-command{background:var(--surface);color:var(--text-secondary)}.danger-command,.icon-button.danger{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06);color:#b91c1c}.icon-button{width:32px;height:32px;background:transparent;color:var(--text-secondary)}button:disabled{opacity:.55;cursor:not-allowed}.empty-copy{padding:24px 10px;text-align:center;color:var(--text-muted);font-size:11px}.editor-empty{display:grid;place-content:center;justify-items:center;gap:8px;padding:30px;color:var(--text-muted);text-align:center}.editor-empty strong{color:var(--text-secondary);font-size:13px}.editor-empty span{max-width:400px;font-size:11px;line-height:1.5}
@media(max-width:760px){.target-overlay{padding:0}.target-modal{width:100vw;height:100vh;max-height:none;border:0;border-radius:0}.target-body{grid-template-columns:1fr}.target-list{max-height:180px;border-right:0;border-bottom:1px solid var(--border-color)}.two-columns{grid-template-columns:1fr}.credential-row{grid-template-columns:1fr 1fr}.credential-row .icon-button{grid-column:2;justify-self:end}.target-summary{gap:10px}.target-header p{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
