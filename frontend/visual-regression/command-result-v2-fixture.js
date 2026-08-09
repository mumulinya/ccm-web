import { createApp } from 'vue/dist/vue.esm-bundler.js'
import CommandResultCard from '../src/components/common/CommandResultCard.vue'

const mcpRows = Array.from({ length: 10 }, (_, index) => ({
  title: index ? `fixture-mcp-${index}` : 'fetch-web-mcp',
  detail: index ? '已授权的示例 MCP 服务。' : '安全读取公开 HTTP/HTTPS 网页并转换为适合模型使用的文本。',
  status: index === 1 ? '连接异常' : '已连接',
  tone: index === 1 ? 'warning' : 'success',
  meta: index ? '完整服务 · 2 个运行时工具' : '完整服务 · 1 个运行时工具',
}))

const mcp = {
  schema:'ccm-command-result-v2', command:'mcp', title:'读取当前作用域已授权的 MCP 服务', icon:'◇', success:true,
  implementation:'local-query', variant:'resource_list', tone:'warning', headline:'当前作用域有 10 个已授权 MCP 服务，9 个已连接。',
  stats:[{label:'服务',value:'10'},{label:'已连接',value:'9',tone:'success'},{label:'连接异常',value:'1',tone:'warning'},{label:'授权规则',value:'11'},{label:'规则缺失',value:'1',tone:'warning'}],
  sections:[{id:'primary',kind:'list',rows:mcpRows},{id:'authorization-issues',title:'未生效的授权',kind:'issues',rows:[{title:'missing-mcp',detail:'注册目录中未找到对应服务或工具，请检查授权名称。',status:'需处理',tone:'warning'}]}],
  actions:[{kind:'navigate',label:'打开工具配置',tab:'tools'}],
  technicalDetails:{schema:'ccm-command-technical-details-v1',command:'mcp',scope:'project',scopeId:'cc-connect-test',counts:{services:10,connected:9}},
  durationMs:31,at:'2026-08-09T12:46:51.000Z',contentStored:false,
}

const compact = {
  schema:'ccm-command-result-v2',command:'copy',title:'复制最近一条 Agent 可见回复',icon:'⧉',success:true,implementation:'client',variant:'compact',tone:'success',headline:'最近一条 Agent 回复已复制到剪贴板。',
  stats:[{label:'字符',value:'286'}],sections:[],actions:[],technicalDetails:{schema:'ccm-command-technical-details-v1',command:'copy'},durationMs:4,at:'2026-08-09T12:47:01.000Z',contentStored:false,
}

createApp({
  components:{ CommandResultCard },
  data:() => ({ mcp, compact, navigated:'' }),
  mounted(){ window.addEventListener('ccm-command-result-action', event => { this.navigated = `已请求打开：${event.detail?.tab || ''}` }) },
  template:`<main><h1>命令中心结果展示 V2</h1><section class="fixture-message"><CommandResultCard :result="mcp" /></section><section class="fixture-message"><CommandResultCard :result="compact" /></section><output id="navigation">{{ navigated }}</output></main>`,
}).mount('#app')
