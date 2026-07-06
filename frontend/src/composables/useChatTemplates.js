import { computed, ref, nextTick } from 'vue'

const VARIABLE_PATTERN = /\{([a-zA-Z0-9_\u4e00-\u9fa5\s]+)\}/g

const extractTemplateVariables = (template) => {
  const matches = []
  let match
  VARIABLE_PATTERN.lastIndex = 0
  while ((match = VARIABLE_PATTERN.exec(template?.prompt || '')) !== null) {
    if (!matches.includes(match[1])) matches.push(match[1])
  }
  return matches
}

const inferTemplateId = (value) => {
  const text = String(value || '').toLowerCase()
  if (!text || text.startsWith('/') || text.length < 5) return null
  if (text.includes('bug') || text.includes('报错') || text.includes('崩溃') || text.includes('闪退') || text.includes('卡顿') || text.includes('异常')) return 'tpl_bug_fix'
  if (text.includes('前端') || text.includes('页面') || text.includes('组件') || text.includes('写个页面') || text.includes('开发页面') || text.includes('ui')) return 'tpl_frontend_dev'
  if (text.includes('接口') || text.includes('api') || text.includes('后端') || text.includes('服务') || text.includes('路由')) return 'tpl_backend_api'
  if (text.includes('重构') || text.includes('优化') || text.includes('改写') || text.includes('整理')) return 'tpl_refactor'
  if (text.includes('审查') || text.includes('review') || text.includes('看下代码') || text.includes('质量')) return 'tpl_code_review'
  return null
}

export function useChatTemplates(options = {}) {
  const input = options.input
  const showTemplateSelector = ref(false)
  const allTemplates = ref([])
  const templateSearchQuery = ref('')
  const activeTemplateIndex = ref(0)
  const recommendedTemplate = ref(null)
  const showRecommendation = ref(false)
  const activeTemplate = ref(null)
  const templateVariables = ref({})
  const showVariableModal = ref(false)

  const filteredTemplates = computed(() => {
    const query = templateSearchQuery.value.trim().toLowerCase()
    if (!query) return allTemplates.value
    return allTemplates.value.filter(item => String(item.name || '').toLowerCase().includes(query))
  })

  const focusInput = async () => {
    await nextTick()
    options.focusInput?.()
  }

  const loadAllTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      allTemplates.value = data.templates || []
    } catch {
      options.onError?.('加载模板列表失败')
    }
  }

  const hideTemplateAssist = () => {
    showTemplateSelector.value = false
    showRecommendation.value = false
    recommendedTemplate.value = null
  }

  const openTemplateSelector = async () => {
    await loadAllTemplates()
    templateSearchQuery.value = ''
    activeTemplateIndex.value = 0
    showTemplateSelector.value = !showTemplateSelector.value
  }

  const insertPrompt = async (text) => {
    if (!input) return
    if (input.value && !input.value.startsWith('/')) input.value += '\n' + text
    else input.value = text
    await focusInput()
  }

  const openTemplateVariables = (template, seedFirstVariable = '') => {
    const variables = extractTemplateVariables(template)
    if (!variables.length) return false
    activeTemplate.value = template
    templateVariables.value = {}
    variables.forEach((key, index) => {
      templateVariables.value[key] = index === 0 ? seedFirstVariable : ''
    })
    showVariableModal.value = true
    return true
  }

  const selectChatTemplate = (template) => {
    if (!template) return
    hideTemplateAssist()
    if (!openTemplateVariables(template)) insertPrompt(template.prompt)
  }

  const applyTemplateVariables = () => {
    if (!activeTemplate.value) return
    let promptText = activeTemplate.value.prompt
    Object.keys(templateVariables.value).forEach(key => {
      const val = templateVariables.value[key] || `{${key}}`
      promptText = promptText.replaceAll(`{${key}}`, val)
    })
    insertPrompt(promptText)
    showVariableModal.value = false
    activeTemplate.value = null
  }

  const detectRecommendation = (value) => {
    const templateId = inferTemplateId(value)
    if (!templateId) {
      showRecommendation.value = false
      recommendedTemplate.value = null
      return
    }
    const template = allTemplates.value.find(item => item.id === templateId)
    if (template) {
      recommendedTemplate.value = template
      showRecommendation.value = true
      return
    }
    showRecommendation.value = false
    recommendedTemplate.value = null
  }

  const applyRecommendation = () => {
    const template = recommendedTemplate.value
    if (!template || !input) return
    const originalText = input.value.trim()
    showRecommendation.value = false
    recommendedTemplate.value = null
    if (!openTemplateVariables(template, originalText)) input.value = template.prompt
  }

  const handleTemplateKeydown = (event) => {
    if (!showTemplateSelector.value) return false
    const rows = filteredTemplates.value
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      activeTemplateIndex.value = rows.length ? (activeTemplateIndex.value + 1) % rows.length : 0
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      activeTemplateIndex.value = rows.length ? (activeTemplateIndex.value - 1 + rows.length) % rows.length : 0
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      if (rows.length > 0) {
        event.preventDefault()
        selectChatTemplate(rows[activeTemplateIndex.value])
        return true
      }
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      showTemplateSelector.value = false
      return true
    }
    return false
  }

  return {
    showTemplateSelector,
    allTemplates,
    templateSearchQuery,
    activeTemplateIndex,
    recommendedTemplate,
    showRecommendation,
    activeTemplate,
    templateVariables,
    showVariableModal,
    filteredTemplates,
    loadAllTemplates,
    openTemplateSelector,
    selectChatTemplate,
    applyTemplateVariables,
    insertPrompt,
    detectRecommendation,
    applyRecommendation,
    handleTemplateKeydown,
    hideTemplateAssist,
  }
}
