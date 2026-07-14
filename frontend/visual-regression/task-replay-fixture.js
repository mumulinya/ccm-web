import { createApp } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import TraceReplay from '../src/components/system/TraceReplay.vue'

const screenshot = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="100%" height="100%" fill="#f8fafc"/><rect x="35" y="30" width="890" height="480" rx="8" fill="#fff" stroke="#cbd5e1"/><rect x="35" y="30" width="890" height="54" rx="8" fill="#e2e8f0"/><circle cx="70" cy="57" r="8" fill="#ef4444"/><circle cx="96" cy="57" r="8" fill="#f59e0b"/><circle cx="122" cy="57" r="8" fill="#22c55e"/><text x="70" y="150" font-family="sans-serif" font-size="28" fill="#0f172a">登录状态恢复测试</text><rect x="70" y="185" width="780" height="56" rx="6" fill="#eff6ff" stroke="#93c5fd"/><text x="95" y="221" font-family="sans-serif" font-size="18" fill="#1d4ed8">会话已恢复，页面内容与操作状态正确</text><rect x="70" y="275" width="220" height="44" rx="5" fill="#2563eb"/><text x="112" y="304" font-family="sans-serif" font-size="16" fill="#fff">继续操作</text><text x="70" y="390" font-family="sans-serif" font-size="16" fill="#64748b">TestAgent Playwright 截图证据</text></svg>`)}`

const events = [
  ['e1','2026-07-13T01:00:00.000Z','intake','info','用户提交复杂任务','修复登录状态刷新后页面丢失的问题，并完成真实页面验证。','user','用户','root-task'],
  ['e2','2026-07-13T01:00:04.000Z','planning','passed','全局主 Agent 分析并派发任务','已识别为跨项目开发任务，交给群聊主 Agent 统筹。','global_agent','全局主 Agent','root-task'],
  ['e3','2026-07-13T01:00:10.000Z','planning','passed','群聊主 Agent 创建执行计划','先定位状态恢复逻辑，再修改代码并运行项目检查，最后交由 TestAgent 独立验证。','group_agent','群聊主 Agent','root-task'],
  ['e4','2026-07-13T01:00:16.000Z','dispatch','passed','群聊主 Agent 派发 web 子任务','web 执行成员已接收登录状态恢复工作单。','group_agent','群聊主 Agent','web-task'],
  ['e5','2026-07-13T01:01:02.000Z','execution','running','web 开始修改登录状态逻辑','读取会话存储和路由守卫，复用现有状态恢复入口。','project_agent','web','web-task'],
  ['e6','2026-07-13T01:03:40.000Z','change','passed','web 返回代码改动','修改 2 个文件，补齐刷新后的会话恢复与错误兜底。','project_agent','web','web-task'],
  ['e7','2026-07-13T01:04:20.000Z','test','failed','TestAgent 首次浏览器验证失败','刷新后页面一度显示空白，控制台记录到状态初始化顺序错误。','test_agent','TestAgent','web-task'],
  ['e8','2026-07-13T01:04:34.000Z','rework','running','群聊主 Agent 发起定向返工','保留原工作会话，把浏览器失败证据交回 web 修复。','group_agent','群聊主 Agent','web-task'],
  ['e9','2026-07-13T01:06:05.000Z','change','passed','web 完成定向修复','调整初始化顺序并补充回归测试。','project_agent','web','web-task'],
  ['e10','2026-07-13T01:07:22.000Z','test','passed','TestAgent 复验通过','真实浏览器刷新、重新登录和继续操作均通过，截图与网络记录已保存。','test_agent','TestAgent','web-task'],
  ['e11','2026-07-13T01:07:48.000Z','review','passed','群聊主 Agent 完成交付抽查','代码改动、项目测试和 TestAgent 证据均满足任务要求。','group_agent','群聊主 Agent','root-task'],
  ['e12','2026-07-13T01:08:00.000Z','completion','passed','全局主 Agent 汇总任务结果','登录状态恢复问题已经修复并通过真实页面复验，用户可以查看完整过程和证据。','global_agent','全局主 Agent','root-task'],
].map(([id,at,stage,status,title,summary,type,label,task_id]) => ({ id, at, stage, category: stage, status, title, summary, actor:{type,label}, task_id, parent_task_id:task_id==='web-task'?'root-task':'', trace_id:'trace-replay-fixture', project:type==='project_agent'?label:'', source:'fixture', evidence_ids:id==='e10'?['shot-1','report-1']:[], technical:id==='e7'?{ browser_flow:'refresh-session', console_errors:1, failed_assertion:'页面内容应在刷新后恢复' }:{} }))

const replay = {
  schema:'ccm-complete-task-replay-v1', generated_at:'2026-07-13T01:08:01.000Z', selected_task_id:'root-task', root_task_id:'root-task', title:'修复登录状态刷新丢失', goal:'刷新页面后保持登录状态，并由 TestAgent 在真实浏览器中完成复验。', status:'done', completed:true, started_at:'2026-07-13T01:00:00.000Z', finished_at:'2026-07-13T01:08:00.000Z',
  tasks:[{id:'root-task',parent_task_id:'',root_task_id:'root-task',title:'修复登录状态刷新丢失',goal:'完整任务',project:'',group_id:'group',trace_id:'trace-replay-fixture',status:'done',created_at:'2026-07-13T01:00:00.000Z',updated_at:'2026-07-13T01:08:00.000Z',is_root:true},{id:'web-task',parent_task_id:'root-task',root_task_id:'root-task',title:'修复前端会话恢复',goal:'项目子任务',project:'web',group_id:'group',trace_id:'trace-web',status:'done',created_at:'2026-07-13T01:00:15.000Z',updated_at:'2026-07-13T01:07:30.000Z',is_root:false}],
  actors:[{id:'global_agent',label:'全局主 Agent',present:true},{id:'group_agent',label:'群聊主 Agent',present:true},{id:'project_agent',label:'项目子 Agent',present:true},{id:'test_agent',label:'TestAgent',present:true}],
  summary:{event_count:events.length,issue_count:1,failed_count:1,task_count:2,evidence_count:4,test_run_count:2},
  phases:['intake','planning','dispatch','execution','change','test','rework','review','completion'].map(id=>({id,status:id==='test'?'warning':'passed',event_count:events.filter(item=>item.stage===id).length,started_at:'',finished_at:''})).filter(item=>item.event_count),
  events,
  evidence:[{id:'shot-1',type:'screenshot',title:'复验通过页面截图',project:'web',status:'available',available:true,size_bytes:48231,sha256:'abc',mime_type:'image/png',preview_kind:'image',run_id:'test-run-2',task_id:'web-task',retained_until:'2026-07-27T01:07:22.000Z',retention_status:'available',url:screenshot},{id:'report-1',type:'report',title:'TestAgent 结构化报告',project:'web',status:'available',available:true,size_bytes:9021,sha256:'def',mime_type:'application/json',preview_kind:'text',run_id:'test-run-2',task_id:'web-task',retained_until:'2026-07-27T01:07:22.000Z',retention_status:'available',url:'data:application/json,%7B%22status%22%3A%22passed%22%7D'},{id:'code-1',type:'code_changes',title:'web 代码改动',task_id:'web-task',project:'web',status:'available',preview_kind:'code_diff',items:['frontend/src/stores/session.js','frontend/src/router/guard.js'],file_count:2,diff_available_count:1,diff_unavailable_count:1,files:[{path:'frontend/src/stores/session.js',project:'web',statusText:'修改',statusColor:'#facc15',additions:2,deletions:1,diff:{available:true,historical:true,additions:2,deletions:1,diff:'--- a/frontend/src/stores/session.js\n+++ b/frontend/src/stores/session.js\n@@ -18,3 +18,4 @@\n const cached = storage.getItem(SESSION_KEY)\n-return cached ? JSON.parse(cached) : null\n+const session = cached ? JSON.parse(cached) : null\n+return session && session.expiresAt > Date.now() ? session : null\n export { restoreSession }'}},{path:'frontend/src/router/guard.js',project:'web',statusText:'修改',statusColor:'#facc15',additions:4,deletions:0,diff:{available:false,historical:true,additions:4,deletions:0,diff:'',reason:'该任务当时只保存了文件与行数统计，无法还原逐行代码内容'}}],retained_until:'任务删除前',url:''},{id:'check-1',type:'verification',title:'项目子 Agent 验证记录',task_id:'web-task',project:'web',status:'available',preview_kind:'list',items:['npm run test:session','npm run build'],retained_until:'任务删除前',url:''}],
  retention:{task_record:{status:'available',policy:'任务删除前保留'},trace:{status:'available',policy:'随可靠性账本保留'},test_agent:{status:'available',policy:'默认保留 14 天，且受容量上限约束',earliest_expiry:'2026-07-27T01:07:22.000Z'}},
}
const index = {schema:'ccm-task-replay-index-v1',generated_at:'2026-07-13T01:08:01.000Z',total:1,tasks:[{...replay.tasks[0],child_count:1,replay_url:'/api/tasks/replay?task_id=root-task'}]}

window.fetch = async (url) => new Response(JSON.stringify(String(url).includes('task_id=') ? {success:true,replay} : {success:true,index}), {status:200,headers:{'Content-Type':'application/json'}})
localStorage.setItem('trace-replay-target', JSON.stringify({task_id:'root-task',trace_id:'trace-replay-fixture',scope:'global'}))
document.body.style.margin = '0'
document.body.style.height = '100vh'
document.getElementById('app').style.height = '100vh'
createApp(TraceReplay).mount('#app')
