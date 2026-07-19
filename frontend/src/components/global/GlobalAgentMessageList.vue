<script setup>
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import TaskExperienceCard from '../tasks/TaskExperienceCard.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import ChatAvatar from '../common/ChatAvatar.vue'
import {
  buildGlobalStreamCurrentTodoSummary,
  globalDispatchLaunchRows,
  globalDispatchLaunchSummary,
  globalDispatchRowClass,
  globalExecutionIntentConfirmed,
  globalStreamCurrentTodoTone,
  globalStreamHeaderSubtitle,
  globalStreamHeaderTitle,
  globalStreamProgressRefreshItems,
  globalStreamProgressRefreshSummary,
  globalStreamProgressRefreshTone,
  globalStreamToolUseSummary,
  visibleGlobalStreamEventText,
  visibleGlobalStreamEventTitle,
} from '../../utils/globalAgentExecutionStream.js'
import {
  globalAttachmentUrl,
  isGlobalImageAttachment,
} from '../../utils/globalAgentAttachments.js'

defineProps({
  messages: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: '' },
  searchHighlightMsgIndex: { type: Number, default: -1 },
  executingAction: { type: Object, default: null },
  isSending: Boolean,
  currentSession: { type: Object, default: null },
  navMessages: { type: Array, default: () => [] },
  setChatBody: { type: Function, required: true },
  setChatContentInner: { type: Function, required: true },
  updateScrollState: { type: Function, required: true },
  scrollToMessage: { type: Function, required: true },
  scrollToBottom: { type: Function, required: true },
  getGlobalTaskCard: { type: Function, required: true },
  isGlobalMissionTaskMessage: { type: Function, required: true },
  handleGlobalTaskAction: { type: Function, required: true },
  runtimeDebugSections: { type: Function, required: true },
  getVisibleGlobalMessageContent: { type: Function, required: true },
  isSystemReceipt: { type: Function, required: true },
  parseReceipt: { type: Function, required: true },
  isProjectReport: { type: Function, required: true },
  parseProjectReport: { type: Function, required: true },
  toggleReport: { type: Function, required: true },
  isReportOpen: { type: Function, required: true },
  renderMarkdown: { type: Function, required: true },
  toggleSelectAllFiles: { type: Function, required: true },
  getGitStatusColor: { type: Function, required: true },
  handleGitCommitCardSubmit: { type: Function, required: true },
  zoomImage: { type: Function, required: true },
  formatSize: { type: Function, required: true },
})
</script>

<template>
      <div class="chat-body" :ref="setChatBody" @scroll="updateScrollState">
        <div :ref="setChatContentInner" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
          <div class="chat-flow" :key="currentSessionId" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
            <LoadingSkeleton v-if="!messages.length && isSending" :rows="5" />
            <EmptyState
              v-else-if="!messages.length"
              icon="💬"
              title="还没有消息"
              hint="在下方输入开始对话"
            />
            <div 
              v-for="(msg, index) in messages" 
              :key="index"
              :id="'msg-' + index"
              class="chat-bubble-wrapper"
              :class="[msg.role, { 'search-hit': searchHighlightMsgIndex === index }]"
              :data-message-type="msg.type || undefined"
              :data-message-id="msg.id || undefined"
            >
            <ChatAvatar :role="msg.role === 'user' ? 'user' : 'agent'" :size="40" class="avatar" />
            <div class="chat-bubble">
              <!-- 助手消息判定 -->
              <template v-if="msg.role === 'assistant'">
                <div
                  v-if="msg.type === 'command_result'"
                  class="global-command-result"
                >
                  <CommandResultCard :result="msg.commandResult" />
                </div>
                <div
                  v-else-if="msg.type === 'global_stream' && !globalExecutionIntentConfirmed(msg)"
                  class="global-stream-replying"
                  :data-run-id="msg.agenticRun?.id || undefined"
                  aria-live="polite"
                >
                  <span class="stream-dot" :class="{ active: msg.streaming }"></span>
                  <span>{{ msg.streaming ? '正在回复...' : '回复已完成' }}</span>
                </div>
                <div
                  v-else-if="msg.type === 'global_stream'"
                  class="global-stream-card"
                  :data-run-id="msg.agenticRun?.id || undefined"
                >
                  <div class="global-stream-head">
                    <span class="stream-dot" :class="{ active: msg.streaming }"></span>
                    <div>
                      <strong>{{ globalStreamHeaderTitle(msg) }}</strong>
                      <p>{{ globalStreamHeaderSubtitle(msg) }}</p>
                    </div>
                  </div>
                  <div
                    v-for="currentTodo in [buildGlobalStreamCurrentTodoSummary(msg)].filter(Boolean)"
                    :key="currentTodo.step_id || currentTodo.label"
                    class="global-stream-current-todo"
                    :class="globalStreamCurrentTodoTone(currentTodo)"
                  >
                    <span class="stream-todo-label">当前步骤</span>
                    <strong>{{ currentTodo.active_form || currentTodo.label }}</strong>
                    <p v-if="currentTodo.detail">{{ currentTodo.detail }}</p>
                    <div v-if="currentTodo.recent_action || currentTodo.recentAction || currentTodo.needs_action || currentTodo.needsAction" class="stream-todo-post-turn">
                      <span v-if="currentTodo.recent_action || currentTodo.recentAction">最近：{{ currentTodo.recent_action || currentTodo.recentAction }}</span>
                      <span v-if="currentTodo.needs_action || currentTodo.needsAction">需要：{{ currentTodo.needs_action || currentTodo.needsAction }}</span>
                    </div>
                    <small v-if="currentTodo.verification_reminder" class="stream-todo-verification">
                      {{ currentTodo.verification_reminder.title || '还缺验收步骤' }}：{{ currentTodo.verification_reminder.headline || '完成前需要补一项真实验证，或者说明为什么当前不能验证。' }}
                    </small>
                    <small v-if="currentTodo.next_action" class="stream-todo-next">下一步：{{ currentTodo.next_action }}</small>
                    <em class="stream-todo-progress">
                      <span>{{ currentTodo.status_label || '进行中' }}</span>
                      <b>{{ currentTodo.progress_label || `${currentTodo.completed_count || 0}/${currentTodo.total_count || 0}` }}</b>
                    </em>
                  </div>
                  <div
                    v-for="refreshSummary in [globalStreamProgressRefreshSummary(msg)].filter(Boolean)"
                    :key="refreshSummary.schema || refreshSummary.title || 'global-progress-refresh'"
                    class="global-stream-progress-refresh"
                    :class="globalStreamProgressRefreshTone(refreshSummary)"
                  >
                    <span class="stream-refresh-label">{{ refreshSummary.title || '进度刷新提醒' }}</span>
                    <strong>{{ refreshSummary.current_state || refreshSummary.currentState || refreshSummary.headline || '我已整理当前进度刷新状态。' }}</strong>
                    <div v-if="globalStreamProgressRefreshItems(refreshSummary).length" class="stream-refresh-items">
                      <span v-for="item in globalStreamProgressRefreshItems(refreshSummary)" :key="item">{{ item }}</span>
                    </div>
                    <small v-if="refreshSummary.next_action || refreshSummary.nextAction" class="stream-refresh-next">下一步：{{ refreshSummary.next_action || refreshSummary.nextAction }}</small>
                    <em>{{ refreshSummary.status_label || refreshSummary.statusLabel || '已整理' }}</em>
                  </div>
                  <div
                    v-for="toolSummary in [globalStreamToolUseSummary(msg)].filter(Boolean)"
                    :key="toolSummary.schema || toolSummary.title"
                    class="global-stream-tool-summary"
                  >
                    <span class="stream-tool-label">动作摘要</span>
                    <strong>{{ toolSummary.headline || toolSummary.title }}</strong>
                    <small v-if="toolSummary.latest_label">最近：{{ toolSummary.latest_label }}</small>
                    <div class="stream-tool-counts">
                      <span v-if="toolSummary.running_count">进行中 {{ toolSummary.running_count }}</span>
                      <span v-if="toolSummary.completed_count">已返回 {{ toolSummary.completed_count }}</span>
                      <span v-if="toolSummary.failed_count" class="failed">待排查 {{ toolSummary.failed_count }}</span>
                    </div>
                  </div>
                  <details v-if="globalDispatchLaunchRows(msg).length" class="global-stream-dispatch" open>
                    <summary>
                      <div>
                        <strong>{{ globalDispatchLaunchSummary(msg)?.title || '已派发的工作' }}</strong>
                        <span>{{ globalDispatchLaunchSummary(msg)?.count_label || `${globalDispatchLaunchRows(msg).length} 个执行目标` }}</span>
                      </div>
                      <small>展开查看每个目标</small>
                    </summary>
                    <p v-if="globalDispatchLaunchSummary(msg)?.headline">{{ globalDispatchLaunchSummary(msg).headline }}</p>
                    <div class="global-stream-dispatch-list">
                      <article
                        v-for="row in globalDispatchLaunchRows(msg)"
                        :key="row.id || row.agent || row.task"
                        :class="globalDispatchRowClass(row)"
                      >
                        <header>
                          <strong>{{ row.role || '执行成员' }} · {{ row.agent || '待确认目标' }}</strong>
                          <em>{{ row.status_label || '已派发' }}</em>
                        </header>
                        <span>{{ row.task || '已进入执行链路。' }}</span>
                        <small v-if="row.reason">{{ row.reason }}</small>
                        <small v-if="row.depends_on?.length">依赖：{{ row.depends_on.join('、') }}</small>
                      </article>
                    </div>
                    <small v-if="globalDispatchLaunchSummary(msg)?.next_action" class="global-stream-dispatch-next">下一步：{{ globalDispatchLaunchSummary(msg).next_action }}</small>
                  </details>
                  <div class="global-stream-events">
                    <div
                      v-for="(event, eventIndex) in msg.streamEvents || []"
                      :key="eventIndex"
                      class="global-stream-event"
                      :class="event.tone"
                    >
                      <span class="event-icon">{{ event.icon }}</span>
                      <div>
                        <strong>{{ visibleGlobalStreamEventTitle(event.title) }}</strong>
                        <p>{{ visibleGlobalStreamEventText(event.text) }}</p>
                      </div>
                    </div>
                    <div v-if="!(msg.streamEvents || []).length" class="global-stream-event running">
                      <span class="event-icon">🧠</span>
                      <div>
                        <strong>准备中</strong>
                        <p>正在连接全局 Agent...</p>
                      </div>
                    </div>
                  </div>
                  <TaskExperienceCard
                    v-if="getGlobalTaskCard(msg)"
                    class="global-stream-plan-card"
                    :card="getGlobalTaskCard(msg)"
                    context="global"
                    :busy="!!msg.agenticRunLoading"
                    @action="handleGlobalTaskAction(msg, $event)"
                  />
                </div>

                <!-- CCM 系统管理处理结果 -->
                <div v-else-if="msg.type === 'management_action'" class="management-action-card" :class="{ failed: !msg.managementReceipt?.success, cancelled: msg.managementReceipt?.cancelled }">
                  <div class="management-action-head">
                    <div>
                      <span class="management-action-kicker">全局 Agent 系统工具</span>
                      <strong>{{ msg.managementReceipt?.title || '系统管理' }}</strong>
                    </div>
                    <span class="management-action-state">{{ msg.managementReceipt?.cancelled ? '已取消' : (msg.managementReceipt?.success ? '已完成' : '失败') }}</span>
                  </div>
                  <div class="management-action-details">
                    <div v-for="(detail, detailIndex) in msg.managementReceipt?.details || []" :key="detailIndex">
                      <span>{{ detail.label }}</span>
                      <strong>{{ detail.value }}</strong>
                    </div>
                  </div>
                </div>

                <!-- 全局总控任务 -->
                <TaskExperienceCard
                  v-else-if="getGlobalTaskCard(msg) && isGlobalMissionTaskMessage(msg)"
                  :card="getGlobalTaskCard(msg)"
                  context="global"
                  :busy="!!msg.agenticRunLoading"
                  @action="handleGlobalTaskAction(msg, $event)"
                />

                <!-- RAG/Git 新增 1: 智能代码审查卡片 -->
                <div v-else-if="msg.type === 'git_review'" class="git-review-card" style="width: 100%;">
                  <div class="card-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span class="icon" style="font-size: 20px;">🔍</span>
                    <div>
                      <div class="card-title" style="font-size: 15px; font-weight: bold; color: #fff;">智能代码审查报告 ({{ msg.project }})</div>
                    </div>
                  </div>
                  <LoadingSkeleton v-if="msg.loading" :rows="3" />
                  <div v-else-if="msg.error" style="color: #f44336; font-size: 14px; background: rgba(244,67,54,0.1); padding: 10px; border-radius: 6px;">
                    ❌ 审查失败: {{ msg.error }}
                  </div>
                  <div v-else class="review-body" v-html="renderMarkdown(getVisibleGlobalMessageContent(msg, '代码审查报告已整理，技术细节已放入技术详情。'))" style="font-size: 14px; line-height: 1.6; color: #ddd; max-height: 450px; overflow-y: auto; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;"></div>
                </div>

                <!-- RAG/Git 新增 2: Git 一键提交确认卡片 -->
                <div v-else-if="msg.type === 'git_commit'" class="git-commit-card" style="width: 100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 8px;">
                  <div class="card-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span class="icon" style="font-size: 20px;">🚀</span>
                    <div>
                      <div class="card-title" style="font-size: 15px; font-weight: bold; color: #fff;">代码提交确认卡片</div>
                      <div class="card-desc" style="font-size: 12px; color: #888;">目标项目: <strong>{{ msg.project }}</strong></div>
                    </div>
                  </div>

                  <LoadingSkeleton v-if="msg.loadingFiles" :rows="2" />
                  <div v-else-if="msg.fetchError" style="color: #ff9800; font-size: 14px; background: rgba(255,152,0,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                    ⚠️ {{ msg.fetchError }}
                  </div>
                  <div v-else>
                    <!-- 变更文件选择 -->
                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 13px; color: #aaa; margin-bottom: 6px; display: flex; justify-content: space-between;">
                        <span>待提交文件 ({{ msg.gitFiles?.length || 0 }})</span>
                        <a href="javascript:;" @click="toggleSelectAllFiles(msg)" style="font-size: 12px; color: #00bcd4; text-decoration: none;">全选/反选</a>
                      </div>
                      <EmptyState v-if="!msg.gitFiles || msg.gitFiles.length === 0" title="没有检测到任何未提交的代码变更" />
                      <div v-else style="display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 6px;">
                        <label v-for="file in msg.gitFiles" :key="file.path" style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer; padding: 4px 6px; border-radius: 4px; transition: background 0.2s;" class="commit-file-item">
                          <input type="checkbox" v-model="file.selected" style="cursor: pointer;" />
                          <span :style="{ color: getGitStatusColor(file.status) }" style="font-weight: bold; font-family: monospace; width: 18px;">{{ file.status }}</span>
                          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="file.path">{{ file.path }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- 提交注释框 -->
                    <div style="margin-bottom: 12px;">
                      <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">提交注释 (Commit Message)</label>
                      <textarea v-model="msg.commitMessage" placeholder="输入提交注释..." style="width: 100%; height: 60px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: 6px; font-size: 13px; resize: none; font-family: inherit;"></textarea>
                    </div>

                    <!-- 提交控制 -->
                    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
                      <span v-if="msg.submitting" style="font-size: 13px; color: #00bcd4;">🌀 正在提交中...</span>
                      <span v-else-if="msg.submitSuccess" style="font-size: 13px; color: #4caf50;">✅ 提交成功！</span>
                      <span v-else-if="msg.submitError" style="font-size: 13px; color: #f44336; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="msg.submitError">❌ {{ msg.submitError }}</span>
                      
                      <button v-if="!msg.submitSuccess" class="btn btn-primary btn-sm" :disabled="msg.submitting || !msg.commitMessage?.trim()" @click="handleGitCommitCardSubmit(msg)" style="padding: 6px 14px; font-size: 13px;">
                        🚀 确认提交
                      </button>
                    </div>
                  </div>
                </div>

                <template v-else-if="msg.agenticRun">
                  <TaskExperienceCard
                    v-if="getGlobalTaskCard(msg)"
                    :card="getGlobalTaskCard(msg)"
                    context="global"
                    :busy="!!msg.agenticRunLoading"
                    @action="handleGlobalTaskAction(msg, $event)"
                  />
                  <div v-else class="bubble-content">{{ getVisibleGlobalMessageContent(msg) }}</div>
                  <details v-if="runtimeDebugSections(msg).length" class="global-runtime-debug">
                    <summary class="runtime-debug-head">
                      <strong>技术详情</strong>
                      <small>可展开排查</small>
                    </summary>
                    <div class="runtime-debug-grid">
                      <section v-for="section in runtimeDebugSections(msg)" :key="section.id" class="runtime-debug-section">
                        <strong>{{ section.title }}</strong>
                        <div v-for="row in section.items" :key="`${section.id}-${row.label}`">
                          <span>{{ row.label }}</span>
                          <code>{{ row.value }}</code>
                        </div>
                      </section>
                    </div>
                  </details>
                </template>

                <!-- 1. 处理结果高阶卡片 -->
                <div v-else-if="isSystemReceipt(msg.content)" class="system-receipt-card" :class="parseReceipt(msg.content).type">
                  <div class="receipt-header">
                    <span class="receipt-icon">{{ parseReceipt(msg.content).icon }}</span>
                    <span class="receipt-title">{{ parseReceipt(msg.content).title }}</span>
                  </div>
                  <div class="receipt-body">
                    <div v-for="(detail, dIdx) in parseReceipt(msg.content).details" :key="dIdx" class="receipt-row">
                      <span class="row-label">{{ detail.label }}:</span>
                      <span class="row-value">{{ detail.value }}</span>
                    </div>
                  </div>
                </div>
  
                <!-- 2. 项目运行报告折叠控制台 -->
                <div v-else-if="isProjectReport(msg.content)" class="project-report-card" :class="{ 'failed': !parseProjectReport(msg.content).success }">
                  <div class="report-header" @click="toggleReport(index)">
                    <div class="header-left">
                      <span class="status-indicator"></span>
                      <span class="project-tag">{{ parseProjectReport(msg.content).projectName }}</span>
                      <span class="report-title">{{ parseProjectReport(msg.content).title }}</span>
                    </div>
                    <span class="fold-arrow">{{ isReportOpen(index) ? '▼' : '▲' }}</span>
                  </div>
                  <div v-show="isReportOpen(index)" class="report-body">
                    <pre><code>{{ parseProjectReport(msg.content).body }}</code></pre>
                  </div>
                </div>
  
                <!-- 3. 普通文本 -->
                <div v-else class="bubble-content">{{ getVisibleGlobalMessageContent(msg) }}</div>
              </template>
  
              <!-- 用户消息普通渲染 -->
              <template v-else>
                <div class="bubble-content">{{ msg.content }}</div>
              </template>
  
              <!-- 渲染附件列表 -->
              <div v-if="Array.isArray(msg.files) && msg.files.length > 0" class="bubble-attachments">
                <div 
                  v-for="(file, fIdx) in msg.files" 
                  :key="fIdx"
                  class="attachment-card"
                  :title="file.name"
                >
                  <div v-if="isGlobalImageAttachment(file) && globalAttachmentUrl(file)" class="attachment-preview-img" @click="zoomImage(globalAttachmentUrl(file))">
                    <img :src="globalAttachmentUrl(file)" @load="scrollToBottom()" />
                  </div>
                  <a
                    v-else-if="globalAttachmentUrl(file)"
                    class="attachment-preview-file"
                    :href="globalAttachmentUrl(file)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span class="file-icon">📄</span>
                    <div class="file-info">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size" v-if="file.size">{{ formatSize(file.size) }}</span>
                    </div>
                  </a>
                  <div v-else class="attachment-preview-file">
                    <span class="file-icon">📄</span>
                    <div class="file-info">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size" v-if="file.size">{{ formatSize(file.size) }}</span>
                    </div>
                  </div>
                </div>
              </div>
  
              <div class="bubble-time">{{ new Date(msg.timestamp).toLocaleTimeString() }}</div>
            </div>
          </div>
          
          <!-- 执行系统动作 of 提示效果 -->
          <div v-if="executingAction" class="action-runner-indicator">
            <div class="runner-spinner">
              <div class="double-bounce1"></div>
              <div class="double-bounce2"></div>
            </div>
            <span class="runner-text">
              正在调起系统动作: 
              <strong>{{ executingAction.type }}</strong>
            </span>
          </div>
          
          <!-- 正在分析状态 -->
          <div v-if="isSending && (!currentSession?.messages?.length || currentSession.messages[currentSession.messages.length - 1].role !== 'assistant')" class="chat-bubble-wrapper assistant typing">
            <ChatAvatar role="agent" :size="40" class="avatar" />
            <div class="chat-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageNavigator
        :items="navMessages"
        :scroll-container="chatBody"
        target-id-prefix="msg-"
        @navigate="scrollToMessage"
      />
    </div>
      

</template>

<style scoped src="./GlobalAgentConversationStyles.css"></style>
<style scoped src="./GlobalAgentChromeStyles.css"></style>
