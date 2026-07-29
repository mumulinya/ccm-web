<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  CheckCircle2,
  ClipboardCheck,
  Code2,
  FileSearch,
  FlaskConical,
  GitPullRequestArrow,
  RotateCcw,
  ShieldCheck,
  UserCheck
} from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const loading = ref(true)
const saving = ref(false)
const enabled = ref(true)
const updatedAt = ref('')

const modeLabel = computed(() => enabled.value ? '独立验收已开启' : '主 Agent 自验模式')
const modeDescription = computed(() => enabled.value
  ? '代码或文件变更完成后，由 TestAgent 独立读取验收目标和真实证据。'
  : '新任务跳过 TestAgent，由群聊或项目主 Agent执行一次自验。')

const load = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/system/test-agent')
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '读取 TestAgent 设置失败')
    enabled.value = data.settings?.enabled !== false
    updatedAt.value = data.settings?.updated_at || ''
  } catch (error) {
    toast.error(error?.message || '读取 TestAgent 设置失败')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (loading.value || saving.value) return
  saving.value = true
  try {
    const response = await fetch('/api/system/test-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enabled.value })
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存 TestAgent 设置失败')
    enabled.value = data.settings?.enabled !== false
    updatedAt.value = data.settings?.updated_at || ''
    toast.success(enabled.value ? 'TestAgent 独立验收已开启' : '已切换为主 Agent 自验')
  } catch (error) {
    enabled.value = !enabled.value
    toast.error(error?.message || '保存 TestAgent 设置失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="settings-panel" data-settings-panel="test-agent">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <FlaskConical :size="20" />
        <div>
          <h2>TestAgent 验收</h2>
          <p>控制群聊与项目自动开发是否使用独立测试 Agent。设置只影响新进入验收阶段的任务。</p>
        </div>
      </div>
    </header>

    <div class="settings-status-banner" :class="{ ready: enabled }">
      <div class="settings-status-copy">
        <ShieldCheck :size="18" />
        <div><strong>{{ loading ? '正在读取设置' : modeLabel }}</strong><span>{{ modeDescription }}</span></div>
      </div>
      <label class="settings-switch">
        <input v-model="enabled" type="checkbox" :disabled="loading || saving" @change="save">
        <span class="settings-switch-track" />
        <span>{{ enabled ? '开启' : '关闭' }}</span>
      </label>
    </div>

    <div class="test-agent-flow">
      <article><span><FlaskConical :size="16" /></span><div><strong>它负责什么</strong><p>独立核对用户目标、验收标准、源码变更、命令结果、接口或浏览器证据，不参与业务代码修改。</p></div></article>
      <article><span><CheckCircle2 :size="16" /></span><div><strong>开启后</strong><p>TestAgent独立验收；发现实现缺口时，主 Agent生成精确返工单并最多复验三轮。</p></div></article>
      <article><span><UserCheck :size="16" /></span><div><strong>关闭后</strong><p>不运行 TestAgent，不产生独立验收结论；主 Agent只自验一轮，证据不足仍会阻止交付。</p></div></article>
    </div>

    <section class="test-agent-section">
      <div class="test-agent-section-heading">
        <div><strong>一次完整验收如何进行</strong><p>只在产生代码、文件或需要独立复核的任务完成开发后介入，普通问答不会触发。</p></div>
        <span>最多 3 轮</span>
      </div>
      <div class="test-agent-steps">
        <article><i>1</i><div><strong>接收验收材料</strong><p>读取用户目标、主 Agent制定的验收标准、开发回执、真实文件变更和执行证据。</p></div></article>
        <article><i>2</i><div><strong>独立检查</strong><p>按项目测试目标运行允许的命令、接口或浏览器场景，并核对实际结果。</p></div></article>
        <article><i>3</i><div><strong>给出结论</strong><p>明确标记通过、证据不足或不通过，并为每个问题附上可定位的证据。</p></div></article>
        <article><i>4</i><div><strong>返工与复验</strong><p>不通过时由主 Agent整理返工单，原开发 Agent修复后再次验收；达到上限则交给用户处理。</p></div></article>
      </div>
    </section>

    <section class="test-agent-section">
      <div class="test-agent-section-heading">
        <div><strong>它会重点检查这些内容</strong><p>验收以真实证据为准，不以开发 Agent自述的“已经完成”为准。</p></div>
      </div>
      <div class="test-agent-checks">
        <article><Code2 :size="17" /><div><strong>代码与文件</strong><p>变更文件是否真实存在，修改范围是否符合目标，有无遗漏、越界或无关改动。</p></div></article>
        <article><ClipboardCheck :size="17" /><div><strong>测试与构建</strong><p>测试、类型检查、构建和项目验证命令是否真实执行，退出状态与结果是否可信。</p></div></article>
        <article><FileSearch :size="17" /><div><strong>接口与页面</strong><p>按测试目标检查 API、登录流程、关键交互、浏览器状态、截图和错误信息。</p></div></article>
        <article><GitPullRequestArrow :size="17" /><div><strong>交付完整性</strong><p>逐项核对验收标准、风险、未完成事项和实际产物，避免只完成任务的一部分。</p></div></article>
      </div>
    </section>

    <section class="test-agent-boundary">
      <div>
        <ShieldCheck :size="17" />
        <div><strong>TestAgent 不会修改代码</strong><p>它保持只读，只负责检查和提供证据。需要修复时，由主 Agent把精确返工单交回原开发 Agent。</p></div>
      </div>
      <div>
        <RotateCcw :size="17" />
        <div><strong>失败不会无限循环</strong><p>最多返工复验三轮；环境缺失、连续失败或需要产品决策时会停止，并向用户说明阻塞原因。</p></div>
      </div>
    </section>

    <div class="settings-security-note">
      <ShieldCheck :size="16" />
      <span>建议正式开发保持开启。关闭可以减少执行时间和模型消耗，但主 Agent既负责规划又负责验收，独立性和缺陷发现能力会降低。</span>
    </div>
    <small v-if="updatedAt" class="test-agent-updated">最后更新：{{ new Date(updatedAt).toLocaleString() }}</small>
  </section>
</template>

<style scoped>
.test-agent-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.test-agent-flow article{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary)}.test-agent-flow article>span{width:34px;height:34px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent-blue) 22%,var(--border-color));border-radius:7px;color:var(--accent-blue);background:color-mix(in srgb,var(--accent-blue) 7%,var(--bg-primary))}.test-agent-flow strong,.test-agent-section strong,.test-agent-boundary strong{font-size:12px}.test-agent-flow p,.test-agent-section p,.test-agent-boundary p{margin:5px 0 0;color:var(--text-muted);font-size:10.5px;line-height:1.55}.test-agent-section{margin-top:14px;padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary)}.test-agent-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color)}.test-agent-section-heading>div>p{margin-top:4px}.test-agent-section-heading>span{flex:none;padding:4px 7px;border:1px solid color-mix(in srgb,var(--accent-blue) 28%,var(--border-color));border-radius:6px;color:var(--accent-blue);background:color-mix(in srgb,var(--accent-blue) 7%,transparent);font-size:9.5px}.test-agent-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;padding-top:14px}.test-agent-steps article{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding-right:16px}.test-agent-steps article:not(:last-child)::after{content:"";position:absolute;top:11px;right:4px;width:8px;border-top:1px solid var(--border-color)}.test-agent-steps i{width:24px;height:24px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent-blue) 35%,var(--border-color));border-radius:50%;color:var(--accent-blue);background:var(--bg-primary);font-size:10px;font-style:normal}.test-agent-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding-top:14px}.test-agent-checks article{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:10px;border:1px solid color-mix(in srgb,var(--border-color) 75%,transparent);border-radius:7px;background:var(--bg-primary)}.test-agent-checks article>svg{margin-top:1px;color:var(--accent-blue)}.test-agent-boundary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.test-agent-boundary>div{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:12px;border-left:2px solid var(--accent-blue);background:color-mix(in srgb,var(--accent-blue) 5%,var(--bg-secondary))}.test-agent-boundary svg{margin-top:1px;color:var(--accent-blue)}.test-agent-updated{display:block;margin-top:12px;color:var(--text-muted);font-size:10px}@media(max-width:1050px){.test-agent-steps{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.test-agent-steps article:not(:last-child)::after{display:none}}@media(max-width:900px){.test-agent-flow,.test-agent-checks,.test-agent-boundary,.test-agent-steps{grid-template-columns:1fr}}
</style>
