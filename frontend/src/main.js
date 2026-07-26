import { createApp } from 'vue'
import './style.css'
import './styles/design-system.css'
import Root from './Root.vue'
import { beginTrackedPageRequest, endTrackedPageRequest } from './utils/pageLoadTracker.js'

const nativeFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  const trackedRequest = beginTrackedPageRequest(args[0], args[1])
  try {
    const response = await nativeFetch(...args)
    const target = typeof args[0] === 'string' ? args[0] : String(args[0]?.url || '')
    if (response.status === 401 && !target.includes('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('ccm-auth-expired'))
    }
    endTrackedPageRequest(trackedRequest, response.ok ? 'success' : 'error')
    return response
  } catch (error) {
    endTrackedPageRequest(trackedRequest, 'error')
    throw error
  }
}

createApp(Root).mount('#app')
