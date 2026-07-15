import { createApp } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import InternalMcpCatalog from '../src/components/tools/InternalMcpCatalog.vue'

const style = document.createElement('style')
style.textContent = `
:root { --bg-primary:#fff; --bg-secondary:#f5f7fa; --border-color:#d9e0e8; --text-primary:#172033; --text-secondary:#667085; --text-tertiary:#8892a4; --accent-blue:#2563c7; }
* { box-sizing:border-box; }
body { margin:0; background:#edf1f5; color:var(--text-primary); font-family:Inter,"Microsoft YaHei",system-ui,sans-serif; }
.fixture { width:min(880px,calc(100vw - 24px)); margin:24px auto; display:grid; gap:12px; }
.fixture-header { display:flex; align-items:end; justify-content:space-between; gap:16px; }
.fixture-header h1 { margin:0; font-size:20px; letter-spacing:0; }
.fixture-header p { margin:4px 0 0; color:var(--text-secondary); font-size:12px; }
.fixture-count { color:var(--text-secondary); font-size:12px; }
@media (max-width:520px) { .fixture { margin:12px auto; }.fixture-header { align-items:flex-start; flex-direction:column; gap:4px; } }
`
document.head.appendChild(style)

const items = [
  {
    name:'ccm__group_coordinator', display_name:'群聊 Agent 协调器', version:'1.0.9', state:'ready', state_label:'可用', state_detail:'在项目子 Agent 需要协作时自动注入', lifecycle_label:'按任务会话注入',
    description:'承接项目子 Agent 的跨项目协作、评审、阻塞报告和进度查询，由群聊主 Agent 统一仲裁。', scopes:['群聊主 Agent','项目子 Agent'],
    tools:[
      {name:'request_coordination',label:'提交协作请求',description:'提交跨项目信息或实现依赖。'},
      {name:'request_review',label:'申请评审',description:'请求主 Agent 安排只读评审。'},
      {name:'report_blocker',label:'报告阻塞',description:'报告无法自行解除的风险或权限问题。'},
      {name:'get_coordination_status',label:'查询进度',description:'查询当前任务会话的协调状态。'},
    ], technical:{discovery:'backend_embedded',entry_path:'C:/technical/internal/group-coordination-mcp.js'},
  },
  {
    name:'ccm__task_runtime', display_name:'任务运行 MCP', version:'1.0.0', state:'ready', state_label:'可用', state_detail:'在 Agent 执行任务时按角色和权限自动注入', lifecycle_label:'按任务签名注入',
    description:'让任务绑定的 Agent 读取上下文、维护 Todo、汇报进度、提交交付候选并请求用户决策。', scopes:['全局 Agent','群聊主 Agent','项目子 Agent','TestAgent'],
    tools:[
      {name:'get_task_context',label:'读取任务上下文',description:'读取当前绑定任务目标、验收、Todo 和待决策事项。'},
      {name:'update_todo',label:'更新 Todo',description:'维护当前 Agent 的真实工作计划快照。'},
      {name:'report_progress',label:'汇报进度',description:'把阶段进展同步到任务时间线和日志。'},
      {name:'submit_delivery',label:'提交交付候选',description:'提交文件、验证和分支证据，等待主 Agent 验收。'},
      {name:'request_user_decision',label:'请求用户决策',description:'记录必须由用户决定的问题和建议。'},
    ], technical:{discovery:'bundled_manifest',entry_path:'C:/technical/internal/task-runtime-mcp.js'},
  },
  {
    name:'ccm__knowledge_context', display_name:'知识上下文 MCP', version:'1.0.0', state:'ready', state_label:'可用', state_detail:'在 Agent 执行任务时按角色和权限自动注入', lifecycle_label:'按知识范围注入',
    description:'按任务、群聊和项目权限检索知识库、读取文档并返回可追溯引用。', scopes:['全局 Agent','群聊主 Agent','项目子 Agent','TestAgent'],
    tools:[
      {name:'get_project_context',label:'提取项目上下文',description:'按当前任务目标自动提取相关知识。'},
      {name:'search_knowledge',label:'检索知识',description:'检索允许范围内的知识片段和来源。'},
      {name:'read_knowledge_document',label:'读取知识文档',description:'分页读取允许范围内的已解析文档。'},
      {name:'list_citations',label:'列出引用',description:'列出可用于交付说明的文档和引用标识。'},
    ], technical:{discovery:'bundled_manifest',entry_path:'C:/technical/internal/knowledge-context-mcp.js'},
  },
  {
    name:'ccm__test_acceptance', display_name:'TestAgent 验收 MCP', version:'1.0.0', state:'ready', state_label:'可用', state_detail:'在 Agent 执行任务时按角色和权限自动注入', lifecycle_label:'由主 Agent 发起验收',
    description:'创建并运行原生 TestAgent 工作单，读取计划、状态、结论与截图等验收证据。', scopes:['群聊主 Agent','项目子 Agent','TestAgent'],
    tools:[
      {name:'create_test_work_order',label:'创建验收工作单',description:'基于绑定任务创建原生 TestAgent 工作单。'},
      {name:'start_test_run',label:'启动验收',description:'后台执行命令、接口和浏览器验收。'},
      {name:'get_test_plan',label:'查看测试计划',description:'读取结构化测试范围和执行计划。'},
      {name:'get_test_status',label:'查询测试状态',description:'查询后台 TestAgent 运行状态。'},
      {name:'get_test_verdict',label:'读取验收结论',description:'读取 canAccept、报告摘要和证据完整性。'},
      {name:'list_test_evidence',label:'列出测试证据',description:'列出截图、报告、浏览器和命令证据。'},
    ], technical:{discovery:'bundled_manifest',entry_path:'C:/technical/internal/test-acceptance-mcp.js'},
  },
  {
    name:'ccm__delivery_workspace', display_name:'交付工作区 MCP', version:'1.0.0', state:'ready', state_label:'可用', state_detail:'在 Agent 执行任务时按角色和权限自动注入', lifecycle_label:'按任务与项目隔离',
    description:'受控管理任务 worktree、代码 diff、项目检查、交付分支、验收后合并和安全清理。', scopes:['群聊主 Agent','项目子 Agent','TestAgent'],
    tools:[
      {name:'create_delivery_worktree',label:'创建 worktree',description:'为项目创建独立任务分支和工作区。'},
      {name:'get_delivery_diff',label:'查看代码变更',description:'读取受控工作区的状态、统计和逐行 diff。'},
      {name:'run_project_checks',label:'运行项目检查',description:'执行已配置的 test/check/lint/build。'},
      {name:'commit_delivery_branch',label:'提交交付分支',description:'提交 ccm/* 分支并生成交付回执。'},
      {name:'merge_approved_delivery',label:'合并已验收交付',description:'仅在 TestAgent canAccept 后由主 Agent 合并。'},
      {name:'cleanup_delivery_worktree',label:'清理工作区',description:'安全清理已合并且无改动的 worktree。'},
    ], technical:{discovery:'bundled_manifest',entry_path:'C:/technical/internal/delivery-workspace-mcp.js'},
  },
  {
    name:'ccm__task_evidence', display_name:'任务证据 MCP', version:'1.0.0', state:'ready', state_label:'可用', state_detail:'在 Agent 执行任务时按角色和权限自动注入', lifecycle_label:'按任务只读回放',
    description:'读取任务时间线、逐行代码变更、TestAgent 证据和交付回执，支持主 Agent 验收与子 Agent 自查。', scopes:['全局 Agent','群聊主 Agent','项目子 Agent','TestAgent'],
    tools:[
      {name:'get_task_timeline',label:'读取任务时间线',description:'查看任务从派发到验收的完整过程。'},
      {name:'get_code_changes',label:'读取代码变更',description:'查看已保存的文件统计和逐行 diff。'},
      {name:'list_test_evidence',label:'列出测试证据',description:'查看截图、报告、浏览器和命令证据。'},
      {name:'get_delivery_receipts',label:'读取交付回执',description:'汇总交付候选、验证、合并和 TestAgent 结论。'},
    ], technical:{discovery:'bundled_manifest',entry_path:'C:/technical/internal/task-evidence-mcp.js'},
  },
  {
    name:'mcp-feishu', display_name:'飞书协作 MCP', version:'1.0.0', state:'needs_configuration', state_label:'待配置', state_detail:'请在系统设置中完成飞书应用配置', lifecycle_label:'随项目安装', configuration_route:'settings',
    description:'读取飞书群聊、历史消息和消息详情，为 Agent 提供飞书业务上下文。', scopes:['全局 Agent','群聊主 Agent','项目子 Agent'],
    tools:[
      {name:'list_chats',label:'群聊列表',description:'查看机器人所在的飞书群聊。'},
      {name:'get_chat_history',label:'群聊历史',description:'读取指定群聊的历史消息。'},
      {name:'search_messages',label:'搜索消息',description:'按关键词检索飞书消息。'},
      {name:'get_message_detail',label:'消息详情',description:'读取消息正文、附件和发送信息。'},
    ], technical:{discovery:'bundled_manifest',entry_path:'C:/technical/internal/mcp-feishu/dist/index.js'},
  },
]

createApp({
  components:{ InternalMcpCatalog },
  data:()=>({ items, summary:{total:7,ready:6,needs_configuration:1,unavailable:0,tools:33}, configured:false }),
  template:`
    <main class="fixture">
      <header class="fixture-header"><div><h1>内部 MCP</h1><p>随项目安装，由系统保护</p></div><span class="fixture-count">7 个内部服务</span></header>
      <InternalMcpCatalog :items="items" :summary="summary" @configure="configured=true" />
      <output id="configure-output">{{ configured ? 'settings-opened' : '' }}</output>
    </main>
  `,
}).mount('#app')
