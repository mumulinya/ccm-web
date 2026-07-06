import { ref } from 'vue'

const resolveValue = (value) => typeof value === 'function' ? value() : value

export function useCodeChangeDrawer(defaults = {}) {
  const codeChangeDrawer = ref({
    visible: false,
    title: '',
    subtitle: '',
    project: '',
    fileChanges: null,
    files: [],
    selectedPath: '',
  })

  const openCodeChangeDrawer = (fileChanges, options = {}) => {
    const files = options.files || fileChanges?.files || []
    codeChangeDrawer.value = {
      visible: true,
      title: options.title || resolveValue(defaults.title) || 'Agent 代码改动',
      subtitle: options.subtitle || '',
      project: options.project || resolveValue(defaults.project) || '',
      fileChanges: fileChanges || null,
      files,
      selectedPath: options.selectedPath || files?.[0]?.path || fileChanges?.files?.[0]?.path || '',
    }
  }

  const openSingleFileChange = (file, options = {}) => {
    openCodeChangeDrawer(
      { files: [file], count: 1 },
      { selectedPath: file?.path, title: '查看单文件改动', ...options }
    )
  }

  const closeCodeChangeDrawer = () => {
    codeChangeDrawer.value.visible = false
  }

  return {
    codeChangeDrawer,
    openCodeChangeDrawer,
    openSingleFileChange,
    closeCodeChangeDrawer,
  }
}
