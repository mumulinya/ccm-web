const fs = require('fs');

const filePath = 'C:/Users/admin/.cc-connect/ccm/frontend/src/components/SystemDiagnostics.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add showAdvanced to script setup
content = content.replace(
  "const inferredVerificationApplyLoading = ref(false)",
  "const inferredVerificationApplyLoading = ref(false)\nconst showAdvanced = ref(false)"
);

// 2. Refactor template
// I need to extract the exact HTML content. Since the file is large, I'll do this carefully.
// I will slice out the entire <template>...</template> block and replace it.

const newTemplate = `
<template>
  <div class="system-diagnostics-page">
    <div class="settings-card aura-card">
      <div class="card-header">
        <div class="header-title-area">
          <span class="icon">🩺</span>
          <div>
            <div class="card-title">系统自检与就绪诊断</div>
            <div class="card-desc">对群聊主协调器、执行通道、外部执行器、子 Agent 连通性以及看门狗执行诊断体检</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" @click="loadOrchestratorDiagnostics" :disabled="orchestratorDiagnosticsLoading">
            <span class="icon">🔄</span> {{ orchestratorDiagnosticsLoading ? '自检中...' : '刷新状态' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="runAgentCliProbe" :disabled="agentCliProbeLoading">
            <span class="icon">⚡</span> {{ agentCliProbeLoading ? '复检中...' : '复检执行通道' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="runAgentRecoveryMonitor" :disabled="agentRecoveryMonitorLoading">
            <span class="icon">🩹</span> {{ agentRecoveryMonitorLoading ? '恢复中...' : '恢复自动任务' }}
          </button>
          <div class="divider"></div>
          <button class="btn btn-primary btn-sm" @click="runDailyDevRehearsal" :disabled="dailyDevRehearsalLoading">
            <span class="icon">🎭</span> {{ dailyDevRehearsalLoading ? '演练中...' : '闭环演练' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="createDailyDevSmokeTask" :disabled="dailyDevSmokeLoading">
            <span class="icon">🚀</span> {{ dailyDevSmokeLoading ? '创建中...' : '真实试运行' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="loadDailyDevSmokeStatus('', { silent: false })" :disabled="dailyDevSmokeLoading">
            <span class="icon">📡</span> {{ dailyDevSmokeLoading ? '刷新中...' : '试运行状态' }}
          </button>
        </div>
      </div>
      
      <div v-if="orchestratorDiagnostics" class="diagnostics-dashboard">
        <!-- 核心区 -->
        <div class="dashboard-core">
          <div class="glass-card hero-card" :class="orchestratorDiagnostics.readiness">
            <div class="auto-dev-hero">
              <div class="auto-dev-main">
                <div class="auto-dev-eyebrow">自动开发就绪状态</div>
                <h3>{{ getReadinessHeadline(orchestratorDiagnostics) }}</h3>
                <p>{{ getReadinessDescription(orchestratorDiagnostics) }}</p>
              </div>
              <div class="auto-dev-status" :class="orchestratorDiagnostics.readiness">
                {{ getReadinessText(orchestratorDiagnostics.readiness) }}
              </div>
            </div>
          </div>

          <div v-if="orchestratorDiagnostics.autopilot" class="glass-card summary-card" :class="orchestratorDiagnostics.autopilot.mode">
            <div class="auto-dev-summary">
              <div class="auto-dev-summary-copy">
                <strong>{{ getAutopilotPlainStatus(orchestratorDiagnostics.autopilot) }}</strong>
                <span>{{ getAutopilotPlainReason(orchestratorDiagnostics.autopilot) }}</span>
              </div>
              <b>{{ getAutopilotModeText(orchestratorDiagnostics.autopilot.mode) }}</b>
            </div>
            
            <div class="auto-dev-checklist mt-3">
              <div v-for="item in getAutoDevChecklist(orchestratorDiagnostics.autopilot)" :key="item.key" class="auto-dev-check" :class="item.state">
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.hint }}</span>
                </div>
                <b>{{ item.value }}</b>
              </div>
            </div>

            <div v-if="orchestratorDiagnostics.autopilot?.next_actions?.length" class="auto-dev-next-actions mt-3">
              <strong>建议下一步</strong>
              <ul>
                <li v-for="action in orchestratorDiagnostics.autopilot.next_actions" :key="action">{{ action }}</li>
              </ul>
            </div>

            <div class="auto-dev-controls mt-3">
              <button class="btn btn-primary btn-sm" :disabled="dailyDevAutopilotLoading" @click="runDailyDevAutopilot">
                {{ dailyDevAutopilotLoading ? '运行中...' : '试运行一次自动开发' }}
              </button>
              <button class="btn btn-outline btn-sm" :disabled="dailyDevCronEnsureLoading" @click="ensureDailyDevCronJobs">
                {{ dailyDevCronEnsureLoading ? '启用中...' : '开启定时接活' }}
              </button>
              <button class="btn btn-outline btn-sm" :disabled="inferredVerificationApplyLoading || !(orchestratorDiagnostics.autopilot.counts?.verificationInferred > 0)" @click="applyInferredVerificationCommands">
                {{ inferredVerificationApplyLoading ? '初始化中...' : '补齐验证命令' }}
              </button>
            </div>

            <div v-if="dailyDevAutopilotRun || inferredVerificationApplyRun || dailyDevCronEnsureRun" class="auto-dev-run-results mt-3">
              <div v-if="dailyDevAutopilotRun" class="autopilot-run-result">
                <span>续跑 {{ dailyDevAutopilotRun.continued || 0 }}</span>
                <span>导入 {{ dailyDevAutopilotRun.imported || 0 }}</span>
                <span>派发 {{ dailyDevAutopilotRun.dispatched || 0 }}</span>
                <span>入队 {{ dailyDevAutopilotRun.queued || 0 }}</span>
                <span>失败 {{ dailyDevAutopilotRun.failed || 0 }}</span>
                <span>执行准入 {{ dailyDevAutopilotRun.can_auto_execute_daily_dev ? '通过' : '等待' }}</span>
              </div>
              <div v-if="inferredVerificationApplyRun" class="autopilot-run-result">
                <span>验证命令已补齐 {{ inferredVerificationApplyRun.applied || 0 }}</span>
                <span>已有配置 {{ inferredVerificationApplyRun.skipped_configured || 0 }}</span>
                <span>无法推断 {{ inferredVerificationApplyRun.missing_inferred || 0 }}</span>
              </div>
              <div v-if="dailyDevCronEnsureRun" class="autopilot-run-result">
                <span>新建定时 {{ dailyDevCronEnsureRun.created || 0 }}</span>
                <span>重新启用 {{ dailyDevCronEnsureRun.enabled || 0 }}</span>
                <span>已存在 {{ dailyDevCronEnsureRun.existing || 0 }}</span>
                <span>跳过群聊 {{ dailyDevCronEnsureRun.skipped || 0 }}</span>
              </div>
            </div>

            <div v-if="dailyDevAutopilotRun?.outcome" class="autopilot-outcome mt-3" :class="{ blocked: dailyDevAutopilotRun.outcome.blocked }">
              <strong>{{ dailyDevAutopilotRun.outcome.message }}</strong>
              <p v-if="dailyDevAutopilotRun.execution_readiness?.message" class="autopilot-readiness-message">
                {{ dailyDevAutopilotRun.execution_readiness.message }}
              </p>
              <ul v-if="dailyDevAutopilotRun.outcome.next_actions?.length">
                <li v-for="action in dailyDevAutopilotRun.outcome.next_actions" :key="action">{{ action }}</li>
              </ul>
            </div>

            <div v-if="orchestratorDiagnostics.autopilot?.recent_cron?.length" class="autopilot-cron mt-3">
              <span v-for="job in orchestratorDiagnostics.autopilot.recent_cron" :key="job.id">
                {{ job.name }}：{{ job.last_result || job.last_status }}
              </span>
            </div>
          </div>
        </div>

        <!-- 矩阵与测试区 -->
        <div class="dashboard-matrix">
          <div v-if="showExecutionRecovery()" class="glass-card execution-recovery mb-3">
            <div class="execution-recovery-head">
              <strong>执行通道恢复步骤</strong>
              <span>{{ getExecutionRecoveryReason() }}</span>
            </div>
            <ol>
              <li>在项目目录启动外部执行器：<code>npm run agent-runner:ps</code></li>
              <li>在同一台机器确认 Claude CLI 可用：<code>claude -p</code></li>
              <li>点击顶部“复检执行通道”。探针通过后会自动触发看门狗恢复任务。</li>
            </ol>
          </div>

          <div v-if="agentProbeTargets.length" class="glass-card agent-probe-matrix">
            <div class="agent-probe-matrix-head">
              <div>
                <strong>子 Agent 运行检查</strong>
                <span>检查项目 Agent 真实调用情况。通过 {{ agentProbeMatrixCounts?.ready || 0 }}/{{ agentProbeMatrixCounts?.executable || 0 }} · 未检查 {{ agentProbeMatrixCounts?.missing || 0 }}</span>
              </div>
              <div class="agent-probe-actions">
                <button class="btn btn-outline btn-sm" @click="runAgentCliProbeBatch" :disabled="agentCliProbeBatchLoading || agentCliProbeLoading || !(agentProbeMatrixCounts?.executable > 0)">
                  {{ agentCliProbeBatchLoading ? '批量检查中...' : '检查全部子 Agent' }}
                </button>
              </div>
            </div>
            
            <div v-if="agentCliProbeBatch" class="agent-probe-batch-result mt-2">
              <span>批量复检 {{ agentCliProbeBatch.passed || 0 }}/{{ agentCliProbeBatch.total || 0 }}</span>
              <span>失败 {{ agentCliProbeBatch.failed || 0 }}</span>
              <span>跳过 {{ agentCliProbeBatch.skipped || 0 }}</span>
            </div>

            <div class="agent-probe-grid mt-3">
              <button v-for="target in agentProbeTargets" :key="target.key || (target.group_id + target.project)" 
                      class="agent-probe-row" 
                      :class="[getAgentProbeStatusClass(target), { active: agentCliProbeTargetKey === (target.group_id + '::' + target.project) }]" 
                      @click="selectProbeTarget(target)">
                <span class="agent-probe-state">{{ getAgentProbeStatusText(target) }}</span>
                <span class="agent-probe-main">{{ target.group_name }} / {{ target.project }}</span>
                <span class="agent-probe-sub">{{ target.agent_type }} · {{ target.command || '未记录命令' }}</span>
                <span class="agent-probe-time">{{ formatRunnerAge(target.age_ms) }}</span>
              </button>
            </div>
          </div>

          <!-- 运行结果反馈区 -->
          <div class="run-results-area mt-3" v-if="agentCliProbe || agentRecoveryMonitorRun || dailyDevRehearsal || dailyDevSmokeTask || dailyDevSmokeStatus">
            <div v-if="agentCliProbe" class="glass-card probe-box mb-2" :class="agentCliProbe.success ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ agentCliProbe.success ? '执行通道探针通过' : (agentCliProbe.blocked ? '执行通道仍阻塞' : '执行通道探针失败') }}</strong>
                <span>{{ agentCliProbe.target?.project || agentCliProbe.readiness?.mode || '未执行' }}</span>
              </div>
              <div class="probe-message mt-2">{{ agentCliProbe.message || agentCliProbe.error }}</div>
              <div v-if="agentCliProbe.target" class="smoke-task-meta mt-2">
                <span>群聊：{{ agentCliProbe.target.group_name }}</span>
                <span>子 Agent：{{ agentCliProbe.target.project }}</span>
                <span>命令类型：{{ agentCliProbe.target.agent_type }}</span>
                <span>耗时：{{ agentCliProbe.duration_ms || 0 }}ms</span>
              </div>
              <div v-if="agentCliProbeRecovery" class="smoke-task-meta mt-2">
                <span>卡住恢复：{{ agentCliProbeRecovery.recovered || 0 }}/{{ agentCliProbeRecovery.total_recoverable || 0 }}</span>
                <span>失败恢复：{{ agentCliProbeRecovery.runtime_queued || 0 }}</span>
              </div>
              <pre v-if="formatProbePreview(agentCliProbe.output_preview || agentCliProbe.output)" class="probe-output mt-2">{{ formatProbePreview(agentCliProbe.output_preview || agentCliProbe.output) }}</pre>
            </div>

            <div v-if="agentRecoveryMonitorRun" class="glass-card probe-box mb-2" :class="agentRecoveryMonitorRun.success ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ agentRecoveryMonitorRun.success ? '恢复监控已执行' : '恢复监控未通过' }}</strong>
                <span>{{ agentRecoveryMonitorRun.skipped ? '无需恢复' : (agentRecoveryMonitorRun.probe?.target?.project || agentRecoveryMonitorRun.probe?.readiness?.mode || '后台探针') }}</span>
              </div>
              <div class="probe-message mt-2">{{ agentRecoveryMonitorRun.reason || agentRecoveryMonitorRun.message || agentRecoveryMonitorRun.probe?.message || agentRecoveryMonitorRun.error }}</div>
              <div class="smoke-task-meta mt-2">
                <span>等待通道：{{ agentRecoveryMonitorRun.work?.blocked_pending?.length || 0 }}</span>
                <span>已恢复：{{ agentRecoveryMonitorRun.blocked_recovery?.recovered || 0 }}</span>
              </div>
            </div>

            <div v-if="dailyDevRehearsal" class="glass-card rehearsal-box mb-2" :class="dailyDevRehearsal.pass ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ dailyDevRehearsal.pass ? '闭环演练通过' : '闭环演练未通过' }}</strong>
                <span>{{ dailyDevRehearsal.group?.name || '未选择群聊' }}</span>
              </div>
              <div class="rehearsal-steps mt-2">
                <span v-for="step in dailyDevRehearsal.steps" :key="step.id" :class="step.status">
                  {{ step.status === 'ok' ? '通过' : '失败' }} · {{ step.message }}
                </span>
              </div>
            </div>

            <div v-if="dailyDevSmokeStatus || dailyDevSmokeTask" class="glass-card rehearsal-box mb-2" :class="(dailyDevSmokeStatus?.pass || dailyDevSmokeTask) ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ dailyDevSmokeStatus?.pass ? '真实试运行已通过' : (dailyDevSmokeStatus ? '真实试运行未通过' : '真实试运行任务已创建') }}</strong>
                <span>{{ dailyDevSmokeStatus?.status || (dailyDevSmokeTask?.queued ? '已入队' : '未入队') }}</span>
              </div>
              <div class="probe-message mt-2">{{ dailyDevSmokeStatus?.message }}</div>
              <div class="smoke-task-meta mt-2">
                <span>任务ID：{{ dailyDevSmokeStatus?.task?.id || dailyDevSmokeTask?.task?.id }}</span>
                <span>状态：{{ dailyDevSmokeStatus?.task?.status || '已入队' }}</span>
              </div>
              <div v-if="dailyDevSmokeStatus?.evidence" class="rehearsal-steps mt-2">
                <span :class="dailyDevSmokeStatus.evidence.task_done ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.task_done ? '通过' : '缺失' }} · 任务完成</span>
                <span :class="dailyDevSmokeStatus.evidence.file_exists ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.file_exists ? '通过' : '缺失' }} · smoke 文件</span>
                <span :class="dailyDevSmokeStatus.evidence.has_done_receipt ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.has_done_receipt ? '通过' : '缺失' }} · 子 Agent 回执</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 高级诊断明细折叠区 -->
      <div v-if="orchestratorDiagnostics" class="advanced-diagnostics-section mt-4">
        <button class="btn-toggle-advanced" @click="showAdvanced = !showAdvanced">
          <span>高级诊断明细 (Advanced Log Details)</span>
          <span class="icon">{{ showAdvanced ? '▲' : '▼' }}</span>
        </button>
        
        <div v-show="showAdvanced" class="diagnostics-list mt-3">
          <div v-for="check in orchestratorDiagnostics.checks" :key="check.id" class="diagnostic-item" :class="check.status">
            <span class="diagnostic-state">{{ getDiagnosticStatusText(check.status) }}</span>
            <div class="diagnostic-copy">
              <div class="diagnostic-label">{{ check.label }}</div>
              <div class="diagnostic-message">{{ check.message }}</div>
              
              <!-- Runner Detail -->
              <div v-if="getRunnerDetail(check)" class="runner-detail">
                <div class="runner-grid">
                  <span>Runner：{{ formatRunnerState(getRunnerDetail(check)) }}</span>
                  <span>请求：{{ getRunnerDetail(check).requests || 0 }}</span>
                  <span>最近：{{ formatRunnerAge(getRunnerDetail(check).last_result?.age_ms || getRunnerDetail(check).age_ms) }}</span>
                  <span>探针：{{ formatProbeState(getProbeDetail(check)) }}</span>
                </div>
                <div v-if="getProbeDetail(check)?.message" class="runner-probe" :class="getProbeDetail(check).success ? 'ok' : 'fail'">
                  {{ getProbeDetail(check).message }}
                </div>
                <div v-if="getRunnerDetail(check).last_result?.error" class="runner-error">
                  {{ getRunnerDetail(check).last_result.error }}
                </div>
                <div v-if="getChildProcessDetail(check)?.error" class="runner-node-error">
                  Node 子进程：{{ getChildProcessDetail(check).error }}
                </div>
              </div>

              <!-- Agent Probe Detail -->
              <div v-if="getAgentProbeCheckDetail(check)" class="recovery-monitor-detail">
                <div class="runner-grid">
                  <span>状态：{{ formatProbeState(getAgentProbeCheckDetail(check).probe) }}</span>
                  <span>健康：{{ getAgentProbeCheckDetail(check).probeHealth?.status || 'missing' }}</span>
                  <span>目标：{{ getAgentProbeCheckDetail(check).probe?.target?.project || '未选择' }}</span>
                </div>
                <div v-if="getAgentProbeCheckDetail(check).probe?.message" class="runner-probe" :class="getAgentProbeCheckDetail(check).probe?.success ? 'ok' : 'fail'">
                  {{ getAgentProbeCheckDetail(check).probe.message }}
                </div>
                <pre v-if="formatProbePreview(getAgentProbeCheckDetail(check).probe?.output_preview)" class="probe-output">{{ formatProbePreview(getAgentProbeCheckDetail(check).probe?.output_preview) }}</pre>
              </div>

              <!-- Recovery Monitor Detail -->
              <div v-if="getRecoveryMonitorDetail(check)" class="recovery-monitor-detail">
                <div class="runner-grid">
                  <span>监控：{{ formatRecoveryMonitorState(getRecoveryMonitorDetail(check)) }}</span>
                  <span>等待通道：{{ getRecoveryMonitorDetail(check).work?.blocked_pending?.length || 0 }}</span>
                </div>
              </div>

              <!-- Watchdog Detail -->
              <div v-if="getWatchdogDetail(check)" class="recovery-monitor-detail">
                <div class="runner-grid">
                  <span>待恢复：{{ getWatchdogDetail(check).stale_pending?.length || 0 }}</span>
                  <span>执行失败：{{ getWatchdogDetail(check).runtime_failed?.length || 0 }}</span>
                </div>
              </div>

              <!-- Project Verification Detail -->
              <div v-if="getProjectVerificationDetail(check)" class="verification-detail">
                <div class="runner-grid">
                  <span>已配置：{{ getProjectVerificationDetail(check).configured || 0 }}</span>
                  <span>缺失：{{ getProjectVerificationDetail(check).missing || 0 }}</span>
                </div>
                <div v-if="getProjectVerificationDetail(check).members?.length" class="verification-members">
                  <div v-for="member in getProjectVerificationDetail(check).members" :key="member.project" class="verification-member" :class="member.source">
                    <strong>{{ member.project || '未命名项目' }}</strong>
                    <span>{{ formatVerificationSource(member.source) }}</span>
                    <code>{{ member.commands?.length ? member.commands.join('；') : '未配置验证命令' }}</code>
                  </div>
                </div>
              </div>

              <!-- Worker Protocol Detail -->
              <div v-if="getWorkerProtocolDetail(check)" class="worker-protocol-detail">
                <div class="worker-protocol-grid">
                  <span v-for="item in formatBooleanChecks(getWorkerProtocolDetail(check).taskNotificationChecks)" :key="'notify-' + item.key" :class="item.ok ? 'ok' : 'fail'">
                    {{ item.ok ? '通过' : '失败' }} · {{ item.label }}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
`;

// Extract <template> from original content
const templateStart = content.indexOf('<template>');
const templateEnd = content.indexOf('</template>') + 11;
content = content.substring(0, templateStart) + newTemplate + content.substring(templateEnd);


// 3. Refactor <style scoped>
const styleStart = content.indexOf('<style scoped>');
const styleEnd = content.indexOf('</style>') + 8;

const newStyle = \`
<style scoped>
.system-diagnostics-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
}

/* Glassmorphism Card Utilities */
.aura-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  padding: 24px;
}
.glass-card {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.glass-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

/* Margin Utilities */
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 16px; }
.mt-4 { margin-top: 24px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 16px; }

/* Header Layout */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  margin-bottom: 24px;
}
.header-title-area {
  display: flex;
  align-items: center;
  gap: 14px;
}
.header-title-area .icon { font-size: 28px; }
.card-title { font-size: 18px; font-weight: 800; color: var(--text-primary); }
.card-desc { font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-actions .divider {
  width: 1px;
  height: 24px;
  background: rgba(15, 23, 42, 0.1);
  margin: 0 4px;
}

/* Dashboard Grid System */
.diagnostics-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.dashboard-core, .dashboard-matrix {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 1024px) {
  .diagnostics-dashboard {
    grid-template-columns: 1fr;
  }
}

/* AutoDev Hero (Core) */
.hero-card {
  position: relative;
  overflow: hidden;
}
.hero-card.ready { border-left: 4px solid var(--accent-green); background: rgba(34,197,94,0.05); }
.hero-card.partial { border-left: 4px solid var(--accent-yellow); background: rgba(234,179,8,0.05); }
.hero-card.blocked { border-left: 4px solid var(--accent-red); background: rgba(239,68,68,0.05); }

.auto-dev-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.auto-dev-main { display: flex; flex-direction: column; gap: 6px; }
.auto-dev-eyebrow { color: var(--accent-blue); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.auto-dev-main h3 { margin: 0; color: var(--text-primary); font-size: 20px; line-height: 1.3; }
.auto-dev-main p { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }

.auto-dev-status { padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 900; background: rgba(15,23,42,0.08); color: var(--text-primary); }
.auto-dev-status.ready { background: rgba(34,197,94,0.12); color: var(--accent-green); }
.auto-dev-status.partial { background: rgba(234,179,8,0.16); color: #854d0e; }
.auto-dev-status.blocked { background: rgba(239,68,68,0.12); color: #b91c1c; }

/* Summary Card */
.summary-card {
  display: flex;
  flex-direction: column;
}
.auto-dev-summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(15,23,42,0.06); }
.auto-dev-summary-copy strong { display: block; color: var(--text-primary); font-size: 14px; margin-bottom: 4px; }
.auto-dev-summary-copy span { color: var(--text-secondary); font-size: 12px; }
.auto-dev-summary b { padding: 4px 10px; border-radius: 6px; background: rgba(15,23,42,0.08); color: var(--text-primary); font-size: 11.5px; }

/* Checklist Grid */
.auto-dev-checklist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.auto-dev-check { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 12px; border-radius: 8px; border: 1px solid rgba(15,23,42,0.06); background: rgba(255,255,255,0.4); }
.auto-dev-check div { display: flex; flex-direction: column; gap: 3px; }
.auto-dev-check strong { color: var(--text-primary); font-size: 12px; font-weight: 700; }
.auto-dev-check span { color: var(--text-muted); font-size: 10.5px; line-height: 1.4; }
.auto-dev-check b { font-size: 13px; font-weight: 800; }
.auto-dev-check.ok b { color: var(--accent-green); }
.auto-dev-check.warn b { color: #854d0e; }
.auto-dev-check.fail b { color: #b91c1c; }

/* Next Actions & Controls */
.auto-dev-next-actions { padding: 12px; border-radius: 8px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); }
.auto-dev-next-actions strong { color: var(--accent-blue); font-size: 12px; display: block; margin-bottom: 6px; }
.auto-dev-next-actions ul { margin: 0; padding-left: 20px; color: var(--text-primary); font-size: 12px; line-height: 1.6; }
.auto-dev-controls { display: flex; flex-wrap: wrap; gap: 8px; }

.autopilot-run-result { display: flex; flex-wrap: wrap; gap: 8px; }
.autopilot-run-result span { padding: 4px 8px; border-radius: 6px; background: rgba(34,197,94,0.1); color: var(--accent-green); font-size: 11px; font-weight: 800; }
.autopilot-outcome { padding: 12px; border-radius: 8px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); }
.autopilot-outcome.blocked { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.25); }
.autopilot-outcome strong { display: block; color: var(--text-primary); font-size: 13px; margin-bottom: 6px; }
.autopilot-readiness-message { color: var(--text-secondary); font-size: 12px; line-height: 1.5; margin: 0 0 6px; }

/* Matrix Section */
.agent-probe-matrix-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.agent-probe-matrix-head div { display: flex; flex-direction: column; gap: 4px; }
.agent-probe-matrix-head strong { font-size: 14px; color: var(--text-primary); }
.agent-probe-matrix-head span { font-size: 12px; color: var(--text-secondary); }

.agent-probe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.agent-probe-row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  grid-template-areas: "state main time" "state sub sub";
  align-items: center;
  gap: 4px 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255,255,255,0.4);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}
.agent-probe-row:hover { background: rgba(255,255,255,0.8); }
.agent-probe-row.active { border-color: var(--accent-blue); box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
.agent-probe-state { grid-area: state; padding: 4px 6px; border-radius: 6px; background: #64748b; color: #fff; font-size: 10px; font-weight: 800; text-align: center; }
.agent-probe-row.ok .agent-probe-state { background: var(--accent-green); }
.agent-probe-row.warn .agent-probe-state { background: var(--accent-yellow); color: #422006; }
.agent-probe-row.fail .agent-probe-state { background: var(--accent-red); }
.agent-probe-main { grid-area: main; color: var(--text-primary); font-size: 12.5px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-probe-sub { grid-area: sub; color: var(--text-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-probe-time { grid-area: time; color: var(--text-muted); font-size: 10px; }

/* Advanced Details Section */
.btn-toggle-advanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px dashed rgba(15, 23, 42, 0.15);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-toggle-advanced:hover { background: rgba(15, 23, 42, 0.08); }

.diagnostics-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.diagnostic-item { display: flex; gap: 12px; padding: 14px; border-radius: 10px; border: 1px solid rgba(15, 23, 42, 0.08); background: rgba(255,255,255,0.4); }
.diagnostic-state { flex: 0 0 auto; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #fff; background: #64748b; height: fit-content; }
.diagnostic-item.ok .diagnostic-state { background: var(--accent-green); }
.diagnostic-item.warn .diagnostic-state { background: var(--accent-yellow); color: #422006; }
.diagnostic-item.fail .diagnostic-state { background: var(--accent-red); }
.diagnostic-copy { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.diagnostic-label { font-size: 13px; font-weight: 800; color: var(--text-primary); }
.diagnostic-message { font-size: 11.5px; line-height: 1.5; color: var(--text-secondary); }

/* Run Results */
.probe-box, .rehearsal-box { border-left: 4px solid #64748b; }
.probe-box.ok, .rehearsal-box.ok { border-left-color: var(--accent-green); }
.probe-box.fail, .rehearsal-box.fail { border-left-color: var(--accent-red); }
.rehearsal-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.rehearsal-head strong { color: var(--text-primary); }
.rehearsal-head span { color: var(--text-muted); font-size: 11px; }

/* Dark Mode Deep Customization */
[data-theme="dark"] .aura-card {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .glass-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .glass-card:hover {
  background: rgba(30, 41, 59, 0.8);
}
[data-theme="dark"] .auto-dev-check, 
[data-theme="dark"] .agent-probe-row,
[data-theme="dark"] .diagnostic-item {
  background: rgba(15, 23, 42, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .btn-toggle-advanced {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
[data-theme="dark"] .btn-toggle-advanced:hover {
  background: rgba(255, 255, 255, 0.1);
}
[data-theme="dark"] .header-actions .divider {
  background: rgba(255, 255, 255, 0.1);
}
</style>
\`;

content = content.substring(0, styleStart) + newStyle + content.substring(styleEnd);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully refactored SystemDiagnostics.vue');
