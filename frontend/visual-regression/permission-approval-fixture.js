import { createApp } from 'vue/dist/vue.esm-bundler.js'
import PermissionApprovalCards from '../src/components/common/PermissionApprovalCards.vue'

const request = {
  id: 'permission-fixture',
  project: 'smart-live-ui',
  operation: 'workspace_edit_session',
  reason: '完成后台页面调整',
  risk: 'medium',
  riskReasons: ['操作限制在目标项目的日常开发范围'],
  approvalScope: 'task',
  approvedPaths: ['smart-live-ui'],
}

createApp({
  components: { PermissionApprovalCards },
  data: () => ({ requests: [request], busyId: '', decision: '' }),
  methods: {
    approve(item) { this.decision = `approved:${item.id}` },
    reject(item) { this.decision = `rejected:${item.id}` },
  },
  template: `<main><section class="conversation">
    <div class="conversation-copy"><strong>项目 Agent</strong><span>我已完成分析，准备交给项目子 Agent 修改后台页面。</span></div>
    <PermissionApprovalCards :requests="requests" :busy-id="busyId" @approve="approve" @reject="reject" />
    <div class="composer"><span>向项目 Agent 发送消息…</span><button type="button">发送</button></div>
    <output class="decision">{{ decision }}</output>
  </section></main>`,
}).mount('#app')
