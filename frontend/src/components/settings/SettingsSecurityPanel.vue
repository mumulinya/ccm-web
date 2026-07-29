<script setup>
import { onMounted, ref } from 'vue'
import { Ban, KeyRound, LogOut, MonitorSmartphone, RefreshCw, Save, ShieldCheck, Trash2, UserCog, UserPlus } from '@lucide/vue'
import { toast } from '../../utils/toast.js'
import { AUTH_THEMES, normalizeAuthTheme, saveLocalAuthTheme } from '../../utils/authAppearance.js'

const user = ref(null)
const registrationEnabled = ref(false)
const userCount = ref(0)
const users = ref([])
const sessions = ref([])
const loginTheme = ref('command')
const loading = ref(true)
const saving = ref(false)
const appearanceSaving = ref(false)
const passwordSaving = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const load = async () => {
  loading.value = true
  try {
    const sessionResponse = await fetch('/api/auth/session')
    const session = await sessionResponse.json()
    user.value = session.user || null
    registrationEnabled.value = session.registration_enabled === true
    loginTheme.value = normalizeAuthTheme(session.login_theme)
    if (user.value?.role === 'admin') {
      const [response, usersResponse] = await Promise.all([fetch('/api/auth/settings'), fetch('/api/auth/users')])
      const [data, usersData] = await Promise.all([response.json(), usersResponse.json()])
      if (response.ok && data.success) {
        registrationEnabled.value = data.registration_enabled === true
        loginTheme.value = normalizeAuthTheme(data.login_theme)
        userCount.value = Number(data.user_count || 0)
      }
      if (usersResponse.ok && usersData.success) users.value = usersData.users || []
    }
    const sessionsResponse = await fetch('/api/auth/sessions')
    const sessionsData = await sessionsResponse.json()
    if (sessionsResponse.ok && sessionsData.success) sessions.value = sessionsData.sessions || []
  } catch {
    toast.error('读取账户设置失败')
  } finally {
    loading.value = false
  }
}

const saveLoginTheme = async theme => {
  loginTheme.value = normalizeAuthTheme(theme)
  appearanceSaving.value = true
  try {
    const response = await fetch('/api/auth/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_theme: loginTheme.value }),
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    loginTheme.value = saveLocalAuthTheme(data.login_theme || loginTheme.value)
    toast.success('默认登录主题已更新')
  } catch (error) {
    toast.error(error?.message || '保存登录主题失败')
  } finally {
    appearanceSaving.value = false
  }
}

const saveRegistration = async () => {
  saving.value = true
  try {
    const response = await fetch('/api/auth/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_enabled: registrationEnabled.value }),
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    userCount.value = Number(data.user_count || userCount.value)
    toast.success(registrationEnabled.value ? '注册已开启' : '注册已关闭')
  } catch (error) {
    toast.error(error?.message || '保存注册设置失败')
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  if (newPassword.value.length < 8) return toast.warning('新密码至少需要 8 个字符')
  if (newPassword.value !== confirmPassword.value) return toast.warning('两次输入的新密码不一致')
  passwordSaving.value = true
  try {
    const response = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword.value, new_password: newPassword.value }),
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '修改密码失败')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.success('密码已更新，请使用新密码重新登录')
    window.dispatchEvent(new CustomEvent('ccm-auth-logout'))
  } catch (error) {
    toast.error(error?.message || '修改密码失败')
  } finally {
    passwordSaving.value = false
  }
}

const logout = async () => {
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.success) throw new Error(data.error || '退出失败')
    window.dispatchEvent(new CustomEvent('ccm-auth-logout'))
  } catch (error) {
    toast.error(error?.message || '服务端未确认退出，请重试')
  }
}

const updateRole = async (target, role) => {
  try {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(target.id)}/role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '角色更新失败')
    await load()
    toast.success('账户角色已更新，相关登录会话已撤销')
  } catch (error) { toast.error(error?.message || '角色更新失败') }
}

const updateStatus = async (target, enabled) => {
  try {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(target.id)}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '状态更新失败')
    await load()
    toast.success(enabled ? '账户已恢复' : '账户已禁用并撤销会话')
  } catch (error) { toast.error(error?.message || '状态更新失败') }
}

const revokeUserSessions = async target => {
  try {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(target.id)}/sessions/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '撤销失败')
    await load()
    toast.success('该账户的登录会话已撤销')
  } catch (error) { toast.error(error?.message || '撤销失败') }
}

const deleteUser = async target => {
  if (!window.confirm(`确定删除账户“${target.username}”吗？此操作不会删除项目和任务数据。`)) return
  try {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(target.id)}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '删除失败')
    await load()
    toast.success('账户已删除')
  } catch (error) { toast.error(error?.message || '删除失败') }
}

const revokeSession = async session => {
  try {
    const response = await fetch(`/api/auth/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '撤销失败')
    if (data.current_revoked) return window.dispatchEvent(new CustomEvent('ccm-auth-logout'))
    await load()
    toast.success('登录会话已撤销')
  } catch (error) { toast.error(error?.message || '撤销失败') }
}

const roleLabel = role => ({ admin: '管理员', operator: '操作员', viewer: '查看者' }[role] || role)

onMounted(load)
</script>

<template>
  <section class="settings-panel" data-settings-panel="security">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <ShieldCheck :size="20" />
        <div>
          <h2>账户与安全</h2>
          <p>管理当前 CCM 本地账户、注册入口和登录密码。</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="settings-status-banner"><div class="settings-status-copy"><ShieldCheck :size="18" /><div><strong>正在读取账户状态</strong><span>请稍候。</span></div></div></div>
    <template v-else>
      <div class="settings-status-banner ready">
        <div class="settings-status-copy"><ShieldCheck :size="18" /><div><strong>{{ user?.username || '当前账户' }}</strong><span>{{ roleLabel(user?.role) }} · 已登录</span></div></div>
        <button type="button" class="settings-button danger" @click="logout"><LogOut :size="15" />退出登录</button>
      </div>

      <div v-if="user?.role === 'admin'" class="settings-section">
        <div class="settings-section-heading"><div><h3>登录页外观</h3><p>选择所有用户首次打开 CCM 时使用的默认登录主题。</p></div><span class="settings-inline-badge">默认主题</span></div>
        <div class="auth-theme-settings" :class="{ saving: appearanceSaving }">
          <button v-for="theme in AUTH_THEMES" :key="theme.id" type="button" :class="{ active: loginTheme === theme.id }" :disabled="appearanceSaving" @click="saveLoginTheme(theme.id)">
            <i :data-auth-preview="theme.id"></i><span><strong>{{ theme.label }}</strong><small>{{ theme.description }}</small></span>
          </button>
        </div>
      </div>

      <div v-if="user?.role === 'admin'" class="settings-section">
        <div class="settings-section-heading"><div><h3>账户与角色</h3><p>Viewer只能查看和只读问答；Operator可执行任务、项目运行和Git；Admin负责系统与高风险操作。</p></div><span class="settings-inline-badge">{{ users.length }} 个账户</span></div>
        <div class="security-user-list">
          <article v-for="entry in users" :key="entry.id" class="security-user-row">
            <div><strong>{{ entry.username }}</strong><span>{{ entry.disabled_at ? '已禁用' : '可用' }} · {{ roleLabel(entry.role) }}</span></div>
            <select :value="entry.role" :disabled="entry.id === user?.id" aria-label="账户角色" @change="updateRole(entry, $event.target.value)"><option value="viewer">Viewer</option><option value="operator">Operator</option><option value="admin">Admin</option></select>
            <button type="button" class="settings-icon-button" :title="entry.disabled_at ? '恢复账户' : '禁用账户'" :disabled="entry.id === user?.id" @click="updateStatus(entry, !!entry.disabled_at)"><RefreshCw v-if="entry.disabled_at" :size="15" /><Ban v-else :size="15" /></button>
            <button type="button" class="settings-icon-button" title="撤销该账户会话" @click="revokeUserSessions(entry)"><MonitorSmartphone :size="15" /></button>
            <button type="button" class="settings-icon-button danger" title="删除账户" :disabled="entry.id === user?.id" @click="deleteUser(entry)"><Trash2 :size="15" /></button>
          </article>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-heading"><div><h3>登录会话</h3><p>查看当前账户的登录设备；管理员可以查看并撤销全部账户会话。</p></div><span class="settings-inline-badge">{{ sessions.length }} 个会话</span></div>
        <div class="security-session-list">
          <article v-for="session in sessions" :key="session.id" class="security-session-row">
            <MonitorSmartphone :size="16" /><div><strong>{{ session.username || user?.username }}{{ session.current ? ' · 当前' : '' }}</strong><span>最近访问 {{ new Date(session.last_seen_at).toLocaleString() }} · 到期 {{ new Date(session.expires_at).toLocaleString() }}</span></div>
            <button type="button" class="settings-button" @click="revokeSession(session)">撤销</button>
          </article>
        </div>
      </div>

      <div v-if="user?.role === 'admin'" class="settings-section">
        <div class="settings-section-heading"><div><h3>注册入口</h3><p>默认关闭。开启后，未登录用户可以在登录页创建普通账户。</p></div><span class="settings-inline-badge">{{ userCount }} 个账户</span></div>
        <label class="settings-switch"><input v-model="registrationEnabled" type="checkbox" /><span class="settings-switch-track"></span><span>{{ registrationEnabled ? '注册已开启' : '注册已关闭' }}</span></label>
        <div class="settings-inline-actions"><button type="button" class="settings-button primary" :disabled="saving" @click="saveRegistration"><Save :size="15" />{{ saving ? '保存中' : '保存注册设置' }}</button></div>
      </div>

      <div class="settings-section">
        <div class="settings-section-heading"><div><h3>修改密码</h3><p>修改后当前登录态会失效，需要使用新密码重新登录。</p></div></div>
        <div class="settings-form settings-form-grid">
          <label class="settings-field"><span>当前密码</span><input v-model="currentPassword" class="settings-input" type="password" autocomplete="current-password" /></label>
          <label class="settings-field"><span>新密码</span><input v-model="newPassword" class="settings-input" type="password" autocomplete="new-password" minlength="8" /></label>
          <label class="settings-field"><span>确认新密码</span><input v-model="confirmPassword" class="settings-input" type="password" autocomplete="new-password" minlength="8" /></label>
        </div>
        <div class="settings-inline-actions"><button type="button" class="settings-button primary" :disabled="passwordSaving" @click="changePassword"><KeyRound :size="15" />{{ passwordSaving ? '更新中' : '更新密码' }}</button></div>
      </div>

      <div class="settings-security-note"><UserPlus :size="16" /><span>开放注册只创建 Viewer，不会获得任务执行、项目管理、系统设置或 Agent 凭据管理权限。</span></div>
    </template>
  </section>
</template>

<style scoped>
.security-user-list,.security-session-list{display:grid;gap:8px}.security-user-row{display:grid;grid-template-columns:minmax(150px,1fr) 118px 34px 34px 34px;align-items:center;gap:8px;padding:10px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-secondary)}.security-user-row>div,.security-session-row>div{min-width:0;display:grid;gap:3px}.security-user-row strong,.security-session-row strong{font-size:12px}.security-user-row span,.security-session-row span{overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.security-user-row select{height:32px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-primary);color:var(--text-primary)}.settings-icon-button{width:34px;height:34px;display:grid;place-items:center;padding:0;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);cursor:pointer}.settings-icon-button:hover{color:var(--accent-color)}.settings-icon-button.danger:hover{color:var(--danger-color)}.settings-icon-button:disabled{opacity:.38;cursor:not-allowed}.security-session-row{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border-color)}@media(max-width:760px){.security-user-row{grid-template-columns:minmax(0,1fr) 110px repeat(3,34px)}.security-user-row>div{grid-column:1/-1}.security-session-row{align-items:start}.security-session-row span{white-space:normal}}
</style>
