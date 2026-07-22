import { createApp } from 'vue'
import './style.css'
import './styles/design-system.css'
import Root from './Root.vue'

const nativeFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  const response = await nativeFetch(...args)
  const target = typeof args[0] === 'string' ? args[0] : String(args[0]?.url || '')
  if (response.status === 401 && !target.includes('/api/auth/')) {
    window.dispatchEvent(new CustomEvent('ccm-auth-expired'))
  }
  return response
}

createApp(Root).mount('#app')
