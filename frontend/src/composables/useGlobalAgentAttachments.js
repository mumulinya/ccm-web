import { ref } from 'vue'

export function useGlobalAgentAttachments(options = {}) {
  const onToggleReport = options.onToggleReport || (() => {})
  const selectedFiles = ref([])
  const fileInput = ref(null)
  const zoomedImage = ref(null)
  const openReports = ref({})

  const triggerFileUpload = () => {
    if (fileInput.value) fileInput.value.click()
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(f => {
      if (selectedFiles.value.some(existing => existing.name === f.name && existing.size === f.size)) return
      if (f.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          selectedFiles.value.push({
            file: f,
            name: f.name,
            size: f.size,
            type: f.type,
            preview: event.target.result
          })
        }
        reader.readAsDataURL(f)
      } else {
        selectedFiles.value.push({
          file: f,
          name: f.name,
          size: f.size,
          type: f.type,
          preview: null
        })
      }
    })
    e.target.value = ''
  }

  const removeSelectedFile = (idx) => {
    selectedFiles.value.splice(idx, 1)
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const zoomImage = (url) => {
    zoomedImage.value = url
  }

  const closeZoom = () => {
    zoomedImage.value = null
  }

  const toggleReport = (key) => {
    openReports.value[key] = !openReports.value[key]
    onToggleReport(key, openReports.value[key])
  }

  const isReportOpen = (key) => {
    return !!openReports.value[key]
  }

  return {
    selectedFiles,
    fileInput,
    zoomedImage,
    openReports,
    triggerFileUpload,
    handleFileChange,
    removeSelectedFile,
    formatSize,
    zoomImage,
    closeZoom,
    toggleReport,
    isReportOpen,
  }
}
