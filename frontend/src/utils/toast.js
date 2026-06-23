// Toast 通知系统
import { createApp } from 'vue'
import Toast from '../components/Toast.vue'

let toastContainer = null

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    toastContainer.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:8px;padding:20px;pointer-events:none;align-items:center'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

function showToast(message, type = 'info', duration = 3000) {
  const container = getContainer()
  const div = document.createElement('div')
  container.appendChild(div)

  const app = createApp(Toast, { message, type, duration })
  app.mount(div)

  // 自动移除
  setTimeout(() => {
    app.unmount()
    div.remove()
  }, duration + 500)
}

export const toast = {
  info: (message, duration) => showToast(message, 'info', duration),
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => showToast(message, 'error', duration),
  warning: (message, duration) => showToast(message, 'warning', duration),
}

// 替换 alert 的便捷函数
export function notify(message, type = 'info') {
  toast[type](message)
}

// 确认对话框（纯 DOM 实现，不依赖 Vue）
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999999'
    overlay.innerHTML = `
      <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;min-width:320px;text-align:center;font-family:inherit">
        <div style="font-size:36px;margin-bottom:12px">❓</div>
        <div style="font-size:14px;color:#e2e8f0;margin-bottom:20px;line-height:1.6">${message}</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button id="cd-cancel" style="padding:10px 24px;border-radius:8px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer;font-size:14px;font-family:inherit">取消</button>
          <button id="cd-confirm" style="padding:10px 24px;border-radius:8px;border:none;background:linear-gradient(135deg,#38bdf8,#818cf8);color:white;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit">确定</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    overlay.querySelector('#cd-cancel').onclick = () => { overlay.remove(); resolve(false) }
    overlay.querySelector('#cd-confirm').onclick = () => { overlay.remove(); resolve(true) }
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false) } }
  })
}
