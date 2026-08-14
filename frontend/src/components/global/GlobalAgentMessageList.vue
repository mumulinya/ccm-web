<script setup>
import { computed } from 'vue'
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import ConversationMessageShell from '../common/ConversationMessageShell.vue'
import AgentExecutionTranscript from '../common/AgentExecutionTranscript.vue'
import NewProgressIndicator from '../common/NewProgressIndicator.vue'
import ConversationSummaryBoundary from '../common/ConversationSummaryBoundary.vue'
import AgentFinalAnswer from '../common/AgentFinalAnswer.vue'
import { shouldRenderExecutionTranscript } from '../../utils/agentExecutionEvents.js'
import {
  globalAttachmentUrl,
  isGlobalImageAttachment,
} from '../../utils/globalAgentAttachments.js'
import { getCopyableMessageText } from '../../utils/messageActions.js'
import { AlertCircle, CheckCircle2 } from '@lucide/vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  executionEvents: { type: Array, default: () => [] },
  executionEventsEnabled: { type: Boolean, default: true },
  currentSessionId: { type: String, default: '' },
  draft: Boolean,
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
  handleGlobalTaskAction: { type: Function, required: true },
  runtimeDebugSections: { type: Function, required: true },
  getVisibleGlobalMessageContent: { type: Function, required: true },
  isSystemReceipt: { type: Function, required: true },
  parseReceipt: { type: Function, required: true },
  isProjectReport: { type: Function, required: true },
  parseProjectReport: { type: Function, required: true },
  toggleReport: { type: Function, required: true },
  isReportOpen: { type: Function, required: true },
  toggleSelectAllFiles: { type: Function, required: true },
  getGitStatusColor: { type: Function, required: true },
  handleGitCommitCardSubmit: { type: Function, required: true },
  zoomImage: { type: Function, required: true },
  formatSize: { type: Function, required: true },
  pendingProgressCount: { type: Number, default: 0 },
  jumpToLatestProgress: { type: Function, required: true },
})

const emit = defineEmits(['edit-message', 'rewind-message', 'open-file-change', 'open-file-changes'])
const attachmentReadOk = file => file?.readable === true || ['parsed', 'partial', 'received'].includes(String(file?.status || '').toLowerCase())
const attachmentStatusLabel = file => {
  const status = String(file?.status || '').toLowerCase()
  if (status === 'partial') return '部分读取'
  if (file?.readable === true || status === 'parsed') return '已读取'
  if (['failed', 'blocked', 'unreadable'].includes(status)) return '未读取'
  return '已接收'
}
const isTaskExecutionMessage = (msg) => !!(
  msg?.globalMission
  || msg?.globalMissionSupervisor
  || msg?.agenticRun?.mission_id
  || msg?.agenticRun?.supervisor_id
  || msg?.type === 'global_mission'
)

const globalTaskExecutionActive = computed(() => (
  props.isSending && props.messages.some((message) => {
    if (!isTaskExecutionMessage(message)) return false
    const status = String(
      message?.taskExperience?.status
      || message?.taskExperience?.phase
      || message?.task?.status
      || message?.task?.phase
      || message?.agenticRun?.status
      || '',
    ).toLowerCase()
    return !['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled', 'reverted'].includes(status)
  })
))

// A global stream envelope exists before the first model text chunk. Once it
// has real execution rows, the shared transcript is its only live UI.
const hasLiveGlobalExecutionForMessage = messageIndex => shouldRenderExecutionTranscript(
  props.executionEvents,
  props.messages,
  messageIndex,
)

const LEGACY_GLOBAL_STREAM_LINE = /^\s*(?:\p{Extended_Pictographic}\uFE0F?|•)?\s*(?:理解需求|执行前计划(?:已整理)?|形成行动计划|规划下一步|组织回复|执行动作|动作已返回|执行遇到问题|需要补充信息|等待授权确认|已暂停|持续跟进中|已派发的工作|处理结果|失败|已取消|状态更新)\s*[：:]/u

// Older global SSE handling mirrored lifecycle checkpoints into message.content
// (for example “🧠 理解需求：…”).  When the shared transcript is available,
// that content is a duplicate execution UI rather than an assistant answer.
// Keep real streamed/final text visible and suppress only the legacy scaffold.
const isLegacyGlobalStreamText = (value = '') => {
  const lines = String(value).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  return lines.length > 0 && lines.every(line => LEGACY_GLOBAL_STREAM_LINE.test(line))
}

const shouldHideDuplicateGlobalBubble = (msg, messageIndex) => {
  if (msg?.role !== 'assistant') return false
  const hasLiveExecution = hasLiveGlobalExecutionForMessage(messageIndex)
  if (hasLiveExecution && isLegacyGlobalStreamText(msg?.content)) {
    const finalReply = String(msg?.agenticRun?.final_reply || msg?.agenticRun?.finalReply || '').trim()
    // Preserve an authoritative user-facing final answer from historical
    // records even if their old compatibility content still contains the
    // lifecycle scaffold.
    if (finalReply && !isLegacyGlobalStreamText(finalReply)) return false
    return true
  }
  const hasVisibleAnswer = !!String(
    msg?.agenticRun?.final_reply
      || msg?.agenticRun?.finalReply
      || msg?.content
      || '',
  ).trim()
  // Empty streaming envelopes stay invisible. A factual model-activity row is
  // projected after the 10 second threshold and owns the waiting experience.
  if (!hasVisibleAnswer) return true
  return false
}

const STRUCTURED_GLOBAL_MESSAGE_TYPES = new Set([
  'command_result',
  'conversation_summary_boundary',
  'management_action',
  'git_review',
  'git_commit',
])

const isPlainGlobalAssistantAnswer = msg => !!(
  msg?.role === 'assistant'
  && !STRUCTURED_GLOBAL_MESSAGE_TYPES.has(String(msg?.type || ''))
  && !props.isSystemReceipt(msg?.content)
  && !props.isProjectReport(msg?.content)
)

const isStructuredGlobalMessage = msg => !!(
  STRUCTURED_GLOBAL_MESSAGE_TYPES.has(String(msg?.type || ''))
  || isTaskExecutionMessage(msg)
  || props.isSystemReceipt(msg?.content)
  || props.isProjectReport(msg?.content)
)
</script>

<template>
      <div class="chat-body" :ref="setChatBody" @scroll="updateScrollState">
        <div :ref="setChatContentInner" class="chat-content-inner">
          <div class="chat-flow" :key="currentSessionId">
            <LoadingSkeleton v-if="!messages.length && isSending" :rows="5" />
            <EmptyState
              v-else-if="!messages.length"
              icon="＋"
              :title="draft ? '想让全局 Agent 做什么？' : '还没有消息'"
              :hint="draft ? '输入需求、粘贴图片或添加附件。发送第一条消息后，这个会话才会创建并进入列表。' : '在下方输入开始对话'"
            />
            <ConversationMessageShell
              v-for="(msg, index) in messages" 
              :key="index"
              :id="'msg-' + index"
              :role="msg.role"
              :timestamp="msg.timestamp || msg.created_at || msg.createdAt"
              :structured="isStructuredGlobalMessage(msg)"
              :streaming="!!msg.streaming"
              class="chat-bubble-wrapper"
              :class="[msg.role, { 'search-hit': searchHighlightMsgIndex === index, 'structured-message': isStructuredGlobalMessage(msg) }]"
              :data-local-command="msg.type === 'command_result' || undefined"
              :data-message-type="msg.type || undefined"
              :data-message-id="msg.id || undefined"
              :copy-text="getCopyableMessageText(msg, getVisibleGlobalMessageContent(msg))"
              :editable="msg.role === 'user' && !!String(msg.content || '').trim()"
              :edit-disabled="isSending"
              :rewindable="msg.role === 'assistant' && !msg.streaming && !!String(msg.id || '').trim()"
              :rewind-disabled="false"
              @edit="emit('edit-message', msg)"
              @rewind="emit('rewind-message', msg)"
            >
            <AgentExecutionTranscript
              :events="executionEvents"
              :enabled="executionEventsEnabled"
              :messages="messages"
              :message-index="index"
              stage-grouped
              presentation="live"
              @open-file-change="emit('open-file-change', $event)"
              @execution-action="handleGlobalTaskAction(msg, $event)"
            />
             <div
               v-if="!shouldHideDuplicateGlobalBubble(msg, index)"
               class="chat-bubble"
               :class="{ 'chat-bubble--final-answer': isPlainGlobalAssistantAnswer(msg) }"
             >
              <!-- 助手消息判定 -->
              <template v-if="msg.role === 'assistant'">
                <ConversationSummaryBoundary v-if="msg.type === 'conversation_summary_boundary'" :message="msg" />
                <div
                  v-else-if="msg.type === 'command_result'"
                  class="global-command-result"
                >
                  <CommandResultCard :result="msg.commandResult" />
                </div>
                <template
                  v-else-if="msg.type === 'global_stream' && !hasLiveGlobalExecutionForMessage(index)"
                >
                  <AgentFinalAnswer
                    v-if="String(getVisibleGlobalMessageContent(msg) || '').trim()"
                    :content="getVisibleGlobalMessageContent(msg)"
                    :streaming="!!msg.streaming"
                    :mentions="msg.mentions || []"
                    :storage-key="`${currentSessionId || 'session'}:${msg.id || index}`"
                  />
                  <div
                    v-else
                    class="global-stream-replying"
                    :data-run-id="msg.agenticRun?.id || undefined"
                    aria-live="polite"
                  >
                    <span class="stream-dot" :class="{ active: msg.streaming }"></span>
                    <span>{{ msg.streaming ? '正在回复...' : '回复已完成' }}</span>
                  </div>
                </template>
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
                  <AgentFinalAnswer
                    v-else
                    :content="getVisibleGlobalMessageContent(msg, '代码审查报告已整理，技术细节已放入技术详情。')"
                    :storage-key="`${currentSessionId || 'session'}:${msg.id || index}:review`"
                  />
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
                      <textarea v-model="msg.commitMessage" class="global-commit-message" placeholder="输入提交注释..."></textarea>
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
                  <AgentFinalAnswer
                    :content="getVisibleGlobalMessageContent(msg)"
                    :streaming="!!msg.streaming"
                    :mentions="msg.mentions || []"
                    :storage-key="`${currentSessionId || 'session'}:${msg.id || index}`"
                  />
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
                <AgentFinalAnswer
                  v-else
                  :content="getVisibleGlobalMessageContent(msg)"
                  :streaming="!!msg.streaming"
                  :mentions="msg.mentions || []"
                  :storage-key="`${currentSessionId || 'session'}:${msg.id || index}`"
                />
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
                      <span :class="['file-read-status', { ok: attachmentReadOk(file) }]">
                        <CheckCircle2 v-if="attachmentReadOk(file)" :size="12" />
                        <AlertCircle v-else :size="12" />
                        {{ attachmentStatusLabel(file) }}
                      </span>
                    </div>
                  </a>
                  <div v-else class="attachment-preview-file">
                    <span class="file-icon">📄</span>
                    <div class="file-info">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size" v-if="file.size">{{ formatSize(file.size) }}</span>
                      <span :class="['file-read-status', { ok: attachmentReadOk(file) }]">
                        <CheckCircle2 v-if="attachmentReadOk(file)" :size="12" />
                        <AlertCircle v-else :size="12" />
                        {{ attachmentStatusLabel(file) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
  
            </div>
            <AgentExecutionTranscript
              :events="executionEvents"
              :enabled="executionEventsEnabled"
              :messages="messages"
              :message-index="index"
              stage-grouped
              presentation="completed"
              @open-file-change="emit('open-file-change', $event)"
              @open-file-changes="emit('open-file-changes', $event)"
              @execution-action="handleGlobalTaskAction(msg, $event)"
            />
          </ConversationMessageShell>
          
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
          
        </div>
      </div>
      <NewProgressIndicator :count="pendingProgressCount" @activate="jumpToLatestProgress" />

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
