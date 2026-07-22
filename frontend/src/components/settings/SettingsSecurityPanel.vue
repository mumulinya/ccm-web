<script setup>
import { onMounted, ref } from 'vue'
import { KeyRound, LogOut, Save, ShieldCheck, UserPlus } from '@lucide/vue'
import { toast } from '../../utils/toast.js'
import { AUTH_THEMES, normalizeAuthTheme, saveLocalAuthTheme } from '../../utils/authAppearance.js'

const user = ref(null)
const registrationEnabled = ref(false)
const userCount = ref(0)
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
      const response = await fetch('/api/auth/settings')
      const data = await response.json()
      if (response.ok && data.success) {
        registrationEnabled.value = data.registration_enabled === true
        loginTheme.value = normalizeAuthTheme(data.login_theme)
        userCount.value = Number(data.user_count || 0)
      }
    }
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
  try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
  window.dispatchEvent(new CustomEvent('ccm-auth-logout'))
}

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
        <div class="settings-status-copy"><ShieldCheck :size="18" /><div><strong>{{ user?.username || '当前账户' }}</strong><span>{{ user?.role === 'admin' ? '管理员账户' : '普通账户' }} · 已登录</span></div></div>
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

      <div class="settings-security-note"><UserPlus :size="16" /><span>注册只创建普通账户，不会获得项目管理、系统设置或 Agent 凭据管理权限。</span></div>
    </template>
  </section>
</template>
