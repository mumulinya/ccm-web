export function downloadCommandJson(filename, value) {
  const safeName = String(filename || 'ccm-export').replace(/[<>:"/\\|?*]+/g, '-')
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeName.endsWith('.json') ? safeName : `${safeName}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
