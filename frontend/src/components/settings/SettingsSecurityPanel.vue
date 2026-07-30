<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { Ban, ChevronRight, Eye, EyeOff, KeyRound, LogOut, MonitorSmartphone, Palette, RefreshCw, ShieldCheck, Trash2, UserPlus, Users, X } from '@lucide/vue'
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
const activeDialog = ref('')
const dialogRoot = ref(null)
const currentPasswordVisible = ref(false)
const newPasswordVisible = ref(false)
let dialogReturnFocus = null

const currentTheme = computed(() => AUTH_THEMES.find(theme => theme.id === loginTheme.value) || AUTH_THEMES[0])

const openDialog = name => {
  dialogReturnFocus = document.activeElement
  activeDialog.value = name
  nextTick(() => dialogRoot.value?.querySelector('input, button, select')?.focus())
}

const closeDialog = () => {
  const returnFocus = dialogReturnFocus
  activeDialog.value = ''
  currentPasswordVisible.value = false
  newPasswordVisible.value = false
  if (!passwordSaving.value) {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
  nextTick(() => returnFocus?.focus?.())
}

const handleDialogKeydown = event => {
  if (event.key === 'Escape') return closeDialog()
  if (event.key !== 'Tab' || !dialogRoot.value) return
  const focusable = [...dialogRoot.value.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

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

const saveRegistration = async enabled => {
  const previous = registrationEnabled.value
  registrationEnabled.value = enabled
  saving.value = true
  try {
    const response = await fetch('/api/auth/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_enabled: enabled }),
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    userCount.value = Number(data.user_count || userCount.value)
    toast.success(registrationEnabled.value ? '注册已开启' : '注册已关闭')
  } catch (error) {
    registrationEnabled.value = previous
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
    closeDialog()
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
          <p>查看当前账户状态，并按需管理密码、会话和访问权限。</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="settings-status-banner"><div class="settings-status-copy"><ShieldCheck :size="18" /><div><strong>正在读取账户状态</strong><span>请稍候。</span></div></div></div>
    <template v-else>
      <div class="settings-status-banner ready">
        <div class="settings-status-copy"><ShieldCheck :size="18" /><div><strong>{{ user?.username || '当前账户' }}</strong><span>{{ roleLabel(user?.role) }} · 已登录</span></div></div>
        <button type="button" class="settings-button danger" @click="logout"><LogOut :size="15" />退出登录</button>
      </div>

      <div class="security-settings-list" aria-label="账户安全设置">
        <div class="security-setting-row">
          <span class="security-setting-icon"><KeyRound :size="17" /></span>
          <div><strong>登录密码</strong><span>已设置 · 修改后需要重新登录</span></div>
          <button type="button" class="settings-button" @click="openDialog('password')">修改密码<ChevronRight :size="14" /></button>
        </div>

        <div class="security-setting-row">
          <span class="security-setting-icon"><MonitorSmartphone :size="17" /></span>
          <div><strong>登录会话</strong><span>{{ sessions.length }} 个活跃会话{{ sessions.some(session => session.current) ? ' · 当前设备在线' : '' }}</span></div>
          <button type="button" class="settings-button" @click="openDialog('sessions')">管理会话<ChevronRight :size="14" /></button>
        </div>

        <div v-if="user?.role === 'admin'" class="security-setting-row">
          <span class="security-setting-icon"><Users :size="17" /></span>
          <div><strong>账户与角色</strong><span>{{ users.length }} 个账户 · 权限按角色生效</span></div>
          <button type="button" class="settings-button" @click="openDialog('users')">管理账户<ChevronRight :size="14" /></button>
        </div>

        <div v-if="user?.role === 'admin'" class="security-setting-row">
          <span class="security-setting-icon"><UserPlus :size="17" /></span>
          <div><strong>注册入口</strong><span>{{ registrationEnabled ? '允许创建 Viewer 账户' : '已关闭，只有现有账户可登录' }}</span></div>
          <label class="settings-switch compact-switch">
            <input :checked="registrationEnabled" type="checkbox" :disabled="saving" @change="saveRegistration($event.target.checked)" />
            <span class="settings-switch-track"></span><span>{{ saving ? '保存中' : (registrationEnabled ? '已开启' : '已关闭') }}</span>
          </label>
        </div>

        <div v-if="user?.role === 'admin'" class="security-setting-row">
          <span class="security-setting-icon"><Palette :size="17" /></span>
          <div><strong>登录页外观</strong><span>当前使用“{{ currentTheme?.label }}”主题</span></div>
          <button type="button" class="settings-button" @click="openDialog('appearance')">选择主题<ChevronRight :size="14" /></button>
        </div>
      </div>
    </template>
  </section>

  <Teleport to="body">
    <div v-if="activeDialog" class="security-modal-overlay" @click.self="closeDialog" @keydown="handleDialogKeydown">
      <section ref="dialogRoot" class="security-modal" role="dialog" aria-modal="true" :aria-labelledby="`security-${activeDialog}-title`">
        <header class="security-modal-header">
          <div>
            <h3 :id="`security-${activeDialog}-title`">
              {{ activeDialog === 'password' ? '修改密码' : activeDialog === 'sessions' ? '登录会话' : activeDialog === 'users' ? '账户与角色' : '登录页外观' }}
            </h3>
            <p v-if="activeDialog === 'password'">更新后当前会话将退出，请使用新密码重新登录。</p>
            <p v-else-if="activeDialog === 'sessions'">检查活跃设备，并撤销不再使用的登录会话。</p>
            <p v-else-if="activeDialog === 'users'">管理本地账户状态与可执行权限。</p>
            <p v-else>选择所有用户打开登录页时看到的默认主题。</p>
          </div>
          <button type="button" class="settings-icon-button" title="关闭" aria-label="关闭" @click="closeDialog"><X :size="17" /></button>
        </header>

        <div v-if="activeDialog === 'password'" class="security-modal-body password-modal-body">
          <label class="settings-field"><span>当前密码</span><span class="security-password-input"><input v-model="currentPassword" class="settings-input" :type="currentPasswordVisible ? 'text' : 'password'" autocomplete="current-password" /><button type="button" :title="currentPasswordVisible ? '隐藏密码' : '显示密码'" :aria-label="currentPasswordVisible ? '隐藏当前密码' : '显示当前密码'" @click="currentPasswordVisible = !currentPasswordVisible"><EyeOff v-if="currentPasswordVisible" :size="16" /><Eye v-else :size="16" /></button></span></label>
          <label class="settings-field"><span>新密码</span><span class="security-password-input"><input v-model="newPassword" class="settings-input" :type="newPasswordVisible ? 'text' : 'password'" autocomplete="new-password" minlength="8" /><button type="button" :title="newPasswordVisible ? '隐藏密码' : '显示密码'" :aria-label="newPasswordVisible ? '隐藏新密码' : '显示新密码'" @click="newPasswordVisible = !newPasswordVisible"><EyeOff v-if="newPasswordVisible" :size="16" /><Eye v-else :size="16" /></button></span><small>至少 8 个字符</small></label>
          <label class="settings-field"><span>确认新密码</span><input v-model="confirmPassword" class="settings-input" :type="newPasswordVisible ? 'text' : 'password'" autocomplete="new-password" minlength="8" /></label>
        </div>

        <div v-else-if="activeDialog === 'sessions'" class="security-modal-body security-session-list">
          <article v-for="session in sessions" :key="session.id" class="security-session-row">
            <MonitorSmartphone :size="16" /><div><strong>{{ session.username || user?.username }}{{ session.current ? ' · 当前设备' : '' }}</strong><span>最近访问 {{ new Date(session.last_seen_at).toLocaleString() }} · 到期 {{ new Date(session.expires_at).toLocaleString() }}</span></div>
            <button type="button" class="settings-button" @click="revokeSession(session)">撤销</button>
          </article>
          <div v-if="!sessions.length" class="security-modal-empty">暂无活跃登录会话</div>
        </div>

        <div v-else-if="activeDialog === 'users'" class="security-modal-body security-user-list">
          <article v-for="entry in users" :key="entry.id" class="security-user-row">
            <div><strong>{{ entry.username }}</strong><span>{{ entry.disabled_at ? '已禁用' : '可用' }} · {{ roleLabel(entry.role) }}</span></div>
            <select :value="entry.role" :disabled="entry.id === user?.id" :aria-label="`${entry.username}账户角色`" @change="updateRole(entry, $event.target.value)"><option value="viewer">Viewer</option><option value="operator">Operator</option><option value="admin">Admin</option></select>
            <button type="button" class="settings-icon-button" :title="entry.disabled_at ? '恢复账户' : '禁用账户'" :disabled="entry.id === user?.id" @click="updateStatus(entry, !!entry.disabled_at)"><RefreshCw v-if="entry.disabled_at" :size="15" /><Ban v-else :size="15" /></button>
            <button type="button" class="settings-icon-button" title="撤销该账户会话" @click="revokeUserSessions(entry)"><MonitorSmartphone :size="15" /></button>
            <button type="button" class="settings-icon-button danger" title="删除账户" :disabled="entry.id === user?.id" @click="deleteUser(entry)"><Trash2 :size="15" /></button>
          </article>
          <div class="settings-security-note"><UserPlus :size="16" /><span>开放注册只会创建 Viewer，不能执行任务、管理项目或修改系统配置。</span></div>
        </div>

        <div v-else class="security-modal-body auth-theme-settings" :class="{ saving: appearanceSaving }">
          <button v-for="theme in AUTH_THEMES" :key="theme.id" type="button" :class="{ active: loginTheme === theme.id }" :disabled="appearanceSaving" @click="saveLoginTheme(theme.id)">
            <i :data-auth-preview="theme.id"></i><span><strong>{{ theme.label }}</strong><small>{{ theme.description }}</small></span>
          </button>
        </div>

        <footer class="security-modal-footer">
          <button type="button" class="settings-button" @click="closeDialog">关闭</button>
          <button v-if="activeDialog === 'password'" type="button" class="settings-button primary" :disabled="passwordSaving" @click="changePassword"><KeyRound :size="15" />{{ passwordSaving ? '更新中' : '更新密码' }}</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.security-settings-list {
  display: grid;
  border-top: 1px solid var(--border-color);
}

.security-setting-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--border-color);
}

.security-setting-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-secondary);
  color: var(--accent-color);
}

.security-setting-row > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.security-setting-row strong {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 650;
}

.security-setting-row > div > span {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.security-setting-row > .settings-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.compact-switch {
  margin: 0;
}

.security-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(8, 12, 20, 0.56);
  backdrop-filter: blur(5px);
}

.security-modal {
  width: min(640px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
}

.security-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-color);
}

.security-modal-header h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
}

.security-modal-header p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.security-modal-body {
  min-height: 0;
  overflow: auto;
  padding: 16px 20px;
}

.password-modal-body {
  display: grid;
  gap: 14px;
}

.security-password-input {
  position: relative;
  display: block;
}

.security-password-input .settings-input {
  width: 100%;
  padding-right: 42px;
}

.security-password-input button {
  position: absolute;
  top: 50%;
  right: 5px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.security-password-input button:hover,
.security-password-input button:focus-visible {
  background: var(--bg-secondary);
  color: var(--accent-color);
}

.security-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
}

.security-user-list,
.security-session-list {
  display: grid;
  gap: 8px;
}

.security-user-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 118px 34px 34px 34px;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-secondary);
}

.security-user-row > div,
.security-session-row > div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.security-user-row strong,
.security-session-row strong {
  font-size: 12px;
}

.security-user-row span,
.security-session-row span {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.security-user-row select {
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.settings-icon-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.settings-icon-button:hover {
  color: var(--accent-color);
}

.settings-icon-button.danger:hover {
  color: var(--danger-color);
}

.settings-icon-button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.security-session-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-secondary);
}

.security-modal-empty {
  padding: 34px 16px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

.settings-security-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.55;
}

@media (max-width: 760px) {
  .security-setting-row {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    padding: 12px 2px;
  }

  .security-setting-row > .settings-button,
  .security-setting-row > .compact-switch {
    grid-column: 2;
    justify-self: start;
  }

  .security-setting-row > div > span {
    white-space: normal;
  }

  .security-modal-overlay {
    align-items: end;
    padding: 0;
  }

  .security-modal {
    width: 100%;
    max-height: 88vh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 8px 8px 0 0;
  }

  .security-modal-header,
  .security-modal-body,
  .security-modal-footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .security-user-row {
    grid-template-columns: minmax(0, 1fr) 110px repeat(3, 34px);
  }

  .security-user-row > div {
    grid-column: 1 / -1;
  }

  .security-session-row {
    align-items: start;
  }

  .security-session-row span {
    white-space: normal;
  }
}
</style>
