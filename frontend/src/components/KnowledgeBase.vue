<template>
  <div class="knowledge-base-page">
    <!-- 头部栏 -->
    <div class="kb-header aura-card">
      <div class="header-info">
        <div class="header-icon-wrapper">
          <svg class="header-svg-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6.00012L4 3.00012V17.0001L12 20.0001L20 17.0001V3.00012L12 6.00012Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 6V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="header-glow"></span>
        </div>
        <div>
          <h2>本地知识库与文档问答 (RAG)</h2>
          <p>导入本地开发文档，全局助手将在对话时自动检索匹配，作为大模型推理的参考上下文。</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn trigger-rebuild-btn" :disabled="rebuilding" @click="triggerRebuildIndex">
          <span class="btn-icon" :class="{ spinning: rebuilding }">🔄</span>
          {{ rebuilding ? '正在构建索引...' : '重新整理所有索引' }}
        </button>
      </div>
    </div>

    <!-- 主体双栏布局 -->
    <div class="kb-content-grid">
      <!-- 左栏：文件上传与管理 -->
      <div class="kb-left-panel">
        
        <!-- 拖拽上传区 -->
        <div class="panel-card aura-card">
          <div class="panel-card-title">
            <span class="card-title-icon">📥</span>
            <h3>导入新知识文档</h3>
          </div>
          <div 
            class="drag-upload-zone"
            :class="{ dragging: isDragging }"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
          >
            <input 
              type="file" 
              multiple 
              class="file-input" 
              @change="onFileSelected" 
              :disabled="uploading" 
            />
            <div class="upload-icon-wrapper">
              <svg class="upload-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 15V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="upload-pulse"></span>
            </div>
            <p class="upload-title">拖拽文件到这里，或者点击上传</p>
            <p class="upload-desc">支持 .md, .txt, .json, .ts, .js, .py, .go, .java, .pdf 等</p>
            
            <div v-if="uploading" class="upload-progress-bar">
              <div class="progress-fill"></div>
              <span class="progress-text">正在解析并构建文档索引...</span>
            </div>
          </div>
        </div>

        <!-- 本地目录热同步 -->
        <div class="panel-card aura-card" style="margin-top: 16px;">
          <div class="panel-card-title">
            <span class="card-title-icon">📁</span>
            <h3>本地开发目录热同步 (Auto-Sync)</h3>
          </div>
          <div class="dir-watch-setup">
            <p class="section-desc">添加一个本地物理路径，系统将自动监控文件修改并在保存时热刷新索引。</p>
            <div class="dir-input-group">
              <input 
                v-model="newWatchPath" 
                type="text" 
                placeholder="输入本地绝对路径，如 C:\my-project\docs" 
                class="tech-input"
                @keyup.enter="addWatchPath"
              />
              <button class="btn btn-primary" :disabled="!newWatchPath.trim() || pathAdding" @click="addWatchPath">
                <span>➕ 监控路径</span>
              </button>
            </div>

            <!-- 已监视的路径列表 -->
            <div v-if="watchPaths.length > 0" class="watch-paths-list">
              <div v-for="p in watchPaths" :key="p" class="watch-path-item">
                <span class="path-text" :title="p">📂 {{ p }}</span>
                <span class="path-badge">监控中</span>
                <button class="btn-remove-path" title="取消监控" @click="removeWatchPath(p)">&times;</button>
              </div>
            </div>
            <div v-else class="watch-paths-empty">
              当前无监控中的本地文件夹，保存时需要手动上传。
            </div>
          </div>
        </div>

        <!-- 搜索与列表 -->
        <div class="panel-card aura-card" style="margin-top: 16px;">
          <div class="panel-header search-header-flex">
            <div class="panel-card-title">
              <span class="card-title-icon">🗂️</span>
              <h3>已归档文档 ({{ filteredDocs.length }})</h3>
            </div>
            <div class="search-bar">
              <span class="search-icon">🔍</span>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="检索已导入文档..." 
                class="search-input"
              />
            </div>
          </div>

          <div class="doc-list-section">
            <div v-if="loading" class="list-state-loading">
              <span class="spinner-icon">🌀</span> 正在载入知识库...
            </div>

            <div v-else-if="filteredDocs.length === 0" class="list-state-empty">
              <div class="empty-icon">📭</div>
              <p>{{ searchQuery ? '未找到匹配的文档' : '暂无已归档文档' }}</p>
            </div>

            <div v-else class="doc-items-container">
              <div 
                v-for="doc in filteredDocs" 
                :key="doc.name" 
                class="doc-item-card"
              >
                <div class="doc-meta-info">
                  <span class="doc-icon">📄</span>
                  <div class="doc-details">
                    <div class="doc-name" :title="doc.name">{{ doc.name }}</div>
                    
                    <!-- 标签行 -->
                    <div class="doc-tags-wrapper">
                      <span v-for="tag in doc.tags" :key="tag" class="doc-tag">{{ tag }}</span>
                      <button class="btn-add-tag-inline" @click.stop="openTagEditor(doc)">
                        {{ doc.tags?.length ? '✏️ 编辑标签' : '🏷️ 打标签' }}
                      </button>
                    </div>

                    <div class="doc-sub-details">
                      <span>{{ formatSize(doc.size) }}</span>
                      <span class="separator">•</span>
                      <span>{{ doc.chunksCount || 0 }} 分片</span>
                      <span class="separator">•</span>
                      <span class="doc-time">{{ formatDate(doc.uploadedAt) }}</span>
                    </div>
                  </div>
                </div>
                <div class="doc-item-actions">
                  <button class="btn btn-icon-only preview-btn" title="查看内容与分片" @click="viewDocChunks(doc.name)">
                    👁️
                  </button>
                  <button class="btn btn-icon-only delete-btn" title="删除文档" @click="deleteDoc(doc.name)">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：检索与问答沙盒 -->
      <div class="kb-right-panel aura-card">
        <div class="panel-header-tabs">
          <button 
            class="sandbox-tab-btn" 
            :class="{ active: sandboxTab === 'chat' }" 
            @click="sandboxTab = 'chat'"
          >
            🧠 AI 智能问答沙盒
          </button>
          <button 
            class="sandbox-tab-btn" 
            :class="{ active: sandboxTab === 'query' }" 
            @click="sandboxTab = 'query'"
          >
            🔍 匹配得分调试
          </button>
        </div>

        <!-- 标签垂直过滤栏 -->
        <div class="sandbox-tag-filter" v-if="allAvailableTags.length > 0">
          <span class="filter-label">🏷️ 垂直过滤：</span>
          <div class="filter-tags-list">
            <button 
              v-for="t in allAvailableTags" 
              :key="t" 
              class="filter-tag-pill"
              :class="{ selected: selectedFilterTags.includes(t) }"
              @click="toggleFilterTag(t)"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <!-- tab 1: AI 智能问答沙盒 -->
        <div v-if="sandboxTab === 'chat'" class="sandbox-container">
          <div class="query-input-wrapper">
            <input 
              v-model="chatQueryText" 
              type="text" 
              placeholder="向本地文档库提问，例如：'如何配置飞书机器人的签名验证？'..." 
              class="query-input"
              @keyup.enter="runChatTest"
            />
            <button class="btn btn-primary query-submit-btn" :disabled="chatting || !chatQueryText.trim()" @click="runChatTest">
              <span v-if="chatting">🌀 思考中...</span>
              <span v-else>💬 AI 问答</span>
            </button>
          </div>

          <div class="chat-sandbox-results">
            <div v-if="chatting" class="results-loading-state">
              <div class="neon-pulse-wrapper">
                <span class="neon-dot"></span>
              </div>
              <p>大模型正在基于检索到的 RAG 分片进行深度理解与推理答复...</p>
            </div>

            <div v-else-if="!chatReply" class="results-initial-state">
              <div class="sandbox-logo-circle">
                <svg class="sandbox-brain-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 2C11.5 2 12.5 3 12.5 4.5C12.5 5.5 11.5 6 10.5 6.5C9.5 7 8 8 8 9.5V10H6V9.5C6 7.5 7 6.5 8 5.8C9 5.1 9.5 4.5 9.5 4C9.5 3.5 9 3 8 3C7 3 6.5 3.5 6.5 4.5H4.5C4.5 2.5 6 1 8.5 1C9.2 1 9.5 1.4 9.5 2Z" fill="currentColor"/>
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
                  <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <p class="initial-title">输入你的业务问题，由 AI 问答沙盒提供语义解答</p>
              <span class="sandbox-hint">本测试将检索与问题最相关的知识点，并交给统一大模型整合生成最终答复</span>
            </div>

            <div v-else class="chat-response-panel">
              <!-- AI 答复卡片 -->
              <div class="ai-reply-card">
                <div class="ai-reply-header">
                  <div class="ai-avatar">🤖</div>
                  <div class="ai-reply-meta">
                    <h4>CCM 知识助手答复</h4>
                    <span>参考了 {{ chatSourceChunks.length }} 个高关联分片</span>
                  </div>
                </div>
                <div class="ai-reply-body">
                  <pre class="reply-markdown">{{ chatReply }}</pre>
                </div>
              </div>

              <!-- 参考文档来源与得分折叠面板 -->
              <div class="reference-section-collapsible">
                <div class="section-title-bar" @click="showChatReferences = !showChatReferences">
                  <span>📂 查看 {{ chatSourceChunks.length }} 个参考来源分片</span>
                  <span class="arrow-icon" :class="{ rotated: showChatReferences }">▼</span>
                </div>
                <div v-if="showChatReferences" class="reference-chunks-list">
                  <div v-for="(chunk, idx) in chatSourceChunks" :key="idx" class="mini-chunk-card">
                    <div class="mini-chunk-header">
                      <span class="source-file">📄 {{ chunk.filename }}</span>
                      <span class="score-badge">相似度分: {{ chunk.score.toFixed(4) }}</span>
                    </div>
                    <p class="mini-chunk-text">{{ chunk.text }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- tab 2: 匹配得分调试 -->
        <div v-else class="sandbox-container">
          <div class="query-input-wrapper">
            <input 
              v-model="testQueryText" 
              type="text" 
              placeholder="输入你想测试检索的语句，例如：飞书 Webhook 签名配置..." 
              class="query-input"
              @keyup.enter="runQueryTest"
            />
            <button class="btn btn-primary query-submit-btn" :disabled="searching || !testQueryText.trim()" @click="runQueryTest">
              <span v-if="searching">🌀 检索中...</span>
              <span v-else>🔍 检索匹配</span>
            </button>
          </div>

          <div class="query-results-wrapper">
            <div v-if="searching" class="results-loading-state">
              <div class="wave-spinner">
                <span></span><span></span><span></span>
              </div>
              <p>正在执行相似度向量匹配与 TF-IDF 运算...</p>
            </div>

            <div v-else-if="!queryResult" class="results-initial-state">
              <div class="sandbox-logo-circle">
                <svg class="sandbox-brain-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <p class="initial-title">输入查询以启动高级检索匹配得分测试</p>
              <span class="sandbox-hint">系统将返回匹配度最高的 Top 5 知识分片并展示图形化相关得分</span>
            </div>

            <div v-else class="results-content-panel">
              <div class="results-meta-summary">
                <span>检索成功，匹配到 <strong>{{ queryResult.debugChunks?.length || 0 }}</strong> 个高相关分片</span>
                <span class="time-spent">耗时 {{ queryResult.elapsedMs || 3 }} ms</span>
              </div>

              <div v-if="!queryResult.debugChunks || queryResult.debugChunks.length === 0" class="no-match-alert">
                ⚠️ 未匹配到有效得分的分片。请尝试更换关键词，或者检查文件内容是否正确分词。
              </div>

              <div v-else class="chunk-cards-list">
                <div 
                  v-for="(chunk, idx) in queryResult.debugChunks" 
                  :key="idx"
                  class="chunk-score-card"
                  :class="{ active: activeChunkIndex === idx }"
                  @click="activeChunkIndex = idx"
                >
                  <div class="chunk-card-top">
                    <div class="chunk-origin">
                      <span class="file-tag">📄 {{ chunk.filename }}</span>
                      <span class="chunk-index-tag">分片 #{{ idx + 1 }}</span>
                    </div>
                    <div class="chunk-score-badge">
                      得分: <span class="score-num">{{ chunk.score.toFixed(4) }}</span>
                    </div>
                  </div>

                  <div class="chunk-score-visualizer">
                    <div class="visualizer-bar" :style="{ width: getScorePercentage(chunk.score) + '%' }"></div>
                  </div>

                  <p class="chunk-snippet-text">{{ chunk.text }}</p>
                </div>
              </div>

              <!-- 当前选中分片的完整阅读器 -->
              <div v-if="activeChunk" class="active-chunk-viewer aura-card">
                <div class="viewer-header">
                  <h4>📄 {{ activeChunk.filename }} - 完整分片内容</h4>
                  <span class="badge score-badge">检索得分: {{ activeChunk.score.toFixed(6) }}</span>
                </div>
                <div class="viewer-body">
                  <pre class="formatted-text" v-html="highlightKeywords(activeChunk.text, testQueryText)"></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 侧边预览抽屉 (支持原文与分片切换) -->
    <transition name="slide-in">
      <div v-if="showChunksDrawer" class="chunks-preview-drawer">
        <div class="drawer-overlay" @click="showChunksDrawer = false"></div>
        <div class="drawer-container">
          <div class="drawer-header">
            <div class="drawer-title-info">
              <h3>📄 {{ previewFileName }}</h3>
              <div class="drawer-tabs">
                <button 
                  class="drawer-tab-btn" 
                  :class="{ active: drawerSubTab === 'chunks' }" 
                  @click="drawerSubTab = 'chunks'"
                >
                  🗂️ 文档分片 ({{ docChunks.length }})
                </button>
                <button 
                  class="drawer-tab-btn" 
                  :class="{ active: drawerSubTab === 'original' }" 
                  @click="switchDrawerToOriginal"
                >
                  📝 完整原文
                </button>
              </div>
            </div>
            <button class="btn-close-drawer" @click="showChunksDrawer = false">×</button>
          </div>

          <div class="drawer-body">
            <!-- 子 Tab 1: 分片展示 -->
            <div v-if="drawerSubTab === 'chunks'">
              <div v-if="chunksLoading" class="drawer-loading">
                <span class="spinner-icon">🌀</span> 正在载入分片数据...
              </div>
              
              <div v-else-if="docChunks.length === 0" class="drawer-empty">
                未找到此文档的分片，这可能是个空文件。
              </div>

              <div v-else class="drawer-chunks-list">
                <div 
                  v-for="chunk in docChunks" 
                  :key="chunk.index" 
                  class="drawer-chunk-card"
                >
                  <div class="chunk-card-meta">
                    <span class="chunk-badge">分片 #{{ chunk.index }}</span>
                    <span class="tokens-badge">估算词数: {{ chunk.tokenCount }}</span>
                  </div>
                  <div class="chunk-card-content">
                    <pre>{{ chunk.text }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- 子 Tab 2: 完整原文阅读器 -->
            <div v-else>
              <div v-if="originalLoading" class="drawer-loading">
                <span class="spinner-icon">🌀</span> 正在提取文档全文 (支持 PDF 解析)...
              </div>
              <div v-else class="original-content-viewer">
                <pre class="original-pre-box">{{ docOriginalContent }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 标签编辑器弹窗 -->
    <div v-if="showTagEditor" class="tag-editor-overlay" @click.self="showTagEditor = false">
      <div class="tag-editor-modal aura-card">
        <div class="modal-header">
          <h4>🏷️ 编辑文档分类标签</h4>
          <span class="file-label">{{ tagEditingDoc.name }}</span>
        </div>
        <div class="modal-body">
          <p class="modal-hint">标签将用作垂直归类和范围过滤。输入内容并按<strong>回车</strong>添加，以 # 开头。</p>
          
          <!-- 已有标签的删除 -->
          <div class="editor-tags-list">
            <span v-for="tag in tagEditingList" :key="tag" class="editor-tag-pill">
              {{ tag }}
              <button class="btn-remove-tag-pill" @click="removeEditingTag(tag)">&times;</button>
            </span>
          </div>

          <div class="tag-input-group">
            <input 
              v-model="newTagInput" 
              type="text" 
              placeholder="新增标签，例如 #feishu" 
              class="tech-input"
              @keyup.enter="addEditingTag"
            />
            <button class="btn btn-primary" @click="addEditingTag">添加</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showTagEditor = false">取消</button>
          <button class="btn btn-primary" @click="saveDocTags">保存更改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const documents = ref([])
const loading = ref(false)
const rebuilding = ref(false)
const uploading = ref(false)
const searching = ref(false)
const chatting = ref(false)
const isDragging = ref(false)
const searchQuery = ref('')
const testQueryText = ref('')
const queryResult = ref(null)
const activeChunkIndex = ref(0)

const sandboxTab = ref('chat') // 'chat' | 'query'
const selectedFilterTags = ref([]) // 选中的检索过滤标签

// AI 问答终端
const chatQueryText = ref('')
const chatReply = ref('')
const chatSourceChunks = ref([])
const showChatReferences = ref(false)

// 本地目录热监视
const watchPaths = ref([])
const newWatchPath = ref('')
const pathAdding = ref(false)

// 标签编辑
const showTagEditor = ref(false)
const tagEditingDoc = ref(null)
const tagEditingList = ref([])
const newTagInput = ref('')

// 侧边栏预览分片与原文
const showChunksDrawer = ref(false)
const previewFileName = ref('')
const docChunks = ref([])
const docOriginalContent = ref('')
const chunksLoading = ref(false)
const originalLoading = ref(false)
const drawerSubTab = ref('chunks') // 'chunks' | 'original'

// 获取所有已导入文档支持的可用标签
const allAvailableTags = computed(() => {
  const tagsSet = new Set()
  documents.value.forEach(doc => {
    if (Array.isArray(doc.tags)) {
      doc.tags.forEach(t => tagsSet.add(t))
    }
  })
  return Array.from(tagsSet).sort()
})

// 动态过滤文档列表
const filteredDocs = computed(() => {
  if (!searchQuery.value.trim()) return documents.value
  const q = searchQuery.value.toLowerCase()
  return documents.value.filter(doc => doc.name.toLowerCase().includes(q))
})

const activeChunk = computed(() => {
  if (!queryResult.value || !queryResult.value.debugChunks) return null
  return queryResult.value.debugChunks[activeChunkIndex.value] || null
})

// 获取文档列表
const loadDocuments = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/rag/documents')
    const data = await res.json()
    if (data.success) {
      documents.value = data.documents || []
    }
  } catch (e) {
    console.error('获取知识库文档列表失败', e)
  } finally {
    loading.value = false
  }
}

// 触发重建整个索引
const triggerRebuildIndex = async () => {
  rebuilding.value = true
  try {
    const res = await fetch('/api/rag/rebuild', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      alert(`知识库索引重建成功！分片总数：${data.chunksCount}`)
      loadDocuments()
    } else {
      alert('索引重建失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('请求出错')
  } finally {
    rebuilding.value = false
  }
}

// 删除文档
const deleteDoc = async (name) => {
  if (!confirm(`确定要彻底删除文档「${name}」吗？\n删除后系统检索中将不再包含此文档内容。`)) return
  try {
    const res = await fetch(`/api/rag/document?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      loadDocuments()
    } else {
      alert('删除失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('删除请求出错')
  }
}

// 预览分片详情
const viewDocChunks = async (filename) => {
  previewFileName.value = filename
  showChunksDrawer.value = true
  chunksLoading.value = true
  drawerSubTab.value = 'chunks'
  docChunks.value = []
  docOriginalContent.value = ''
  try {
    const res = await fetch(`/api/rag/chunks?filename=${encodeURIComponent(filename)}`)
    const data = await res.json()
    if (data.success) {
      docChunks.value = data.chunks || []
    }
  } catch (e) {
    console.error('载入分片失败', e)
  } finally {
    chunksLoading.value = false
  }
}

// 获取并切换到原文原文展示
const switchDrawerToOriginal = async () => {
  drawerSubTab.value = 'original'
  if (docOriginalContent.value) return // 已经缓存了就不拉了
  originalLoading.value = true
  try {
    const res = await fetch(`/api/rag/document-content?name=${encodeURIComponent(previewFileName.value)}`)
    const data = await res.json()
    if (data.success) {
      docOriginalContent.value = data.content || '该文件内容为空。'
    } else {
      docOriginalContent.value = '获取全文内容失败: ' + (data.error || '未知错误')
    }
  } catch (e) {
    docOriginalContent.value = '请求全文接口时发生网络错误。'
  } finally {
    originalLoading.value = false
  }
}

// 打标签对话框管理
const openTagEditor = (doc) => {
  tagEditingDoc.value = doc
  tagEditingList.value = [...(doc.tags || [])]
  newTagInput.value = ''
  showTagEditor.value = true
}

const addEditingTag = () => {
  let val = newTagInput.value.trim()
  if (!val) return
  if (!val.startsWith('#')) val = `#${val}`
  if (!tagEditingList.value.includes(val)) {
    tagEditingList.value.push(val)
  }
  newTagInput.value = ''
}

const removeEditingTag = (tag) => {
  tagEditingList.value = tagEditingList.value.filter(t => t !== tag)
}

const saveDocTags = async () => {
  try {
    const res = await fetch('/api/rag/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tagEditingDoc.value.name,
        tags: tagEditingList.value
      })
    })
    const data = await res.json()
    if (data.success) {
      showTagEditor.value = false
      loadDocuments()
    } else {
      alert('保存标签失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('保存请求出错')
  }
}

// 标签垂直检索过滤的 toggle
const toggleFilterTag = (tag) => {
  const idx = selectedFilterTags.value.indexOf(tag)
  if (idx > -1) {
    selectedFilterTags.value.splice(idx, 1)
  } else {
    selectedFilterTags.value.push(tag)
  }
}

// 检索匹配测试
const runQueryTest = async () => {
  if (!testQueryText.value.trim()) return
  searching.value = true
  queryResult.value = null
  activeChunkIndex.value = 0
  const started = Date.now()
  try {
    const res = await fetch('/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: testQueryText.value,
        tags: selectedFilterTags.value
      })
    })
    const data = await res.json()
    if (data.success) {
      queryResult.value = {
        debugChunks: data.debugChunks || [],
        elapsedMs: Date.now() - started
      }
    } else {
      alert('检索匹配失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('检索测试请求出错')
  } finally {
    searching.value = false
  }
}

// AI 智能问答沙盒
const runChatTest = async () => {
  if (!chatQueryText.value.trim()) return
  chatting.value = true
  chatReply.value = ''
  chatSourceChunks.value = []
  showChatReferences.value = false

  try {
    const res = await fetch('/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: chatQueryText.value,
        tags: selectedFilterTags.value
      })
    })
    const data = await res.json()
    if (data.success) {
      chatReply.value = data.reply || '大模型未给出有效总结答复。'
      chatSourceChunks.value = data.debugChunks || []
    } else {
      alert('问答测试失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('请求大模型问答出错')
  } finally {
    chatting.value = false
  }
}

// 自动同步文件夹路径监控
const loadWatchPaths = async () => {
  try {
    const res = await fetch('/api/rag/watch-paths')
    const data = await res.json()
    if (data.success) {
      watchPaths.value = data.paths || []
    }
  } catch {}
}

const addWatchPath = async () => {
  const p = newWatchPath.value.trim()
  if (!p) return
  pathAdding.value = true
  try {
    const res = await fetch('/api/rag/watch-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: p })
    })
    const data = await res.json()
    if (data.success) {
      watchPaths.value = data.paths || []
      newWatchPath.value = ''
      alert(data.message || '本地监控文件夹添加成功！目录内受支持的文件修改将自动同步。')
      loadDocuments()
    } else {
      alert('添加监控失败: ' + (data.error || '未找到该路径或参数错误'))
    }
  } catch {
    alert('请求出错')
  } finally {
    pathAdding.value = false
  }
}

const removeWatchPath = async (p) => {
  if (!confirm(`确定要停止监视本地目录「${p}」吗？`)) return
  try {
    const res = await fetch(`/api/rag/watch-paths?path=${encodeURIComponent(p)}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      watchPaths.value = data.paths || []
    }
  } catch {
    alert('取消监控请求异常')
  }
}

// 上传逻辑
const uploadFiles = async (filesList) => {
  if (filesList.length === 0) return
  const formData = new FormData()
  for (let i = 0; i < filesList.length; i++) {
    formData.append('files', filesList[i])
  }
  uploading.value = true
  try {
    const res = await fetch('/api/rag/upload', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (data.success) {
      loadDocuments()
    } else {
      alert('上传失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    alert('上传文件出现错误')
  } finally {
    uploading.value = false
  }
}

const onFileSelected = (e) => {
  const files = e.target.files || []
  uploadFiles(files)
  e.target.value = ''
}

const onDragOver = () => {
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDrop = (e) => {
  isDragging.value = false
  const files = e.dataTransfer?.files || []
  uploadFiles(files)
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (isoStr) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getScorePercentage = (score) => {
  const maxScore = 3.5
  return Math.min(100, Math.max(8, (score / maxScore) * 100))
}

const highlightKeywords = (text, query) => {
  if (!query || !text) return text
  const words = query.trim().split(/\s+/).filter(w => w.length > 0)
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  words.forEach(word => {
    const safeWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    if (safeWord.length > 0) {
      const regex = new RegExp(`(${safeWord})`, 'gi')
      result = result.replace(regex, '<mark class="highlight-mark">$1</mark>')
    }
  })
  return result
}

onMounted(() => {
  loadDocuments()
  loadWatchPaths()
})
</script>

<style scoped>
/* 优雅的极客科技微光样式，支持完美双端自适应 */
.knowledge-base-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  background: var(--bg-primary, #f5f7fa);
}

/* 全局卡片体系设计 (自适应提升高奢质感) */
.aura-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  border-radius: 16px;
  padding: 24px;
  /* 亮色模式下使用精致的微弥散投影 */
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 4px 12px -5px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
}

[data-theme='dark'] .aura-card {
  background: rgba(255, 255, 255, 0.015);
  backdrop-filter: blur(20px);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.aura-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 35px -5px rgba(0, 0, 0, 0.06), 0 8px 16px -6px rgba(0, 0, 0, 0.03);
}

/* 头部面板 */
.kb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  border-left: 4px solid var(--accent-blue, #0072ff);
  flex-shrink: 0;
  min-height: 80px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0, 114, 255, 0.08);
  color: var(--accent-blue, #0072ff);
  flex-shrink: 0;
}

.header-svg-icon {
  width: 24px;
  height: 24px;
  z-index: 2;
}

.header-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: var(--accent-blue, #0072ff);
  opacity: 0.15;
  filter: blur(6px);
  z-index: 1;
}

.header-info h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.header-info p {
  margin: 4px 0 0 0;
  font-size: 12.5px;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

/* 头部右侧按钮 */
.trigger-rebuild-btn {
  background: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #334155);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.trigger-rebuild-btn:hover {
  background: var(--control-hover, #e2e8f0);
  border-color: var(--accent-blue, #0072ff);
  color: var(--accent-blue, #0072ff);
}

.spinning {
  animation: spin 1.5s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 模块卡片布局 */
.panel-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-title-icon {
  font-size: 18px;
}

.panel-card h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

/* 拖拽上传区域 */
.drag-upload-zone {
  border: 2px dashed var(--border-color, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  padding: 32px 20px;
  text-align: center;
  background: var(--bg-primary, #f8fafc);
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

[data-theme='dark'] .drag-upload-zone {
  background: rgba(0, 0, 0, 0.15);
}

.drag-upload-zone:hover, .drag-upload-zone.dragging {
  border-color: var(--accent-blue, #0072ff);
  background: rgba(0, 114, 255, 0.02);
}

.upload-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px auto;
  position: relative;
  color: var(--accent-blue, #0072ff);
}

.upload-svg {
  width: 22px;
  height: 22px;
  z-index: 2;
}

.upload-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--accent-blue, #0072ff);
  opacity: 0.1;
  transform: scale(1);
  animation: ripple 2s infinite ease-out;
  z-index: 1;
}

@keyframes ripple {
  100% { transform: scale(1.6); opacity: 0; }
}

.upload-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #334155);
  margin: 0 0 6px 0;
}

.upload-desc {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

.upload-progress-bar {
  margin-top: 14px;
  background: var(--border-color, #e2e8f0);
  height: 20px;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-fill {
  background: linear-gradient(90deg, #0072ff, #00c6ff);
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  animation: moveShine 2.5s infinite linear;
}

@keyframes moveShine {
  0% { opacity: 0.85; }
  50% { opacity: 1; }
  100% { opacity: 0.85; }
}

.progress-text {
  font-size: 11px;
  color: #fff;
  z-index: 2;
  font-weight: bold;
}

/* 本地目录监控 */
.dir-watch-setup {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dir-input-group {
  display: flex;
  gap: 8px;
}

.tech-input {
  flex: 1;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  color: var(--text-primary);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.tech-input:focus {
  border-color: var(--accent-blue, #0072ff);
  box-shadow: 0 0 0 3px rgba(0, 114, 255, 0.1);
}

.watch-paths-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  padding: 8px;
  border-radius: 8px;
  max-height: 120px;
  overflow-y: auto;
}

[data-theme='dark'] .watch-paths-list {
  background: rgba(0, 0, 0, 0.1);
}

.watch-path-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--surface, #ffffff);
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
}

.path-text {
  font-size: 11.5px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.path-badge {
  background: rgba(76, 175, 80, 0.08);
  color: #2e7d32;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
  border: 1px solid rgba(76, 175, 80, 0.15);
  font-weight: 600;
}

[data-theme='dark'] .path-badge {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
}

.btn-remove-path {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.btn-remove-path:hover {
  color: #ef4444;
}

/* 列表检索搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  background: var(--bg-primary, #f1f5f9);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 8px;
  padding: 6px 10px;
  gap: 8px;
  width: 180px;
}

[data-theme='dark'] .search-bar {
  background: rgba(0,0,0,0.2);
}

.search-icon {
  color: var(--text-secondary, #94a3b8);
  font-size: 12px;
}

.search-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12.5px;
  width: 100%;
  outline: none;
}

/* 列表滚动内容 */
.doc-list-section {
  min-height: 220px;
  margin-top: 12px;
}

.doc-items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 380px;
  overflow-y: auto;
}

.doc-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 8px;
  transition: all 0.2s ease;
}

.doc-item-card:hover {
  background: var(--control-hover, #f8fafc);
  border-color: var(--accent-blue, #0072ff);
}

[data-theme='dark'] .doc-item-card:hover {
  background: rgba(255,255,255,0.02);
}

.doc-icon {
  font-size: 18px;
  margin-top: 2px;
}

.doc-details {
  overflow: hidden;
  flex: 1;
}

.doc-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
}

.doc-tag {
  background: rgba(0, 114, 255, 0.05);
  color: var(--accent-blue, #0072ff);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(0, 114, 255, 0.12);
  white-space: nowrap;
  font-weight: 500;
}

.btn-add-tag-inline {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  font-size: 10px;
  cursor: pointer;
  padding: 1px 4px;
  transition: color 0.2s;
}

.btn-add-tag-inline:hover {
  color: var(--accent-blue, #0072ff);
}

.doc-sub-details {
  font-size: 11px;
  color: var(--text-secondary, #94a3b8);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

/* 右栏：沙盒问答与调试 */
.panel-header-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
  margin-bottom: 16px;
  gap: 16px;
}

.sandbox-tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  font-size: 14px;
  font-weight: 600;
  padding: 8px 4px 12px 4px;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.sandbox-tab-btn:hover {
  color: var(--text-primary);
}

.sandbox-tab-btn.active {
  color: var(--accent-blue, #0072ff);
}

.sandbox-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent-blue, #0072ff);
}

/* 标签过滤选择栏 */
.sandbox-tag-filter {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  padding: 6px 10px;
  border-radius: 8px;
  gap: 6px;
}

[data-theme='dark'] .sandbox-tag-filter {
  background: rgba(0,0,0,0.15);
}

.filter-label {
  font-size: 11.5px;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
}

.filter-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-tag-pill {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.1));
  color: var(--text-secondary);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag-pill:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.filter-tag-pill.selected {
  background: rgba(0, 114, 255, 0.08);
  color: var(--accent-blue, #0072ff);
  border-color: var(--accent-blue, #0072ff);
}

/* 问答沙盒容器 */
.sandbox-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-input-wrapper {
  display: flex;
  gap: 8px;
}

.query-input {
  flex: 1;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: 8px;
  outline: none;
  font-size: 13px;
  transition: all 0.25s ease;
}

.query-input:focus {
  border-color: var(--accent-blue, #0072ff);
  box-shadow: 0 0 0 3px rgba(0, 114, 255, 0.1);
}

/* 检索与问答响应面板 (美化以清除灰色黑斑) */
.query-results-wrapper, .chat-sandbox-results {
  min-height: 400px;
  background: var(--bg-primary, #f8fafc);
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  padding: 20px;
  box-sizing: border-box;
}

[data-theme='dark'] .query-results-wrapper,
[data-theme='dark'] .chat-sandbox-results {
  background: rgba(0, 0, 0, 0.15);
}

/* 初识状态重新设计：使用科技网格呼吸感结构，代替生硬灰底 */
.results-initial-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  color: var(--text-secondary);
  text-align: center;
}

.sandbox-logo-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-blue, #0072ff);
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.sandbox-brain-svg {
  width: 28px;
  height: 28px;
}

.initial-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.sandbox-hint {
  font-size: 11.5px;
  color: var(--text-secondary, #64748b);
  margin-top: 8px;
  max-width: 320px;
  line-height: 1.5;
}

/* AI 答复卡片美化 */
.ai-reply-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
}

.ai-reply-header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 114, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.ai-reply-meta h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-blue, #0072ff);
}

.ai-reply-meta span {
  font-size: 10.5px;
  color: var(--text-secondary, #94a3b8);
}

.ai-reply-body {
  max-height: 240px;
  overflow-y: auto;
}

.reply-markdown {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.6;
}

/* 折叠卡片 */
.reference-section-collapsible {
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 8px;
  background: var(--surface, #ffffff);
}

.section-title-bar {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.section-title-bar span {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.arrow-icon {
  font-size: 11px;
  transition: transform 0.2s;
}

.arrow-icon.rotated {
  transform: rotate(180deg);
}

.reference-chunks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.06));
  max-height: 180px;
  overflow-y: auto;
}

.mini-chunk-card {
  padding: 10px;
  background: var(--bg-primary, #f8fafc);
  border-left: 3px solid var(--accent-cyan, #00bcd4);
  border-radius: 0 6px 6px 0;
  border-top: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

[data-theme='dark'] .mini-chunk-card {
  background: rgba(255,255,255,0.01);
}

.mini-chunk-header {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.mini-chunk-text {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-primary);
  line-height: 1.5;
}

/* 进度得分条 */
.chunk-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.chunk-score-card {
  padding: 12px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chunk-score-card:hover {
  border-color: var(--accent-blue, #0072ff);
}

.chunk-score-card.active {
  border-color: var(--accent-cyan, #00bcd4);
  background: rgba(0, 188, 212, 0.02);
}

.chunk-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chunk-origin {
  display: flex;
  gap: 6px;
  font-size: 11px;
}

.file-tag {
  color: var(--text-primary);
  font-weight: 600;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-index-tag {
  color: var(--text-secondary);
}

.score-num {
  color: var(--accent-cyan, #00bcd4);
  font-weight: bold;
}

.chunk-score-visualizer {
  height: 4px;
  background: var(--border-color, #e2e8f0);
  border-radius: 2px;
  margin-bottom: 8px;
  overflow: hidden;
}

.visualizer-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-cyan, #00bcd4), var(--accent-blue, #0072ff));
  border-radius: 2px;
}

.chunk-snippet-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 分片高亮阅读器 */
.active-chunk-viewer {
  background: var(--surface, #ffffff) !important;
  margin-top: 8px;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.viewer-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.score-badge {
  background: rgba(0, 188, 212, 0.08);
  color: var(--accent-cyan, #00bcd4);
  font-weight: bold;
  border: 1px solid rgba(0, 188, 212, 0.2);
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 4px;
}

.viewer-body {
  max-height: 135px;
  overflow-y: auto;
}

.formatted-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
}

:deep(.highlight-mark) {
  background: rgba(255, 235, 59, 0.25);
  color: #eab308;
  border-radius: 2px;
  padding: 0 2px;
}

/* 侧边预览抽屉 */
.chunks-preview-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.drawer-container {
  position: relative;
  width: 600px;
  height: 100%;
  background: var(--surface, #ffffff);
  border-left: 1px solid var(--border-color);
  box-shadow: -10px 0 30px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  z-index: 2;
}

.drawer-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-title-info h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-tabs {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.drawer-tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
  position: relative;
}

.drawer-tab-btn:hover {
  color: var(--text-primary);
}

.drawer-tab-btn.active {
  color: var(--accent-blue, #0072ff);
}

.drawer-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent-blue, #0072ff);
}

.btn-close-drawer {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.btn-close-drawer:hover {
  color: var(--text-primary);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.drawer-loading, .drawer-empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.drawer-chunks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-chunk-card {
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px;
}

[data-theme='dark'] .drawer-chunk-card {
  background: rgba(255,255,255,0.01);
}

.chunk-card-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 11px;
}

.chunk-badge {
  background: rgba(0, 114, 255, 0.08);
  color: var(--accent-blue, #0072ff);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.tokens-badge {
  color: var(--text-secondary);
}

.chunk-card-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--surface, #ffffff);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

[data-theme='dark'] .chunk-card-content pre {
  background: rgba(0,0,0,0.15);
}

/* 原文阅读器 */
.original-content-viewer {
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

[data-theme='dark'] .original-content-viewer {
  background: rgba(0,0,0,0.15);
}

.original-pre-box {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;
}

/* 标签编辑弹窗 */
.tag-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1010;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-editor-modal {
  width: 440px;
  background: var(--surface, #ffffff) !important;
  box-shadow: 0 12px 48px rgba(0,0,0,0.15);
  border: 1px solid var(--border-color);
}

.modal-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.modal-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.file-label {
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-hint {
  font-size: 11.5px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.editor-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color);
  padding: 10px;
  border-radius: 8px;
  min-height: 60px;
  margin-bottom: 16px;
  align-content: flex-start;
}

[data-theme='dark'] .editor-tags-list {
  background: rgba(0,0,0,0.15);
}

.editor-tag-pill {
  background: rgba(0, 114, 255, 0.08);
  color: var(--accent-blue, #0072ff);
  border: 1px solid rgba(0, 114, 255, 0.15);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-remove-tag-pill {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.btn-remove-tag-pill:hover {
  color: #ef4444;
}

.tag-input-group {
  display: flex;
  gap: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
  padding-top: 14px;
}

/* 抽屉动画 */
.slide-in-enter-active, .slide-in-leave-active {
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.slide-in-enter-from, .slide-in-leave-to {
  transform: translateX(100%);
  opacity: 0.9;
}
</style>
