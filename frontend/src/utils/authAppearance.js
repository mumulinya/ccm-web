export const AUTH_THEME_STORAGE_KEY = 'ccm:auth:theme'
export const AUTH_THEME_EVENT = 'ccm:auth-theme-changed'

export const AUTH_THEMES = [
  { id: 'command', label: '星舰控制台', description: '沉浸式控制台背景' },
  { id: 'minimal', label: '极简暗色', description: '安静、低干扰的深色界面' },
  { id: 'light', label: '明亮工作台', description: '适合白天使用的浅色界面' },
]

export function normalizeAuthTheme(value) {
  const id = String(value || '')
  return AUTH_THEMES.some(theme => theme.id === id) ? id : 'command'
}

export function readLocalAuthTheme() {
  try {
    const value = localStorage.getItem(AUTH_THEME_STORAGE_KEY)
    return value ? normalizeAuthTheme(value) : ''
  } catch {
    return ''
  }
}

export function saveLocalAuthTheme(value, notify = true) {
  const theme = normalizeAuthTheme(value)
  try { localStorage.setItem(AUTH_THEME_STORAGE_KEY, theme) } catch {}
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_THEME_EVENT, { detail: { theme } }))
  }
  return theme
}
