<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { toast } from '../../utils/toast.js'

const metrics = ref({ agents: {}, daily: {} })
const loading = ref(true)

const loadMetrics = async () => {
  try {
    const res = await fetch('/api/metrics')
    const data = await res.json()
    metrics.value = data.metrics || data || { agents: {}, daily: {} }
  } catch (e) {
    console.error('加载性能指标数据失败:', e)
  }
}

const resetMetrics = async () => {
  if (!confirm('确定清除所有历史性能指标数据？清除后无法恢复。')) return
  try {
    await fetch('/api/metrics/reset', { method: 'POST' })
    toast.success('性能指标数据已清除')
    loadMetrics()
  } catch (e) {
    toast.error('清除失败')
  }
}

// Agent 列表（按调用次数排序）
const agentList = computed(() => {
  return Object.entries(metrics.value.agents || {})
    .map(([name, data]) => ({
      name,
      ...data,
      successRate: data.calls > 0 ? Math.round((data.successes / data.calls) * 100) : 0,
      avgMsFormatted: data.avgMs > 1000 ? (data.avgMs / 1000).toFixed(1) + 's' : data.avgMs + 'ms',
      totalTokensFormatted: formatTokens((data.inputTokens || 0) + (data.outputTokens || 0)),
      totalCostFormatted: (data.totalCost || 0).toFixed(4)
    }))
    .sort((a, b) => b.calls - a.calls)
})

const formatTokens = (t) => {
  if (!t) return '0'
  if (t > 1000000) return (t / 1000000).toFixed(2) + 'M'
  if (t > 1000) return (t / 1000).toFixed(1) + 'k'
  return t.toString()
}

// 今日统计
const todayStats = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const todayData = metrics.value.daily?.[today] || {}
  let totalCalls = 0, totalSuccess = 0, totalFail = 0, totalMs = 0, totalFileChanges = 0
  let inputTokens = 0, outputTokens = 0, totalCost = 0
  for (const d of Object.values(todayData)) {
    totalCalls += d.calls
    totalSuccess += d.successes
    totalFail += d.failures
    totalMs += d.totalMs
    totalFileChanges += d.totalFileChanges || 0
    inputTokens += d.inputTokens || 0
    outputTokens += d.outputTokens || 0
    totalCost += d.totalCost || 0
  }
  return {
    calls: totalCalls,
    success: totalSuccess,
    fail: totalFail,
    fileChanges: totalFileChanges,
    avgMs: totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0,
    successRate: totalCalls > 0 ? Math.round((totalSuccess / totalCalls) * 100) : 0,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    totalTokensFormatted: formatTokens(inputTokens + outputTokens),
    totalCost,
    totalCostFormatted: totalCost.toFixed(4)
  }
})

// 总计成本
const allTimeStats = computed(() => {
  let inputTokens = 0, outputTokens = 0, totalCost = 0
  for (const a of Object.values(metrics.value.agents || {})) {
    inputTokens += a.inputTokens || 0
    outputTokens += a.outputTokens || 0
    totalCost += a.totalCost || 0
  }
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    totalTokensFormatted: formatTokens(inputTokens + outputTokens),
    totalCost,
    totalCostFormatted: totalCost.toFixed(4)
  }
})

// 最近 7 天趋势
const weeklyTrend = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    const dayData = metrics.value.daily?.[d] || {}
    let calls = 0, successes = 0
    for (const v of Object.values(dayData)) {
      calls += v.calls
      successes += v.successes
    }
    days.push({ date: d.slice(5), calls, successes })
  }
  return days
})

const maxCalls = computed(() => Math.max(1, ...weeklyTrend.value.map(d => d.calls)))

// 计算协作网络整体健康度
const systemHealth = computed(() => {
  const list = agentList.value
  if (list.length === 0) {
    return { 
      status: 'unknown', 
      text: '暂无数据', 
      cls: 'info', 
      desc: '当前系统暂无性能调用指标，在 Agent 开始工作或派发任务后将自动进行健康诊断。' 
    }
  }
  
  const avgSuccessRate = list.reduce((acc, a) => acc + a.successRate, 0) / list.length
  const avgResponse = list.reduce((acc, a) => acc + a.avgMs, 0) / list.length
  
  if (avgSuccessRate >= 80 && avgResponse <= 60000) {
    return {
      status: 'healthy',
      text: '健康运行 (Healthy)',
      cls: 'good',
      desc: '多 Agent 协作系统总体状态优秀，接口调用成功率较高，响应延迟在合理范围内。'
    }
  } else if (avgSuccessRate >= 50 || avgResponse <= 150000) {
    return {
      status: 'warning',
      text: '亚健康警告 (Warning)',
      cls: 'warn',
      desc: '系统检测到部分 Agent 出现了执行失败或响应超时。建议检查模型 API 密钥限额与网络环境。'
    }
  } else {
    return {
      status: 'critical',
      text: '故障风险 (Critical)',
      cls: 'bad',
      desc: 'Agent 状态严重异常，成功率偏低。请排查对应的终端进程和后台命令执行日志。'
    }
  }
})

// 甘特图 Trace 模拟数据
const selectedTraceJob = ref('deployment')
const traces = {
  deployment: {
    name: "项目部署与 ERP 联调 (ERP Live Deployment)",
    durationMs: 52000,
    spans: [
      { agent: 'coordinator', role: '协调总控', activity: '解析部署需求并建立工单', start: 0, end: 5, status: 'success' },
      { agent: 'nova-erp-server', role: '后端专家', activity: '编译 ERP 核心包并自测 API', start: 5, end: 18, status: 'success' },
      { agent: 'coordinator', role: '协调总控', activity: '同步后端状态并分发前端编译', start: 18, end: 20, status: 'success' },
      { agent: 'smart-live-app', role: '前端专家', activity: '编译 Vue 主包并部署静态托管', start: 20, end: 36, status: 'success' },
      { agent: 'smart-live-Cloud', role: '云上专家', activity: '配置 Docker 容器镜像与反向代理', start: 18, end: 46, status: 'success', isBottleneck: true },
      { agent: 'coordinator', role: '协调总控', activity: '执行集成测试与部署健康度检查', start: 46, end: 52, status: 'success' }
    ]
  },
  audit: {
    name: "自动化代码安全审查 (Security Audit & Review)",
    durationMs: 35000,
    spans: [
      { agent: 'coordinator', role: '协调总控', activity: '拉取最新 git diff 分支快照', start: 0, end: 3, status: 'success' },
      { agent: 'smart-live-app', role: '前端专家', activity: '静态安全扫描 src/ 目录语法漏洞', start: 3, end: 15, status: 'success', isBottleneck: true },
      { agent: 'nova-erp-server', role: '后端专家', activity: 'SQL 注入与越权逻辑漏洞代码审计', start: 3, end: 12, status: 'success' },
      { agent: 'coordinator', role: '协调总控', activity: '收集审计报告并智能归纳整改建议', start: 15, end: 22, status: 'success' },
      { agent: 'smart-live-Cloud', role: '云上专家', activity: '评估配置环境和依赖库安全', start: 22, end: 32, status: 'success' },
      { agent: 'coordinator', role: '协调总控', activity: '输出审查报告并在群聊发送汇总消息', start: 32, end: 35, status: 'success' }
    ]
  },
  diagnostics: {
    name: "系统环境故障一键诊断 (Env Crash Diagnostics)",
    durationMs: 28000,
    spans: [
      { agent: 'coordinator', role: '协调总控', activity: '检测到 Node 服务器故障，激活诊断流', start: 0, end: 2, status: 'success' },
      { agent: 'smart-live-Cloud', role: '云上专家', activity: '分析 PM2 日志与内存占用状态', start: 2, end: 11, status: 'success' },
      { agent: 'nova-erp-server', role: '后端专家', activity: '检查本地 sqlite 数据库锁占用状态', start: 11, end: 24, status: 'success', isBottleneck: true },
      { agent: 'coordinator', role: '协调总控', activity: '归纳出 Sqlite 锁死结论并下发修复指令', start: 24, end: 26, status: 'success' },
      { agent: 'smart-live-app', role: '前端专家', activity: '前端控制台降级状态检测与提示验证', start: 22, end: 27, status: 'success' },
      { agent: 'coordinator', role: '协调总控', activity: '确认修复成功，写入故障排查记录', start: 26, end: 28, status: 'success' }
    ]
  }
}

const currentTrace = computed(() => traces[selectedTraceJob.value])

let poller = null

const restartPoller = () => {
  if (poller) clearInterval(poller)
  const interval = parseInt(localStorage.getItem('app-polling-interval') || '10', 10)
  if (interval > 0) {
    poller = setInterval(loadMetrics, interval * 1000)
  }
}

const handleStorageChange = (e) => {
  if (e.key === 'app-polling-interval') {
    restartPoller()
  }
}

onMounted(async () => {
  loading.value = true
  await loadMetrics()
  loading.value = false
  
  restartPoller()
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  if (poller) clearInterval(poller)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<template>
  <div class="metrics-page">
    <!-- 今日性能概览 KPI -->
    <div class="stats-row">
      <div class="stat-card stat-blue">
        <div class="stat-icon-wrapper">📞</div>
        <div class="stat-value">{{ todayStats.calls }}</div>
        <div class="stat-label">今日总调用</div>
        <div class="glow-bg"></div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon-wrapper">✅</div>
        <div class="stat-value">{{ todayStats.successRate }}%</div>
        <div class="stat-label">今日成功率</div>
        <div class="glow-bg"></div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon-wrapper">⚡</div>
        <div class="stat-value">{{ todayStats.avgMs > 1000 ? (todayStats.avgMs / 1000).toFixed(1) + 's' : todayStats.avgMs + 'ms' }}</div>
        <div class="stat-label">平均响应时间</div>
        <div class="glow-bg"></div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon-wrapper">❌</div>
        <div class="stat-value text-red">{{ todayStats.fail }}</div>
        <div class="stat-label">今日失败数</div>
        <div class="glow-bg"></div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-icon-wrapper">📝</div>
        <div class="stat-value">{{ todayStats.fileChanges }}</div>
        <div class="stat-label">代码文件变更</div>
        <div class="glow-bg"></div>
      </div>
      <div class="stat-card stat-cyan">
        <div class="stat-icon-wrapper">🪙</div>
        <div class="stat-value">{{ todayStats.totalTokensFormatted }}</div>
        <div class="stat-label">今日 Token 消耗</div>
        <div class="glow-bg"></div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon-wrapper">💰</div>
        <div class="stat-value">¥{{ todayStats.totalCostFormatted }}</div>
        <div class="stat-label">今日预计账单</div>
        <div class="glow-bg"></div>
      </div>
    </div>

    <!-- 累计成本账单摘要 -->
    <div class="cost-summary-card">
      <div class="cs-content">
        <div class="cs-icon">💳</div>
        <div class="cs-text">
          <div class="cs-title">平台累计总账单</div>
          <div class="cs-val">¥{{ allTimeStats.totalCostFormatted }} <span class="cs-sub">(共消耗 {{ allTimeStats.totalTokensFormatted }} Tokens)</span></div>
        </div>
      </div>
    </div>

    <!-- 协作网络系统健康诊断面板 -->
    <div class="card health-card">
      <div class="health-header">
        <span class="pulse-ring" :class="systemHealth.cls"></span>
        <span class="health-title">协作网络运行状况：<strong :class="'text-' + systemHealth.cls">{{ systemHealth.text }}</strong></span>
      </div>
      <p class="health-desc">{{ systemHealth.desc }}</p>
    </div>

    <!-- 近 7 天调用趋势 ECharts 风格柱状图 -->
    <div class="section-card trend-card">
      <div class="section-header">
        <span>📈 近 7 天 Agent 调用趋势</span>
        <button class="btn btn-outline btn-sm" @click="resetMetrics">🗑 清除数据</button>
      </div>
      <div class="chart-area">
        <div class="bar-chart">
          <div v-for="day in weeklyTrend" :key="day.date" class="bar-group">
            <div class="bar-container-new">
              <!-- 霓虹发光基座 -->
              <div class="bar-base"></div>
              <!-- 总调用柱 (流光双色) -->
              <div class="bar-bar bar-total-new" :style="{ height: (day.calls / maxCalls * 100) + '%' }"></div>
              <!-- 成功调用柱 (渐变绿色) -->
              <div class="bar-bar bar-success-new" :style="{ height: (day.successes / maxCalls * 100) + '%' }"></div>
              <!-- HTML 自制悬浮气泡 -->
              <div class="chart-tooltip">
                <div class="date">{{ day.date }} 指标明细</div>
                <div class="row"><span class="dot blue"></span>总调用数: {{ day.calls }}</div>
                <div class="row"><span class="dot green"></span>成功次数: {{ day.successes }}</div>
                <div class="row"><span class="dot red"></span>失败次数: {{ day.calls - day.successes }}</div>
              </div>
            </div>
            <div class="bar-label">{{ day.date }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 📊 多 Agent 协同链路时序分析甘特图 -->
    <div class="section-card gantt-card">
      <div class="section-header">
        <span>📊 多 Agent 协同链路时序分析 (Trace Gantt Chart)</span>
        <div class="gantt-selector-wrap">
          <span class="lbl-sm">分析任务:</span>
          <select v-model="selectedTraceJob" class="gantt-select">
            <option value="deployment">项目部署与 ERP 联调</option>
            <option value="audit">自动化代码安全审查</option>
            <option value="diagnostics">系统环境故障一键诊断</option>
          </select>
        </div>
      </div>
      
      <div class="gantt-body">
        <!-- 时轴时间标记刻度线 -->
        <div class="gantt-timeline-header">
          <div class="gantt-axis-label">Agent 节点</div>
          <div class="gantt-time-scale">
            <span v-for="n in 6" :key="n" class="scale-mark" :style="{ left: ((n - 1) * 20) + '%' }">
              {{ Math.round(((n - 1) / 5) * currentTrace.durationMs / 1000) }}s
            </span>
          </div>
        </div>
        
        <!-- 各 Agent 甘特行 -->
        <div class="gantt-rows">
          <div v-for="(span, index) in currentTrace.spans" :key="index" class="menu-row-gantt">
            <div class="gantt-agent-info">
              <span class="g-name">🤖 {{ span.agent }}</span>
              <span class="g-role">{{ span.role }}</span>
            </div>
            
            <div class="gantt-track">
              <!-- 时轴内部网格竖线 -->
              <div v-for="n in 5" :key="n" class="track-grid-line" :style="{ left: (n * 20) + '%' }"></div>
              
              <!-- 甘特图 Span 进度条 -->
              <div class="gantt-span" 
                :class="[{ 'bottleneck-span': span.isBottleneck }]"
                :style="{ 
                  left: (span.start / currentTrace.durationMs * 100) + '%', 
                  width: ((span.end - span.start) / currentTrace.durationMs * 100) + '%' 
                }">
                <div class="span-inner">
                  <span class="span-text">{{ span.activity }}</span>
                  <span v-if="span.isBottleneck" class="bottleneck-tag">⚠️ 瓶颈 ({{ span.end - span.start }}s)</span>
                  <span v-else class="duration-tag">{{ span.end - span.start }}s</span>
                </div>
                
                <!-- 悬浮明细 Tooltip -->
                <div class="gantt-tooltip">
                  <div class="t-title">Span 链路明细</div>
                  <div class="t-row"><span class="lbl">执行主体:</span> <span class="val">{{ span.agent }} ({{ span.role }})</span></div>
                  <div class="t-row"><span class="lbl">具体活动:</span> <span class="val">{{ span.activity }}</span></div>
                  <div class="t-row"><span class="lbl">起始时间:</span> <span class="val">{{ span.start }}s - {{ span.end }}s</span></div>
                  <div class="t-row"><span class="lbl">持续耗时:</span> <span class="val font-mono">{{ span.end - span.start }}秒</span></div>
                  <div class="t-row"><span class="lbl">执行状态:</span> <span class="val text-good">🟢 SUCCESS</span></div>
                  <div v-if="span.isBottleneck" class="t-alert">
                    <strong>⚠️ 时延瓶颈警告：</strong>
                    该节点耗时占比达 {{ Math.round((span.end - span.start)/currentTrace.durationMs*100) }}%，建议拆分该 Agent 对应任务，或为其启用本地编译缓存以减小时延。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent 详细性能面板 -->
    <div class="section-card agents-card">
      <div class="section-header">
        <span>🤖 Agent 节点性能指标矩阵</span>
      </div>
      <div v-if="agentList.length === 0" class="empty">暂无 Agent 性能记录，在 Agent 触发协作后将自动记入该列表。</div>
      <div v-else class="agent-list">
        <div v-for="agent in agentList" :key="agent.name" class="agent-kpi-card">
          <div class="ak-card-title">
            <span class="name">🤖 {{ agent.name }}</span>
            <span class="status-badge" :class="{ good: agent.successRate >= 80, warn: agent.successRate >= 50 && agent.successRate < 80, bad: agent.successRate < 50 }">
              {{ agent.successRate }}% 健康度
            </span>
          </div>
          
          <div class="ak-card-grid">
            <!-- SVG 半圆仪表盘列 -->
            <div class="agent-gauge-col">
              <div class="gauge-wrapper">
                <svg width="100" height="60" viewBox="0 0 100 60">
                  <defs>
                    <linearGradient :id="'gaugeGrad-' + agent.name" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#ef4444" />
                      <stop offset="50%" stop-color="#eab308" />
                      <stop offset="100%" stop-color="#10b981" />
                    </linearGradient>
                  </defs>
                  <!-- 背景路径 -->
                  <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(0,0,0,0.03)" stroke-width="6" stroke-linecap="round" />
                  <!-- 进度填充路径 -->
                  <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" :stroke="'url(#gaugeGrad-' + agent.name + ')'" stroke-width="7" stroke-linecap="round"
                        :stroke-dasharray="Math.PI * 35"
                        :stroke-dashoffset="Math.PI * 35 * (1 - agent.successRate / 100)"
                        class="gauge-fill-path" />
                </svg>
                <div class="gauge-value">
                  <span class="pct">{{ agent.successRate }}%</span>
                  <span class="lbl">成功率</span>
                </div>
              </div>
            </div>
            
            <!-- 性能属性矩阵列 -->
            <div class="agent-matrix-col">
              <div class="matrix-grid">
                <div class="matrix-item">
                  <span class="icon">📞</span>
                  <div class="info">
                    <span class="val">{{ agent.calls }}</span>
                    <span class="lbl">总调用数</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon text-green">✅</span>
                  <div class="info">
                    <span class="val text-green">{{ agent.successes }}</span>
                    <span class="lbl">成功</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon text-red">❌</span>
                  <div class="info">
                    <span class="val text-red">{{ agent.failures }}</span>
                    <span class="lbl">失败</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon text-blue">⚡</span>
                  <div class="info">
                    <span class="val font-mono">{{ agent.avgMsFormatted }}</span>
                    <span class="lbl">平均耗时</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon">📁</span>
                  <div class="info">
                    <span class="val">{{ agent.totalFileChanges || 0 }}</span>
                    <span class="lbl">累计变更</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon">✏️</span>
                  <div class="info">
                    <span class="val">{{ agent.lastFileChangeCount || 0 }}</span>
                    <span class="lbl">上次变更</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon text-cyan">🪙</span>
                  <div class="info">
                    <span class="val">{{ agent.totalTokensFormatted }}</span>
                    <span class="lbl">总计 Token</span>
                  </div>
                </div>
                <div class="matrix-item">
                  <span class="icon text-gold">💰</span>
                  <div class="info">
                    <span class="val">¥{{ agent.totalCostFormatted }}</span>
                    <span class="lbl">累计成本</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 卡片最下方调用事件行 -->
          <div class="ak-card-footer">
            <span class="lbl">最后调用时间:</span>
            <span class="val font-mono">{{ agent.lastCall ? new Date(agent.lastCall).toLocaleString('zh-CN') : '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page { padding: 24px; overflow-y: auto; height: 100%; background: transparent; }

/* 1. KPI 发光卡片 */
.stats-row { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); 
  gap: 14px; 
  margin-bottom: 24px; 
}
.stat-card { 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 14px; 
  padding: 18px 14px; 
  text-align: center; 
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.02); 
}
.stat-card:hover { 
  transform: translateY(-3.5px); 
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.03); 
}

/* 独立指示卡颜色 glow */
.stat-blue:hover { border-color: rgba(59, 130, 246, 0.25); }
.stat-green:hover { border-color: rgba(16, 185, 129, 0.25); }
.stat-purple:hover { border-color: rgba(168, 85, 247, 0.25); }
.stat-red:hover { border-color: rgba(244, 63, 94, 0.25); }
.stat-orange:hover { border-color: rgba(249, 115, 22, 0.25); }

.stat-icon-wrapper { 
  font-size: 20px; 
  margin-bottom: 8px; 
}
.stat-value { 
  font-size: 26px; 
  font-weight: 700; 
  color: var(--text-primary); 
  font-family: 'Orbitron', monospace; 
  position: relative;
  z-index: 2;
}
.text-red { color: var(--accent-red) !important; }
.stat-label { 
  font-size: 11px; 
  color: var(--text-muted); 
  margin-top: 5px; 
  font-weight: 600; 
  position: relative;
  z-index: 2;
}

/* 卡片流光阴影底色 */
.glow-bg {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  bottom: -40px;
  right: -40px;
  filter: blur(35px);
  opacity: 0.06;
  transition: opacity 0.3s;
}
.stat-card:hover .glow-bg { opacity: 0.15; }
.stat-blue .glow-bg { background: #3b82f6; }
.stat-green .glow-bg { background: #10b981; }
.stat-purple .glow-bg { background: #a855f7; }
.stat-red .glow-bg { background: #f43f5e; }
.stat-orange .glow-bg { background: #f97316; }
.stat-cyan .glow-bg { background: #06b6d4; }
.stat-gold .glow-bg { background: #eab308; }

.stat-cyan:hover { border-color: rgba(6, 182, 212, 0.25); }
.stat-gold:hover { border-color: rgba(234, 179, 8, 0.25); }

/* 累计账单摘要卡片 */
.cost-summary-card {
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.3), rgba(15, 23, 42, 0.5));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 20px;
}
[data-theme="light"] .cost-summary-card {
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.7), rgba(241, 245, 249, 0.9));
  border-color: rgba(0, 0, 0, 0.05);
}
.cs-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.cs-icon {
  font-size: 28px;
  background: rgba(234, 179, 8, 0.15);
  padding: 10px;
  border-radius: 50%;
  color: #eab308;
}
.cs-text { display: flex; flex-direction: column; }
.cs-title { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600; }
.cs-val { font-size: 22px; font-weight: 800; font-family: 'Orbitron', monospace; color: var(--text-primary); }
.cs-sub { font-size: 13px; font-weight: 500; color: var(--text-muted); margin-left: 8px; font-family: -apple-system, sans-serif; }


/* 2. 系统整体健康卡 */
.health-card {
  margin-bottom: 24px;
  padding: 16px 20px;
}
.health-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.health-title {
  font-size: 13.5px;
  color: var(--text-secondary);
}
.health-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 8px;
  line-height: 1.5;
}
.pulse-ring {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
  display: inline-block;
}
.pulse-ring.good { background: #10b981; }
.pulse-ring.warn { background: #eab308; }
.pulse-ring.bad { background: #ef4444; }
.pulse-ring.info { background: #9ca3af; }

.pulse-ring::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0;
  animation: pulse-ring-anim 1.5s infinite ease-out;
}
.pulse-ring.good::after { color: #10b981; }
.pulse-ring.warn::after { color: #eab308; }
.pulse-ring.bad::after { color: #ef4444; }
.pulse-ring.info::after { color: #9ca3af; }

@keyframes pulse-ring-anim {
  0% { transform: scale(0.6); opacity: 0.6; }
  100% { transform: scale(1.4); opacity: 0; }
}

.text-good { color: var(--accent-green); }
.text-warn { color: var(--accent-yellow); }
.text-bad { color: var(--accent-red); }

/* 3. 7天趋势图卡片 */
.trend-card {
  margin-bottom: 24px;
}
.section-card { 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 14px; 
  overflow: hidden; 
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.02); 
}
.section-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 16px 20px; 
  border-bottom: 1px solid rgba(0, 0, 0, 0.04); 
  font-size: 13.5px; 
  font-weight: 700; 
  color: var(--text-secondary); 
  letter-spacing: 0.3px; 
}
.chart-area { padding: 24px 20px 10px; }

/* 霓虹柱状图 */
.bar-chart { 
  display: flex; 
  align-items: flex-end; 
  gap: 16px; 
  height: 140px; 
}
.bar-group { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
}
.bar-container-new { 
  width: 100%; 
  height: 100px; 
  display: flex; 
  flex-direction: column; 
  justify-content: flex-end; 
  position: relative; 
  cursor: pointer;
}
.bar-bar { 
  width: 100%; 
  border-radius: 4px 4px 0 0; 
  min-height: 2px; 
  transition: height 0.6s cubic-bezier(0.25, 0.8, 0.25, 1); 
}
.bar-total-new { 
  background: rgba(59, 130, 246, 0.08); 
  border: 1px solid rgba(59, 130, 246, 0.12); 
  position: absolute; 
  bottom: 0; 
}
.bar-success-new { 
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0.15) 100%); 
  position: relative; 
  z-index: 1; 
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.1); 
}

/* 霓虹底座 */
.bar-base {
  position: absolute;
  bottom: 0;
  left: 5%;
  right: 5%;
  height: 2px;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  opacity: 0.15;
  border-radius: 50%;
  z-index: 2;
  transition: opacity 0.3s;
}
.bar-container-new:hover .bar-base { opacity: 0.6; }

/* Tooltip 悬浮气泡 */
.chart-tooltip {
  position: absolute;
  bottom: 105%;
  left: 50%;
  transform: translate(-50%, 8px) scale(0.9);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  width: 120px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  opacity: 0;
  pointer-events: none;
  z-index: 100;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.bar-container-new:hover .chart-tooltip {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}
.chart-tooltip .date {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 5px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  padding-bottom: 3px;
}
.chart-tooltip .row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.chart-tooltip .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}
.chart-tooltip .dot.blue { background: #3b82f6; }
.chart-tooltip .dot.green { background: #10b981; }
.chart-tooltip .dot.red { background: #f43f5e; }

.bar-label { font-size: 10px; color: var(--text-muted); margin-top: 8px; font-family: 'Share Tech Mono', monospace; }

/* 4. Agent 性能矩阵详情 */
.agent-list { 
  padding: 16px; 
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 16px; 
}
.agent-kpi-card { 
  background: rgba(255, 255, 255, 0.35); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 12px; 
  padding: 18px; 
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
}
.agent-kpi-card:hover { 
  border-color: rgba(59, 130, 246, 0.18); 
  background: rgba(255,255,255,0.5);
  box-shadow: 0 8px 20px rgba(0,0,0,0.02);
}

.ak-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  padding-bottom: 10px;
}
.ak-card-title .name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.status-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}
.status-badge.good { background: rgba(16, 185, 129, 0.08); color: var(--accent-green); }
.status-badge.warn { background: rgba(251, 191, 36, 0.08); color: var(--accent-yellow); }
.status-badge.bad { background: rgba(244, 63, 94, 0.08); color: var(--accent-red); }

/* KPI 两列分栏：左侧半圆仪表，右侧属性矩阵 */
.ak-card-grid {
  display: grid;
  grid-template-columns: 1fr 2.5fr;
  gap: 16px;
  align-items: center;
}

/* SVG 半圆仪表 */
.agent-gauge-col {
  display: flex;
  justify-content: center;
}
.gauge-wrapper {
  position: relative;
  width: 100px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}
.gauge-fill-path {
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.gauge-value {
  position: absolute;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gauge-value .pct {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Orbitron', monospace;
}
.gauge-value .lbl {
  font-size: 7.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

/* 性能矩阵 */
.matrix-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.matrix-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 6px 10px;
}
.matrix-item .icon {
  font-size: 14px;
}
.matrix-item .info {
  display: flex;
  flex-direction: column;
}
.matrix-item .val {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}
.matrix-item .lbl {
  font-size: 8.5px;
  color: var(--text-muted);
  margin-top: 1px;
}

.text-green { color: var(--accent-green) !important; }
.text-red { color: var(--accent-red) !important; }
.text-blue { color: var(--accent-blue) !important; }

/* 底部最后调用行 */
.ak-card-footer {
  border-top: 1px solid rgba(0,0,0,0.02);
  padding-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
}
.ak-card-footer .lbl { color: var(--text-muted); }
.ak-card-footer .val { color: var(--text-secondary); }

.font-mono {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace !important;
}

.empty { padding: 40px; text-align: center; color: var(--text-muted); font-size: 12.5px; }

/* 通用按钮 */
.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-outline:hover { background: rgba(0,0,0,0.02); border-color: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 8px; }

/* 暗色主题深度兼容 */
[data-theme="dark"] .stat-card,
[data-theme="dark"] .health-card,
[data-theme="dark"] .section-card,
[data-theme="dark"] .agent-kpi-card,
[data-theme="dark"] .matrix-item {
  background: rgba(17, 24, 39, 0.75) !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
}
[data-theme="dark"] .bar-total-new {
  background: rgba(59, 130, 246, 0.04) !important;
  border-color: rgba(255,255,255,0.05) !important;
}
[data-theme="dark"] .chart-tooltip {
  background: rgba(17, 24, 39, 0.9) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
}
[data-theme="dark"] .chart-tooltip .date {
  border-bottom-color: rgba(255,255,255,0.05);
}
[data-theme="dark"] .matrix-item {
  background: rgba(0, 0, 0, 0.15) !important;
}
[data-theme="dark"] .gauge-value .pct {
  color: var(--text-primary) !important;
}

@media (max-width: 992px) {
  .stats-row { grid-template-columns: repeat(3, 1fr) !important; }
  .agent-list { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr) !important; }
  .ak-card-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .stats-row { grid-template-columns: 1fr !important; }
}

/* 5. 协作链路时序甘特图 (Gantt Chart) */
.gantt-card {
  margin-bottom: 24px;
}
.gantt-selector-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lbl-sm {
  font-size: 11px;
  color: var(--text-muted);
}
.gantt-select {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11.5px;
  color: var(--text-primary);
  outline: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.gantt-select:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.1);
}
.gantt-body {
  padding: 20px;
}
.gantt-timeline-header {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  padding-bottom: 8px;
}
.gantt-axis-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.gantt-time-scale {
  position: relative;
  height: 14px;
}
.scale-mark {
  position: absolute;
  font-size: 9.5px;
  font-family: 'Share Tech Mono', monospace;
  color: var(--text-muted);
  transform: translateX(-50%);
}

.gantt-rows {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.menu-row-gantt {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
  align-items: center;
}
.gantt-agent-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gantt-agent-info .g-name {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
}
.gantt-agent-info .g-role {
  font-size: 9px;
  color: var(--text-muted);
}
.gantt-track {
  position: relative;
  height: 24px;
  background: rgba(0,0,0,0.01);
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.track-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px dashed rgba(0, 0, 0, 0.03);
  pointer-events: none;
}

/* 甘特 Span 进度条 */
.gantt-span {
  position: absolute;
  height: 20px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.75) 0%, rgba(6, 182, 212, 0.75) 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.08);
  transition: all 0.2s;
  z-index: 10;
}
.gantt-span:hover {
  transform: scaleY(1.08);
  z-index: 100;
}
.span-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  overflow: hidden;
}
.span-text {
  font-size: 9.5px;
  color: white;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}
.duration-tag,
.bottleneck-tag {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Share Tech Mono', monospace;
  white-space: nowrap;
}

/* 瓶颈时延高亮 */
.bottleneck-span {
  background: linear-gradient(90deg, #f43f5e 0%, #f97316 100%) !important;
  border: 1px solid rgba(244, 63, 94, 0.3);
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.3) !important;
}

.bottleneck-tag {
  color: white;
  font-weight: 700;
}

/* 甘特时序 Hover 悬浮气泡 */
.gantt-span .gantt-tooltip {
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translate(-50%, 6px) scale(0.95);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  width: 250px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  opacity: 0;
  pointer-events: none;
  z-index: 1000;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gantt-span:hover .gantt-tooltip {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}
.gantt-tooltip .t-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  padding-bottom: 4px;
  margin-bottom: 4px;
}
.gantt-tooltip .t-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  line-height: 1.4;
}
.gantt-tooltip .t-row .lbl {
  color: var(--text-muted);
}
.gantt-tooltip .t-row .val {
  color: var(--text-secondary);
  font-weight: 600;
}
.gantt-tooltip .t-alert {
  margin-top: 6px;
  background: rgba(244, 63, 94, 0.05);
  border: 1px solid rgba(244, 63, 94, 0.1);
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 9.5px;
  color: var(--accent-red);
  line-height: 1.4;
}

[data-theme="dark"] .gantt-select {
  background: rgba(17, 24, 39, 0.7);
  border-color: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
[data-theme="dark"] .gantt-timeline-header {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .gantt-track {
  background: rgba(255,255,255,0.01);
}
[data-theme="dark"] .track-grid-line {
  border-left-color: rgba(255, 255, 255, 0.03);
}
[data-theme="dark"] .gantt-span .gantt-tooltip {
  background: rgba(17, 24, 39, 0.9) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
}
[data-theme="dark"] .gantt-tooltip .t-title {
  border-bottom-color: rgba(255,255,255,0.05);
}
[data-theme="dark"] .gantt-tooltip .t-alert {
  background: rgba(244, 63, 94, 0.08);
  border-color: rgba(244, 63, 94, 0.15);
}
</style>

