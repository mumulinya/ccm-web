<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import App from './App.vue'
import AuthPage from './components/auth/AuthPage.vue'

const loading = ref(true)
const authenticated = ref(false)
const registrationEnabled = ref(false)
const firstInstall = ref(false)
const loginTheme = ref('command')
const user = ref(null)
const LOGIN_PATH = '/login'
const RETURN_TO_KEY = 'ccm:auth:return-to'

const currentRelativeUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`
const safeReturnUrl = value => {
  const candidate = String(value || '').trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return '/'
  try {
    const parsed = new URL(candidate, window.location.origin)
    if (parsed.origin !== window.location.origin || parsed.pathname === LOGIN_PATH) return '/'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}
const rememberReturnUrl = () => {
  if (window.location.pathname === LOGIN_PATH) return
  sessionStorage.setItem(RETURN_TO_KEY, safeReturnUrl(currentRelativeUrl()))
}
const showLoginRoute = () => {
  rememberReturnUrl()
  if (window.location.pathname !== LOGIN_PATH || window.location.search || window.location.hash) {
    window.history.replaceState({ ccmAuthRoute: true }, '', LOGIN_PATH)
  }
}
const restoreAuthenticatedRoute = () => {
  if (window.location.pathname !== LOGIN_PATH) return
  const destination = safeReturnUrl(sessionStorage.getItem(RETURN_TO_KEY) || '/')
  sessionStorage.removeItem(RETURN_TO_KEY)
  window.history.replaceState({}, '', destination)
}

const applySession = data => {
  authenticated.value = data?.authenticated === true
  registrationEnabled.value = data?.registration_enabled === true
  firstInstall.value = data?.first_install === true
  loginTheme.value = data?.login_theme || 'command'
  user.value = data?.user || null
}

const loadSession = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/auth/session', { headers: { Accept: 'application/json' } })
    const data = await response.json()
    applySession(data)
    if (data?.authenticated === true) restoreAuthenticatedRoute()
    else showLoginRoute()
  } catch {
    applySession(null)
    showLoginRoute()
  } finally {
    loading.value = false
  }
}

const handleAuthenticated = data => {
  applySession({ authenticated: true, registration_enabled: data.registration_enabled, first_install: data.first_install, login_theme: data.login_theme, user: data.user })
  restoreAuthenticatedRoute()
}

const handleExpired = () => {
  showLoginRoute()
  authenticated.value = false
  user.value = null
  void loadSession()
}

const handlePopState = () => {
  if (!authenticated.value) showLoginRoute()
  else restoreAuthenticatedRoute()
}

onMounted(() => {
  window.addEventListener('ccm-auth-expired', handleExpired)
  window.addEventListener('ccm-auth-logout', handleExpired)
  window.addEventListener('popstate', handlePopState)
  void loadSession()
})

onUnmounted(() => {
  window.removeEventListener('ccm-auth-expired', handleExpired)
  window.removeEventListener('ccm-auth-logout', handleExpired)
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <div v-if="loading" class="root-auth-loading" role="status" aria-live="polite">
    <span class="root-auth-mark">CCM</span>
    <strong>正在验证登录状态</strong>
    <i aria-hidden="true"></i>
  </div>
  <App v-else-if="authenticated" />
  <AuthPage
    v-else
    :registration-enabled="registrationEnabled"
    :first-install="firstInstall"
    :default-theme="loginTheme"
    @authenticated="handleAuthenticated"
  />
</template>

<style scoped>
.root-auth-loading { width: 100%; height: 100%; display: grid; place-content: center; justify-items: center; gap: 11px; background: #f4f6f5; color: #17201d; }
.root-auth-mark { width: 48px; height: 48px; display: grid; place-items: center; border: 1px solid #cbd5d0; background: #fff; color: #0e6b4f; font-size: 13px; font-weight: 900; }
.root-auth-loading strong { font-size: 13px; letter-spacing: 0; }
.root-auth-loading i { width: 132px; height: 3px; overflow: hidden; background: #d9e0dc; }
.root-auth-loading i::after { content: ''; display: block; width: 45%; height: 100%; background: #0e6b4f; animation: auth-loading 1s ease-in-out infinite; }
@keyframes auth-loading { from { transform: translateX(-110%); } to { transform: translateX(330%); } }
@media (prefers-reduced-motion: reduce) { .root-auth-loading i::after { animation-duration: 2.2s; } }
</style>
