<script setup>
import { ref, onMounted, computed } from 'vue'
import { toolsApi } from '../api/index.js'
import { toast, confirmDialog } from '../utils/toast.js'

const mcpTools = ref([])
const skills = ref([])
const customSkills = ref([]) // 本地物理加载的高级 Customization Skills
const currentFilter = ref('core') // 默认展示 'core' 内置工具
const toolStatus = ref({ mcp: [], skills: [], servers: [] })

// 抽屉状态
const showDrawer = ref(false)
const drawerSkill = ref(null)

// 折叠展开的 MCP 服务器列表
const expandedMcp = ref({})

// 商城与一键下载状态
const marketplaceItems = ref([])
const selectedSource = ref('local')
const marketplaceFilter = ref('all')
const customSourceUrl = ref('')
const smitheryKey = ref('')
const needSmitheryKey = ref(false)
const isSavingKey = ref(false)

// 弹窗状态
const showAddMcp = ref(false)
const showAddSkill = ref(false)

// 新建表单
const newMcp = ref({ name: '', description: '', command: '', env: '' })
const newSkill = ref({ name: '', description: '', prompt: '' })

// 静态定义的系统核心内置工具列表
const coreToolsList = [
  {
    name: 'view_file',
    emoji: '🔍',
    category: '文件 I/O',
    security: '受控授权',
    securityClass: 'sec-warning',
    desc: '读取并检索本地文件内容。支持普通文本文件的行段提取，以及图片、PDF、Word/Excel、音视频等媒体资源的底层预览与结构提取。',
    params: [
      { name: 'AbsolutePath', type: 'String (必填)', desc: '要查看文件的绝对物理路径。' },
      { name: 'StartLine', type: 'Number (可选)', desc: '查看文本文件时的起始行号（1-indexed）。' },
      { name: 'EndLine', type: 'Number (可选)', desc: '查看文本文件时的结束行号（1-indexed）。' }
    ],
    example: 'await view_file({ AbsolutePath: "C:/project/src/main.js", StartLine: 1, EndLine: 100 })'
  },
  {
    name: 'replace_file_content',
    emoji: '✏️',
    category: '代码重写',
    security: '写入确认',
    securityClass: 'sec-danger',
    desc: '对本地文件中的单个连续代码片段执行替换修改。需要提供完全精确的目标内容匹配（包含缩进和换行符），以防止代码错位。',
    params: [
      { name: 'TargetFile', type: 'String (必填)', desc: '目标文件的绝对路径。' },
      { name: 'TargetContent', type: 'String (必填)', desc: '要被替换的精确现有代码段（必须完全一致，包含缩进）。' },
      { name: 'ReplacementContent', type: 'String (必填)', desc: '替换后的完整 drop-in 代码内容。' }
    ],
    example: 'await replace_file_content({ TargetFile: "C:/src/app.js", TargetContent: "const a = 1;", ReplacementContent: "const a = 2;" })'
  },
  {
    name: 'run_command',
    emoji: '💻',
    category: '命令行执行',
    security: '高危确认',
    securityClass: 'sec-danger',
    desc: '在系统宿主环境下执行 shell 指令。支持 Windows PowerShell 及 Unix Bash，可接收实时输出并返回终端当前目录。',
    params: [
      { name: 'CommandLine', type: 'String (必填)', desc: '要在终端执行的完整命令行字符串。' },
      { name: 'Cwd', type: 'String (必填)', desc: '命令执行时的当前工作目录路径。' }
    ],
    example: 'await run_command({ CommandLine: "npm run test", Cwd: "C:/my-project" })'
  },
  {
    name: 'search_web',
    emoji: '🌐',
    category: '搜索引擎',
    security: '自动执行',
    securityClass: 'sec-success',
    desc: '无感调用搜索引擎检索外部互联网资源与最新技术文档。支持通过 query 词条进行多维度查询。',
    params: [
      { name: 'query', type: 'String (必填)', desc: '检索词或检索问题。' }
    ],
    example: 'await search_web({ query: "Vue 3 reactive read-only update logic" })'
  },
  {
    name: 'invoke_subagent',
    emoji: '🤖',
    category: '协同分工',
    security: '受控授权',
    securityClass: 'sec-warning',
    desc: '在后台创建并派发多名拥有特定角色分工的子 Agent 协作处理任务。可进行并发搜索或分布式编译。',
    params: [
      { name: 'Subagents', type: 'Array (必填)', desc: '子 Agent 的声明数组，包含 TypeName, Role, Prompt 等。' }
    ],
    example: 'await invoke_subagent({ Subagents: [{ TypeName: "research", Role: "代码审查员", Prompt: "审查 main.js" }] })'
  }
]

const loadTools = async () => {
  const [mcpData, skillData] = await Promise.all([
    toolsApi.mcp.list(),
    toolsApi.skills.list()
  ])
  mcpTools.value = (mcpData.tools || []).map(t => ({ ...t, type: 'mcp', enabled: t.enabled !== false }))
  skills.value = (skillData.skills || []).map(s => ({ ...s, type: 'skill', enabled: s.enabled !== false }))
  
  // 加载系统物理 Customization Skills
  try {
    const res = await toolsApi.skills.listCustomizations()
    if (res.success) {
      customSkills.value = res.skills || []
    }
  } catch (e) {
    console.error('加载系统高级技能失败:', e)
  }

  // 加载工具连接状态
  try {
    const res = await fetch('/api/tools/status')
    const data = await res.json()
    if (data.success) toolStatus.value = data
  } catch {}

  // 重置激活状态
  needSmitheryKey.value = false

  // 加载外部商城资源
  try {
    const res = await toolsApi.marketplace.list(selectedSource.value, customSourceUrl.value)
    if (res.success) {
      if (res.needKey) {
        needSmitheryKey.value = true
        marketplaceItems.value = []
        try {
          const cfg = await toolsApi.smithery.getKey()
          if (cfg.key) smitheryKey.value = cfg.key
        } catch {}
      } else {
        marketplaceItems.value = (res.items || []).map(item => ({ ...item, installing: false }))
        if (res.error) {
          toast.warning(res.error)
        }
      }
    } else {
      toast.error(res.error || '获取商城列表失败')
    }
  } catch (e) {
    toast.error('获取商城列表失败: ' + e.message)
  }
}

const saveSmitheryKey = async () => {
  if (!smitheryKey.value.trim()) {
    toast.warning('请输入有效的 API Key')
    return
  }
  isSavingKey.value = true
  try {
    const res = await toolsApi.smithery.saveKey(smitheryKey.value.trim())
    if (res.success) {
      toast.success('Smithery API Key 保存成功，官方商城已激活！')
      needSmitheryKey.value = false
      await loadTools()
    } else {
      toast.error('保存失败: ' + res.error)
    }
  } catch (e) {
    toast.error('保存失败: ' + e.message)
  } finally {
    isSavingKey.value = false
  }
}

const onSourceChange = () => {
  if (selectedSource.value !== 'custom' || customSourceUrl.value) {
    loadTools()
  }
}

const filteredTools = () => {
  if (marketplaceFilter.value === 'mcp') {
    return marketplaceItems.value.filter(item => item.type === 'mcp')
  }
  if (marketplaceFilter.value === 'skill') {
    return marketplaceItems.value.filter(item => item.type === 'skill')
  }
  return marketplaceItems.value
}

const isInstalled = (item) => {
  if (item.type === 'mcp') {
    return mcpTools.value.some(t => t.name === item.name)
  } else {
    return skills.value.some(s => s.name === item.name)
  }
}

const installMarketTool = async (item) => {
  item.installing = true
  try {
    const res = await toolsApi.marketplace.install(item)
    if (res.success) {
      toast.success(`"${item.name}" 安装成功，已装备到本地！`)
      await loadTools()
    } else {
      toast.error('安装失败: ' + (res.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求失败: ' + e.message)
  } finally {
    item.installing = false
  }
}

const getServerStatus = (name) => {
  const server = (toolStatus.value.servers || []).find(s => s.name === name)
  return server ? server.connected : false
}

const getServerStatusInfo = (name) => {
  return (toolStatus.value.servers || []).find(s => s.name === name) || { state: 'disconnected', connected: false, retryCount: 0 }
}

const serverStatusLabel = (server) => {
  if (server.connected || server.state === 'connected') return '● 已连接'
  if (server.state === 'auth_required') return '● 需授权'
  if (server.state === 'failed') return '● 失败'
  if (server.state === 'pending') return '● 连接中'
  return '○ 未连接'
}

const getAuthStatusInfo = (name) => {
  return getServerStatusInfo(name).auth || {}
}

const authStatusLabel = (auth) => {
  if (!auth || (!auth.authRequired && !auth.authConfigured)) return 'auth: none'
  if (auth.needsUserAuth) return 'auth: action_required'
  if (auth.authConfigured) return 'auth: configured'
  return 'auth: required'
}

const getSkillToolInfo = (name) => {
  return (toolStatus.value.skillTools || []).find(s => s.name === name) || {}
}

// 展开某个 MCP 服务器拥有的具体 Tools
const getMcpToolsList = (serverName) => {
  return (toolStatus.value.mcp || []).filter(t => t.server === serverName)
}

const toggleMcpExpanded = (name) => {
  expandedMcp.value[name] = !expandedMcp.value[name]
}

const toggleEnabled = async (type, tool) => {
  tool.enabled = !tool.enabled
  if (type === 'mcp') await toolsApi.mcp.create(tool)
  else await toolsApi.skills.create(tool)
}

const deleteTool = async (type, name) => {
  const confirmed = await confirmDialog(`确定删除工具 "${name}"？删除后无法恢复。`)
  if (!confirmed) return
  if (type === 'mcp') await toolsApi.mcp.delete(name)
  else await toolsApi.skills.delete(name)
  loadTools()
  toast.success('工具已删除')
}

const submitAddMcp = async () => {
  if (!newMcp.value.name) { toast.warning('请输入名称'); return }
  if (!newMcp.value.command) { toast.warning('请输入启动命令'); return }
  await toolsApi.mcp.create({ ...newMcp.value, enabled: true })
  showAddMcp.value = false
  newMcp.value = { name: '', description: '', command: '', env: '' }
  loadTools()
  toast.success('MCP 服务器添加成功')
}

const submitAddSkill = async () => {
  if (!newSkill.value.name) { toast.warning('请输入名称'); return }
  await toolsApi.skills.create({ ...newSkill.value, enabled: true })
  showAddSkill.value = false
  newSkill.value = { name: '', description: '', prompt: '' }
  loadTools()
  toast.success('Skill 添加成功')
}

const testMcp = async (tool) => {
  toast.info('正在测试连接...')
  try {
    const res = await fetch('/api/tools/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: tool.command, args: tool.args || [], env: tool.env || '' })
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`连接成功！发现 ${data.tools.length} 个工具: ${data.tools.join(', ')}`)
    } else {
      toast.error(`连接失败: ${data.error}`)
    }
  } catch (e) {
    toast.error('测试失败: ' + e.message)
  }
}

const reloadTools = async () => {
  toast.info('重新加载工具...')
  try {
    const res = await fetch('/api/tools/reload', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      toolStatus.value = data
      toast.success('工具已重新加载')
    }
  } catch (e) {
    toast.error('加载失败: ' + e.message)
  }
}

// 侧滑抽屉展示物理高级技能手册
const openSkillManual = (skill) => {
  drawerSkill.value = skill
  showDrawer.value = true
}

// 极其简单且高性能的 Markdown 渲染器，支持 SKILL.md 文档展示
const renderMarkdown = (md) => {
  if (!md) return ''
  let html = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '') // 去除 YAML header
  html = html.replace(/\r\n/g, '\n')
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 渲染代码块
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const lines = code.trim().split('\n')
    let lang = 'code'
    if (lines[0] && lines[0].length < 10 && !lines[0].includes(' ') && !lines[0].includes('(')) {
      lang = lines.shift()
    }
    return `<pre class="md-code font-mono"><code class="language-${lang}">${lines.join('\n')}</code></pre>`
  })

  // 渲染行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code font-mono">$1</code>')
  
  // 渲染标题
  html = html.replace(/^### (.*$)/gim, '<h4 class="md-h3">$1</h4>')
  html = html.replace(/^## (.*$)/gim, '<h3 class="md-h2">$1</h3>')
  html = html.replace(/^# (.*$)/gim, '<h2 class="md-h1">$1</h2>')
  
  // 渲染粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // 渲染列表项
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="md-li">$1</li>')
  
  // 渲染链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>')
  
  // 渲染段落
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim()
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li') || trimmed.startsWith('<ul')) {
      return p
    }
    return `<p class="md-p">${p.replace(/\n/g, '<br>')}</p>`
  }).join('\n')

  return html
}

onMounted(loadTools)
</script>

<template>
  <div class="tools-config">
    <!-- 顶部玻璃工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:12px">
        <button v-if="currentFilter === 'mcp'" class="btn btn-primary btn-sm" @click="showAddMcp = true">+ MCP 服务器</button>
        <button v-if="currentFilter === 'custom-prompt'" class="btn btn-outline btn-sm" @click="showAddSkill = true">+ Prompt 技能</button>
        <button class="btn btn-outline btn-sm" @click="reloadTools">🔄 重载工具</button>
      </div>
      <span class="count">
        内置: {{ coreToolsList.length }} | MCP: {{ mcpTools.length }} | 技能书: {{ customSkills.length }}
      </span>
    </div>

    <div class="main-content">
      <!-- 左侧分类侧边栏 -->
      <div class="sidebar">
        <div class="sidebar-header">🛠️ 工具与技能中心</div>
        <div class="category-list">
          <div class="category-item" :class="{ active: currentFilter === 'core' }" @click="currentFilter = 'core'">
            <span>⚙️</span><span>内置核心工具</span>
            <span class="badge">{{ coreToolsList.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'mcp' }" @click="currentFilter = 'mcp'">
            <span>🔌</span><span>MCP 连接中心</span>
            <span class="badge">{{ mcpTools.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'custom-skills' }" @click="currentFilter = 'custom-skills'">
            <span>🔮</span><span>系统高级技能书</span>
            <span class="badge">{{ customSkills.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'custom-prompt' }" @click="currentFilter = 'custom-prompt'">
            <span>⚡</span><span>自定义 Prompt 技能</span>
            <span class="badge">{{ skills.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'marketplace' }" @click="currentFilter = 'marketplace'">
            <span>🛒</span><span>技能商城</span>
          </div>
        </div>
      </div>

      <!-- 右侧内容展示面板 -->
      <div class="content">
        <div class="content-header">
          <span>
            {{ 
              currentFilter === 'core' ? '⚙️ 系统内置核心工具' : 
              currentFilter === 'mcp' ? '🔌 MCP 服务与客户端连接中心' : 
              currentFilter === 'custom-skills' ? '🔮 物理加载系统高级技能书' :
              currentFilter === 'custom-prompt' ? '⚡ 用户自定义 Prompt 技能' :
              '🛒 技能与 MCP 一键安装市场' 
            }}
          </span>
          <button class="btn btn-outline btn-sm" @click="loadTools()">↻ 刷新</button>
        </div>

        <div class="tool-list">
          <!-- 1. ⚙️ 系统内置核心工具 -->
          <template v-if="currentFilter === 'core'">
            <div v-for="tool in coreToolsList" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:flex-start;gap:12px;width:100%">
                  <span style="font-size:24px;line-height:1">{{ tool.emoji }}</span>
                  <div style="flex:1">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span class="badge" style="background:rgba(59,130,246,0.1);color:var(--accent-blue)">{{ tool.category }}</span>
                      <span class="security-badge" :class="tool.securityClass">{{ tool.security }}</span>
                    </div>
                    <div class="tool-desc" style="margin-top:6px;font-size:12.5px;line-height:1.5;color:var(--text-secondary)">
                      {{ tool.desc }}
                    </div>

                    <!-- 参数说明 -->
                    <div class="core-tool-section">
                      <div class="section-lbl">📋 参数规格:</div>
                      <div class="params-grid">
                        <div v-for="param in tool.params" :key="param.name" class="param-row">
                          <span class="param-name font-mono">{{ param.name }}</span>
                          <span class="param-type font-mono">{{ param.type }}</span>
                          <span class="param-desc">{{ param.desc }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 代码示例 -->
                    <div class="core-tool-section" style="margin-top:8px">
                      <div class="section-lbl">💻 最佳调用代码用例:</div>
                      <div class="tool-cmd font-mono" style="margin-top:4px">{{ tool.example }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 2. 🔌 MCP 服务连接中心 -->
          <template v-if="currentFilter === 'mcp'">
            <div v-if="mcpTools.length === 0" class="empty">
              <span class="icon">🔌</span>
              <span>暂无 MCP 配置，点击上方按钮新增</span>
            </div>
            <div v-for="tool in mcpTools" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:flex-start;gap:12px;width:100%">
                  <span style="font-size:24px;line-height:1">🔌</span>
                  <div style="flex:1">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span class="conn-status" :class="{ connected: getServerStatus(tool.name), failed: getServerStatusInfo(tool.name).state === 'failed', auth: getServerStatusInfo(tool.name).state === 'auth_required' }">
                        {{ serverStatusLabel(getServerStatusInfo(tool.name)) }}
                      </span>
                    </div>
                    <div class="tool-desc" style="margin-top:4px">{{ tool.description || '暂无描述' }}</div>
                    <div class="tool-cmd font-mono" style="margin-top:8px">{{ tool.command }}</div>
                    <div class="mcp-runtime-status">
                      <span>state: {{ getServerStatusInfo(tool.name).state || 'unknown' }}</span>
                      <span>tools: {{ getMcpToolsList(tool.name).length }}</span>
                      <span>retry: {{ getServerStatusInfo(tool.name).retryCount || 0 }}</span>
                      <span :class="{ danger: getAuthStatusInfo(tool.name).needsUserAuth }">{{ authStatusLabel(getAuthStatusInfo(tool.name)) }}</span>
                      <span v-if="getAuthStatusInfo(tool.name).refreshConfigured">refresh: configured</span>
                      <span v-if="getAuthStatusInfo(tool.name).tokenExpiresAt" :class="{ danger: getAuthStatusInfo(tool.name).tokenExpired }">expires: {{ getAuthStatusInfo(tool.name).tokenExpiresAt }}</span>
                      <span v-if="getAuthStatusInfo(tool.name).elicitationRequired" class="danger">elicitation: blocked</span>
                      <span v-if="getServerStatusInfo(tool.name).lastConnectedAt">connected: {{ getServerStatusInfo(tool.name).lastConnectedAt }}</span>
                      <span v-if="getServerStatusInfo(tool.name).error" class="danger">error: {{ getServerStatusInfo(tool.name).error }}</span>
                      <span v-if="getAuthStatusInfo(tool.name).message" :class="{ danger: getAuthStatusInfo(tool.name).needsUserAuth }">{{ getAuthStatusInfo(tool.name).message }}</span>
                    </div>
                    
                    <!-- 展开的工具列表 -->
                    <div v-if="getServerStatus(tool.name)" class="mcp-details-section">
                      <button class="btn btn-outline btn-sm mcp-expand-btn" @click="toggleMcpExpanded(tool.name)">
                        {{ expandedMcp[tool.name] ? '收起注册工具 ▲' : `查看注册工具 (${getMcpToolsList(tool.name).length} 个) ▼` }}
                      </button>

                      <div v-show="expandedMcp[tool.name]" class="mcp-tools-expand-box">
                        <div v-if="getMcpToolsList(tool.name).length === 0" class="empty-sm">该服务器未向系统注册任何工具。</div>
                        <div v-for="subt in getMcpToolsList(tool.name)" :key="subt.name" class="mcp-subtool-card">
                          <div class="subtool-name font-mono">🔧 {{ subt.name }}</div>
                          <div class="subtool-desc">{{ subt.description }}</div>
                          
                          <!-- schema参数表格 -->
                          <div v-if="subt.schema?.properties" class="subtool-schema">
                            <div class="schema-lbl font-mono">Arguments Schema:</div>
                            <div class="params-grid font-mono">
                              <div v-for="(val, key) in subt.schema.properties" :key="key" class="param-row">
                                <span class="param-name">{{ key }}</span>
                                <span class="param-type">{{ val.type || 'any' }}{{ subt.schema.required?.includes(key) ? ' (required)' : '' }}</span>
                                <span class="param-desc" style="color:var(--text-muted)">{{ val.description || '-' }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-outline btn-sm" @click="testMcp(tool)">测试连接</button>
                    <label class="toggle">
                      <input type="checkbox" :checked="tool.enabled" @change="toggleEnabled('mcp', tool)">
                      <span>启用</span>
                    </label>
                    <button class="btn btn-danger btn-sm" @click="deleteTool('mcp', tool.name)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 3. 🔮 物理加载系统高级技能书 -->
          <template v-if="currentFilter === 'custom-skills'">
            <div v-if="customSkills.length === 0" class="empty">
              <span class="icon">🔮</span>
              <span>未扫描到系统加载的 Customization 物理技能文件夹</span>
            </div>
            <div class="custom-skills-grid">
              <div v-for="skill in customSkills" :key="skill.id" class="skill-card-fancy">
                <div class="skill-card-header">
                  <span class="skill-icon">🔮</span>
                  <div class="skill-meta">
                    <div class="skill-name">{{ skill.name }}</div>
                    <div class="skill-id font-mono">skills/{{ skill.id }}</div>
                  </div>
                  <span class="badge" style="background:rgba(168,85,247,0.1);color:var(--accent-purple)">物理激活</span>
                </div>
                <div class="skill-card-body">
                  {{ skill.description || '暂无描述' }}
                </div>
                <div class="skill-card-footer">
                  <button class="btn btn-primary btn-sm btn-block" @click="openSkillManual(skill)">
                    📖 查看技能使用手册 (SKILL.md)
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- 4. ⚡ 用户自定义 Prompt 技能 -->
          <template v-if="currentFilter === 'custom-prompt'">
            <div v-if="skills.length === 0" class="empty">
              <span class="icon">⚡</span>
              <span>暂无自定义 Prompt 技能，点击上方按钮新增</span>
            </div>
            <div v-for="tool in skills" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:flex-start;gap:12px;width:100%">
                  <span style="font-size:24px;line-height:1">⚡</span>
                  <div style="flex:1">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span class="security-badge sec-success">SkillTool</span>
                    </div>
                    <div class="tool-desc" style="margin-top:4px">{{ tool.description || '暂无描述' }}</div>
                    <div class="mcp-runtime-status">
                      <span>invoke: {{ getSkillToolInfo(tool.name).invokeToolName || 'invoke_skill' }}</span>
                      <span>tool: {{ getSkillToolInfo(tool.name).toolName || `skill:${tool.name}` }}</span>
                      <span v-if="getSkillToolInfo(tool.name).contentHash">hash: {{ getSkillToolInfo(tool.name).contentHash }}</span>
                      <span v-if="toolStatus.skillAuditFile">audit: {{ toolStatus.skillAuditFile }}</span>
                    </div>
                    <div class="tool-prompt" style="margin-top:8px">📝 {{ tool.prompt }}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <label class="toggle">
                      <input type="checkbox" :checked="tool.enabled" @change="toggleEnabled('skill', tool)">
                      <span>启用</span>
                    </label>
                    <button class="btn btn-danger btn-sm" @click="deleteTool('skill', tool.name)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 5. 🛒 技能与 MCP 一键安装市场 -->
          <template v-if="currentFilter === 'marketplace'">
            <div class="marketplace-source-selector">
              <span style="font-size:12.5px;color:var(--text-secondary);font-weight:600">🛒 商城数据源:</span>
              <select v-model="selectedSource" @change="onSourceChange">
                <option value="local">本地官方精选 (CCM Local)</option>
                <option value="github">社区精选源 (GitHub Remote)</option>
                <option value="smithery">Smithery 官方商店 (Smithery.ai)</option>
                <option value="custom">自定义远程 JSON 源 (Custom URL)</option>
              </select>

              <span style="font-size:12.5px;color:var(--text-secondary);font-weight:600;margin-left:8px">🛠️ 类型筛选:</span>
              <div class="mfilter-tab">
                <button type="button" @click="marketplaceFilter = 'all'" :class="{ active: marketplaceFilter === 'all' }">全部</button>
                <button type="button" @click="marketplaceFilter = 'mcp'" :class="{ active: marketplaceFilter === 'mcp' }">MCP 服务器</button>
                <button type="button" @click="marketplaceFilter = 'skill'" :class="{ active: marketplaceFilter === 'skill' }">Skills</button>
              </div>
              <div v-if="selectedSource === 'custom'" style="display:flex;gap:6px;flex:1;min-width:260px">
                <input v-model="customSourceUrl" placeholder="请输入远程 JSON 配置的 URL 链接..." @keyup.enter="loadTools">
                <button class="btn btn-primary btn-sm" @click="loadTools">加载</button>
              </div>
            </div>

            <!-- Smithery API Key 激活浮窗 -->
            <div v-if="selectedSource === 'smithery' && needSmitheryKey" class="smithery-activation-card">
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px">
                <span>🔑</span><span>激活 Smithery 官方应用商店</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px;line-height:1.5">
                本地未检测到有效的 Smithery 密钥。请配置您的 API Key 以安全接入其官方注册中心。
                <a href="https://smithery.ai/account/api-keys" target="_blank">免费申请 API Key ↗</a>
              </div>
              <div style="display:flex;gap:8px;margin-top:14px;max-width:480px">
                <input v-model="smitheryKey" type="password" placeholder="请输入您的 Smithery Bearer API Key..." @keyup.enter="saveSmitheryKey">
                <button class="btn btn-primary btn-sm" :disabled="isSavingKey" @click="saveSmitheryKey">
                  {{ isSavingKey ? '正在激活...' : '激活并加载' }}
                </button>
              </div>
            </div>

            <div v-if="filteredTools().length === 0" class="empty">
              <span class="icon">📦</span>
              <span>暂无商城工具</span>
            </div>
            <div v-for="tool in filteredTools()" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:20px">{{ tool.type === 'mcp' ? '🔌' : '⚡' }}</span>
                  <div>
                    <div class="tool-name">
                      <span style="margin-right:2px">{{ tool.emoji || '📦' }}</span>
                      {{ tool.name }}
                      <span v-if="tool.author" style="font-size:11px;color:var(--text-muted);font-weight:normal;margin-left:6px">by {{ tool.author }}</span>
                    </div>
                    <div class="tool-desc">{{ tool.description || '' }}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="badge" :style="{ background: tool.type === 'mcp' ? 'rgba(167,139,250,0.2)' : 'rgba(250,204,21,0.2)', color: tool.type === 'mcp' ? 'var(--accent-purple)' : 'var(--accent-yellow)' }">
                    {{ tool.type === 'mcp' ? 'MCP' : 'Skill' }}
                  </span>
                  <button v-if="isInstalled(tool)" class="btn btn-outline btn-sm" disabled style="opacity:0.75;cursor:not-allowed">
                    ✓ 已安装/已启用
                  </button>
                  <button v-else class="btn btn-primary btn-sm" :disabled="tool.installing" @click="installMarketTool(tool)">
                    {{ tool.installing ? '安装中...' : '📥 一键安装' }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 侧拉抽屉：用于展示高级技能手册 SKILL.md -->
    <div class="drawer-overlay" :class="{ show: showDrawer }" @click.self="showDrawer = false">
      <div class="drawer" :class="{ show: showDrawer }">
        <div class="drawer-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">📖</span>
            <div>
              <div class="drawer-title">{{ drawerSkill?.name }}</div>
              <div class="drawer-subtitle font-mono">skills/{{ drawerSkill?.id }}/SKILL.md</div>
            </div>
          </div>
          <button class="drawer-close" @click="showDrawer = false">&times;</button>
        </div>
        <div class="drawer-body">
          <div class="markdown-body" v-html="renderMarkdown(drawerSkill?.content)"></div>
        </div>
      </div>
    </div>

    <!-- 添加 MCP 弹窗 -->
    <div v-if="showAddMcp" class="modal-overlay" @click.self="showAddMcp = false">
      <div class="modal">
        <button class="modal-close" @click="showAddMcp = false">&times;</button>
        <h3>添加 MCP 服务器</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="newMcp.name" placeholder="如 mcp-feishu">
        </div>
        <div class="form-group">
          <label>描述</label>
          <input v-model="newMcp.description" placeholder="简要描述功能">
        </div>
        <div class="form-group">
          <label>启动命令</label>
          <input v-model="newMcp.command" placeholder="如 npx @modelcontextprotocol/server-filesystem /path">
          <div class="form-hint">MCP 服务器的启动命令，会通过 stdio 通信</div>
        </div>
        <div class="form-group">
          <label>环境变量（可选）</label>
          <textarea v-model="newMcp.env" placeholder="KEY=value&#10;ANOTHER_KEY=value2" rows="3"></textarea>
          <div class="form-hint">每行一个 KEY=value 格式的环境变量</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showAddMcp = false">取消</button>
          <button class="btn btn-primary" @click="submitAddMcp">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加 Skill 弹窗 -->
    <div v-if="showAddSkill" class="modal-overlay" @click.self="showAddSkill = false">
      <div class="modal">
        <button class="modal-close" @click="showAddSkill = false">&times;</button>
        <h3>添加自定义 Prompt 技能</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="newSkill.name" placeholder="如 code-review">
        </div>
        <div class="form-group">
          <label>描述</label>
          <input v-model="newSkill.description" placeholder="简要描述功能">
        </div>
        <div class="form-group">
          <label>Prompt 模板</label>
          <textarea v-model="newSkill.prompt" placeholder="请审查以下代码，关注安全性、性能 and 可维护性..." rows="5"></textarea>
          <div class="form-hint">Skill 执行时注入到 Agent 上下文的 prompt 模板</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showAddSkill = false">取消</button>
          <button class="btn btn-primary" @click="submitAddSkill">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tools-config { display: flex; flex-direction: column; height: 100%; position: relative; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 8px; }
.count { font-size: 11.5px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.main-content { display: flex; flex: 1; overflow: hidden; }

/* 侧边栏样式 */
.sidebar { width: 220px; background: rgba(255, 255, 255, 0.15); border-right: 1px solid rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; }
.sidebar-header { padding: 16px; font-size: 13px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.category-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.category-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; color: var(--text-secondary); transition: all 0.25s; font-size: 12.5px; }
.category-item:hover { background: rgba(59, 130, 246, 0.04); color: var(--accent-blue); }
.category-item.active { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); font-weight: 600; }
.badge { font-size: 9.5px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; margin-left: auto; font-family: 'Share Tech Mono', monospace; color: var(--text-muted); }

/* 主内容区 */
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.tool-list { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

/* 卡片样式 */
.tool-card { background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(25px); border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 12px; padding: 18px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.tool-card:hover { border-color: rgba(59, 130, 246, 0.2); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.04); transform: translateY(-1px); }
.tool-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tool-name { font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.conn-status { font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(239, 68, 68, 0.08); color: var(--accent-red); }
.conn-status.connected { background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.conn-status.failed { background: rgba(245, 158, 11, 0.12); color: #b45309; }
.conn-status.auth { background: rgba(59, 130, 246, 0.10); color: var(--accent-blue); }
.mcp-runtime-status { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; font-size:11px; color:var(--text-muted); }
.mcp-runtime-status span { max-width:100%; padding:2px 6px; border-radius:6px; background:rgba(148,163,184,.12); overflow-wrap:anywhere; }
.mcp-runtime-status .danger { color:#b91c1c; background:rgba(239,68,68,.1); }

.security-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
.sec-success { background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.sec-warning { background: rgba(245, 158, 11, 0.08); color: var(--accent-yellow); }
.sec-danger { background: rgba(239, 68, 68, 0.08); color: var(--accent-red); }

.tool-desc { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.tool-cmd { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 6px; padding: 8px 12px; background: rgba(0, 0, 0, 0.02); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.04); overflow-x: auto; white-space: pre; }
.tool-prompt { font-size: 11px; color: var(--text-muted); margin-top: 6px; font-style: italic; background: rgba(0,0,0,0.01); padding: 8px; border-radius: 6px; }

/* 核心内置工具扩展参数 */
.core-tool-section { margin-top: 12px; border-top: 1px dashed rgba(0,0,0,0.03); padding-top: 10px; }
.section-lbl { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.params-grid { display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.015); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.02); }
.param-row { display: grid; grid-template-columns: 180px 140px 1fr; gap: 8px; font-size: 11px; line-height: 1.4; border-bottom: 1px dashed rgba(0,0,0,0.02); padding: 4px 0; }
.param-row:last-child { border-bottom: none; }
.param-name { font-weight: 600; color: var(--accent-blue); }
.param-type { color: var(--text-muted); }
.param-desc { color: var(--text-secondary); }

/* MCP 子工具细节展示 */
.mcp-details-section { margin-top: 12px; border-top: 1px dashed rgba(0,0,0,0.04); padding-top: 10px; }
.mcp-expand-btn { padding: 4px 10px; font-size: 11px; border-radius: 6px; }
.mcp-tools-expand-box { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.01); border-radius: 8px; padding: 12px; border: 1px solid rgba(0,0,0,0.02); }
.mcp-subtool-card { border-bottom: 1px dashed rgba(0,0,0,0.03); padding-bottom: 10px; margin-bottom: 4px; }
.mcp-subtool-card:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
.subtool-name { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.subtool-desc { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }
.subtool-schema { margin-top: 8px; }
.schema-lbl { font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }

/* 物理高级技能书网格 */
.custom-skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.skill-card-fancy { background: rgba(255,255,255,0.45); backdrop-filter: blur(25px); border: 1px solid rgba(0,0,0,0.04); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; transition: all 0.25s; }
.skill-card-fancy:hover { border-color: rgba(168,85,247,0.25); box-shadow: 0 8px 24px rgba(168,85,247,0.05); transform: translateY(-1.5px); }
.skill-card-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px dashed rgba(0,0,0,0.03); padding-bottom: 10px; }
.skill-icon { font-size: 24px; }
.skill-meta { flex: 1; min-width: 0; }
.skill-name { font-size: 13.5px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skill-id { font-size: 9.5px; color: var(--text-muted); margin-top: 1px; }
.skill-card-body { font-size: 12px; color: var(--text-secondary); line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.skill-card-footer { margin-top: auto; padding-top: 6px; }
.btn-block { width: 100%; display: block; text-align: center; }

/* 在线商城高级数据源选择器 */
.marketplace-source-selector { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; background: rgba(255,255,255,0.45); padding: 10px 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.04); flex-wrap: wrap; }
.marketplace-source-selector select { padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 12px; color: var(--text-primary); outline: none; cursor: pointer; font-weight: 500; }
.marketplace-source-selector input { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 12px; outline: none; }
.mfilter-tab { display: flex; background: rgba(0,0,0,0.04); padding: 3px; border-radius: 8px; gap: 2px; }
.mfilter-tab button { padding: 4px 10px; border-radius: 6px; font-size: 11px; border: none; cursor: pointer; font-weight: 600; background: transparent; color: var(--text-secondary); transition: all 0.2s; }
.mfilter-tab button.active { background: #ffffff; color: var(--accent-blue); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.smithery-activation-card { margin-bottom: 16px; background: rgba(255,255,255,0.45); backdrop-filter: blur(25px); border: 1px solid rgba(59,130,246,0.18); border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(59,130,246,0.04); }
.smithery-activation-card a { color: var(--accent-blue); text-decoration: none; margin-left: 4px; font-weight: 600; }
.smithery-activation-card input { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 12.5px; outline: none; }

/* 侧滑抽屉样式 (Slide-out Drawer) */
.drawer-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.12); z-index: 10002; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; backdrop-filter: blur(4px); }
.drawer-overlay.show { opacity: 1; pointer-events: auto; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 85%; max-width: 580px; background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(35px) !important; border-left: 1px solid rgba(0, 0, 0, 0.06); box-shadow: -15px 0 40px rgba(15, 23, 42, 0.06); display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 10003; }
.drawer.show { transform: translateX(0); }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.drawer-subtitle { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.drawer-close { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.drawer-body { flex: 1; overflow-y: auto; padding: 24px; }

/* Markdown 手册格式 */
.markdown-body { font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); }
.markdown-body :deep(.md-h1) { font-size: 18px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 8px; margin: 0 0 16px; }
.markdown-body :deep(.md-h2) { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 20px 0 12px; }
.markdown-body :deep(.md-h3) { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 16px 0 10px; }
.markdown-body :deep(.md-p) { margin: 0 0 12px; text-align: justify; }
.markdown-body :deep(.md-li) { margin-bottom: 6px; list-style-type: square; margin-left: 18px; }
.markdown-body :deep(.md-inline-code) { padding: 2px 5px; background: rgba(0,0,0,0.04); border-radius: 4px; font-size: 11.5px; color: var(--accent-blue); }
.markdown-body :deep(.md-code) { padding: 12px 16px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); border-radius: 10px; overflow-x: auto; margin: 12px 0; font-size: 11.5px; line-height: 1.4; color: var(--text-primary); }
.markdown-body :deep(.md-link) { color: var(--accent-blue); text-decoration: none; font-weight: 600; border-bottom: 1px dashed var(--accent-blue); }

/* 通用列表与弹窗等样式 */
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260px; color: var(--text-muted); gap: 8px; font-size: 12.5px; }
.empty .icon { font-size: 36px; opacity: 0.3; }
.empty-sm { text-align: center; padding: 20px 10px; font-size: 11.5px; color: var(--text-muted); }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(12px); }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; width: 90%; max-width: 480px; position: relative; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; max-height: 88vh; overflow-y: auto; }
.modal h3 { margin: 0 0 20px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group textarea { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; font-family: inherit; }
.form-group input:focus, .form-group textarea:focus { border-color: rgba(59, 130, 246, 0.3); box-shadow: 0 0 12px rgba(59, 130, 246, 0.12); }
.form-hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; font-weight: 500; }
.btn-primary { background: var(--gradient-blue); color: #ffffff; font-weight: 600; }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
.btn-cancel { background: rgba(0,0,0,0.02); border: 1px solid rgba(0, 0, 0, 0.06); color: var(--text-secondary); }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 8px; }
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}
.toggle input {
  appearance: none;
  -webkit-appearance: none;
  width: 34px;
  height: 18px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 9px;
  position: relative;
  outline: none;
  cursor: pointer;
  transition: background 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  margin: 0;
}
:global([data-theme="dark"]) .toggle input {
  background: rgba(255, 255, 255, 0.08);
}
.toggle input::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  top: 3px;
  left: 3px;
  transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1.25), width 0.2s, left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.toggle input:checked {
  background: var(--accent-blue);
}
.toggle input:checked::before {
  transform: translateX(16px);
}
.toggle:hover input::before {
  transform: scale(1.08);
}
.toggle:hover input:checked::before {
  transform: translateX(16px) scale(1.08);
}
.toggle:active input::before {
  width: 15px;
}
.toggle input:checked:active::before {
  transform: translateX(13px);
  width: 15px;
}

/* 暗色模式兼容 */
[data-theme="dark"] .sidebar,
[data-theme="dark"] .tool-card,
[data-theme="dark"] .skill-card-fancy,
[data-theme="dark"] .marketplace-source-selector,
[data-theme="dark"] .smithery-activation-card,
[data-theme="dark"] .drawer,
[data-theme="dark"] .params-grid,
[data-theme="dark"] .mcp-tools-expand-box {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
}
[data-theme="dark"] .category-item:hover {
  background: rgba(255,255,255,0.02) !important;
}
[data-theme="dark"] .category-item.active {
  background: rgba(255,255,255,0.05) !important;
}
[data-theme="dark"] .marketplace-source-selector select,
[data-theme="dark"] .marketplace-source-selector input,
[data-theme="dark"] .smithery-activation-card input,
[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group textarea {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}
[data-theme="dark"] .markdown-body :deep(.md-code),
[data-theme="dark"] .tool-cmd {
  background: rgba(0, 0, 0, 0.25) !important;
  border-color: rgba(255,255,255,0.05) !important;
  color: #a7f3d0 !important;
}
[data-theme="dark"] .markdown-body :deep(.md-inline-code) {
  background: rgba(255, 255, 255, 0.06) !important;
}

@media (max-width: 820px) {
  .main-content { flex-direction: column; }
  .sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
  .category-list { display: flex; flex-direction: row; overflow-x: auto; padding: 6px; }
  .category-item { white-space: nowrap; }
  .drawer { width: 100% !important; }
}
</style>
