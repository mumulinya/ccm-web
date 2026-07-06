import { ref } from 'vue'

export function useSettingsKnowledge(options = {}) {
  const toast = options.toast || { success: () => {}, error: () => {}, warning: () => {} }
  const confirmDialog = options.confirmDialog || (async () => true)

  const knowledgeFiles = ref([])
  const knowledgeLoading = ref(false)
  const searchQuery = ref('')
  const searchResults = ref(null)
  const isSearching = ref(false)
  const embeddingConfig = ref({
    enabled: false,
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'text-embedding-3-small',
    hasKey: false
  })
  const embeddingSaving = ref(false)

  const loadKnowledgeFiles = async () => {
    knowledgeLoading.value = true
    try {
      const res = await fetch('/api/rag/documents')
      const data = await res.json()
      knowledgeFiles.value = data.documents || []
    } catch {
      toast.error('加载知识库文档失败')
    }
    knowledgeLoading.value = false
  }

  const deleteKnowledgeFile = async (name) => {
    const ok = await confirmDialog(`确定要删除文档「${name}」吗？删除后将无法基于该文档进行知识检索。`)
    if (!ok) return
    try {
      const res = await fetch(`/api/rag/document?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('删除成功')
        loadKnowledgeFiles()
      } else {
        toast.error('删除失败: ' + (data.error || '未知错误'))
      }
    } catch {
      toast.error('请求出错')
    }
  }

  const uploadKnowledgeFile = async (event) => {
    const files = event.target.files || []
    if (files.length === 0) return
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    knowledgeLoading.value = true
    try {
      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        toast.success('文档上传并索引成功！')
        loadKnowledgeFiles()
      } else {
        toast.error('上传失败: ' + (data.error || '未知错误'))
      }
    } catch {
      toast.error('文件上传出错')
    } finally {
      knowledgeLoading.value = false
      event.target.value = ''
    }
  }

  const testKnowledgeQuery = async () => {
    if (!searchQuery.value.trim()) {
      toast.warning('请输入搜索内容')
      return
    }
    isSearching.value = true
    searchResults.value = null
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.value })
      })
      const data = await res.json()
      if (data.success) {
        searchResults.value = data
        toast.success('检索测试完成')
      } else {
        toast.error('检索失败: ' + (data.error || '未知错误'))
      }
    } catch {
      toast.error('检索请求出错')
    }
    isSearching.value = false
  }

  const loadEmbeddingConfig = async () => {
    try {
      const res = await fetch('/api/rag/embedding-config')
      const data = await res.json()
      if (data.success) embeddingConfig.value = { ...embeddingConfig.value, ...data.config, apiKey: '' }
    } catch (error) {
      console.warn('加载知识库向量模型配置失败', error)
    }
  }

  const saveEmbeddingConfig = async () => {
    embeddingSaving.value = true
    const payload = { ...embeddingConfig.value, rebuild: true }
    if (!payload.apiKey) delete payload.apiKey
    try {
      const res = await fetch('/api/rag/embedding-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        embeddingConfig.value = { ...embeddingConfig.value, ...data.config, apiKey: '' }
        toast.success(`知识库向量模型配置已保存，索引分片 ${data.chunksCount || 0} 个`)
      } else {
        toast.error('保存向量配置失败: ' + (data.error || '未知错误'))
      }
    } catch {
      toast.error('保存向量配置出错')
    } finally {
      embeddingSaving.value = false
    }
  }

  return {
    knowledgeFiles,
    knowledgeLoading,
    searchQuery,
    searchResults,
    isSearching,
    embeddingConfig,
    embeddingSaving,
    loadKnowledgeFiles,
    deleteKnowledgeFile,
    uploadKnowledgeFile,
    testKnowledgeQuery,
    loadEmbeddingConfig,
    saveEmbeddingConfig,
  }
}
