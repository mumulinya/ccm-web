import { ref } from 'vue'
import {
  extractClipboardAttachmentFiles,
  mergeUniqueAttachmentFiles,
} from '../utils/clipboardAttachments.js'

export function useGlobalAgentAttachments(options = {}) {
  const onToggleReport = options.onToggleReport || (() => {})
  const selectedFiles = ref([])
  const fileInput = ref(null)
  const zoomedImage = ref(null)
  const openReports = ref({})

  const triggerFileUpload = () => {
    if (fileInput.value) fileInput.value.click()
  }

  const addFiles = (files) => {
    const currentFiles = selectedFiles.value.map(item => item.file)
    const additions = mergeUniqueAttachmentFiles(currentFiles, files).slice(currentFiles.length)
    const addedItems = []
    additions.forEach(f => {
      if (f.size > 25 * 1024 * 1024) return
      const item = {
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        preview: null
      }
      selectedFiles.value.push(item)
      addedItems.push(item)
      if (String(f.type || '').startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          item.preview = event.target.result
        }
        reader.readAsDataURL(f)
      }
    })
    return addedItems
  }

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  const handleAttachmentPaste = (event) => {
    if (typeof options.canAttach === 'function' && !options.canAttach()) return
    const files = extractClipboardAttachmentFiles(event)
    if (!files.length) return
    event.preventDefault()
    const addedItems = addFiles(files)
    if (addedItems.length && typeof options.onFilesPasted === 'function') {
      options.onFilesPasted(addedItems)
    }
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
    addFiles,
    handleFileChange,
    handleAttachmentPaste,
    removeSelectedFile,
    formatSize,
    zoomImage,
    closeZoom,
    toggleReport,
    isReportOpen,
  }
}
