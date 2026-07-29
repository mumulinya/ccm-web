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
let csrfToken = ''
let capabilities = []
const authSlow = ref(false)
let authSlowTimer = null
const LOGIN_PATH = '/login'
const RETURN_TO_KEY = 'ccm:auth:return-to'

const nativeFetch = window.fetch.bind(window)
if (!window.__CCM_SECURE_FETCH_INSTALLED__) {
  window.__CCM_SECURE_FETCH_INSTALLED__ = true
  window.fetch = async (input, init = {}) => {
    const request = input instanceof Request ? input : null
    const method = String(init.method || request?.method || 'GET').toUpperCase()
    const rawUrl = request?.url || String(input || '')
    const target = new URL(rawUrl, window.location.origin)
    const headers = new Headers(request?.headers || {})
    new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value))
    if (target.origin === window.location.origin && !['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers.set('X-CCM-CSRF', csrfToken)
    const response = await nativeFetch(input, { ...init, headers })
    if (target.origin === window.location.origin && response.status === 401 && !target.pathname.startsWith('/api/auth/')) window.dispatchEvent(new CustomEvent('ccm-auth-expired'))
    return response
  }
}

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
  csrfToken = String(data?.csrf || data?.session?.csrf || '')
  capabilities = Array.isArray(data?.capabilities) ? data.capabilities : []
  window.__CCM_AUTH__ = { user: user.value, capabilities, csrf: csrfToken }
  document.documentElement.setAttribute('data-auth-role', user.value?.role || 'anonymous')
  window.dispatchEvent(new CustomEvent('ccm-auth-changed', { detail: window.__CCM_AUTH__ }))
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
  applySession({ authenticated: true, registration_enabled: data.registration_enabled, first_install: data.first_install, login_theme: data.login_theme, user: data.user, csrf: data.csrf, capabilities: data.capabilities })
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
