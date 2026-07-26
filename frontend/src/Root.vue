<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import App from './App.vue'
import AuthPage from './components/auth/AuthPage.vue'
import PageLoadingOverlay from './components/common/PageLoadingOverlay.vue'

const loading = ref(true)
const authenticated = ref(false)
const registrationEnabled = ref(false)
const firstInstall = ref(false)
const loginTheme = ref('command')
const user = ref(null)
const authSlow = ref(false)
let authSlowTimer = null
const LOGIN_PATH = '/login'
const RETURN_TO_KEY = 'ccm:auth:return-to'

const applyStoredThemeBeforeAuth = () => {
  const preset = localStorage.getItem('theme-preset') || 'default'
  const darkPresets = new Set(['deep-void', 'cyberpunk', 'deep-ocean'])
  const lightPresets = new Set(['aurora'])
  const storedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  const theme = darkPresets.has(preset) ? 'dark' : (lightPresets.has(preset) ? 'light' : storedTheme)
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-theme-preset', preset)
}

applyStoredThemeBeforeAuth()

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
  authSlow.value = false
  if (authSlowTimer) window.clearTimeout(authSlowTimer)
  authSlowTimer = window.setTimeout(() => { authSlow.value = true }, 8_000)
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
    if (authSlowTimer) window.clearTimeout(authSlowTimer)
    authSlowTimer = null
    loading.value = false
    authSlow.value = false
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
  if (authSlowTimer) window.clearTimeout(authSlowTimer)
  window.removeEventListener('ccm-auth-expired', handleExpired)
  window.removeEventListener('ccm-auth-logout', handleExpired)
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <PageLoadingOverlay
    v-if="loading"
    viewport
    page-id="authentication"
    title="正在验证登录状态"
    description="正在确认账户和本地服务状态"
    :slow="authSlow"
    @retry="loadSession"
  />
  <App v-else-if="authenticated" />
  <AuthPage
    v-else
    :registration-enabled="registrationEnabled"
    :first-install="firstInstall"
    :default-theme="loginTheme"
    @authenticated="handleAuthenticated"
  />
</template>
