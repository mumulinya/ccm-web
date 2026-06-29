import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "./utils";
import { loadFeishuConfig, loadTasks } from "./db";
import { isRuntimeCommandAvailable } from "./collaboration-resilience";
import { getReliabilityDrillStatus } from "./reliability-drills";
import { getReliabilityLedgerStats, listTaskLeases } from "./reliability-ledger";

const ROOT = path.join(CCM_DIR, "reliability", "soak");
const STATE_FILE = path.join(ROOT, "state.json");
const REPORT_DIR = path.join(ROOT, "reports");
const BOOT_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(4).toString("hex")}`;
let sampleTimer: NodeJS.Timeout | null = null;
let sampleInFlight = false;

function ensureDirs() {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function writeJsonAtomic(file: string, value: any) {
  ensureDirs();
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function readJson(file: string, fallback: any = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
  try { return JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8")); } catch { return fallback; }
}

function processAlive(pid: number) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readPid(file: string) {
  try { return Number(fs.readFileSync(file, "utf-8").trim()) || 0; } catch { return 0; }
}

function samplesFile(testId: string) {
  return path.join(ROOT, `samples-${String(testId).replace(/[^a-zA-Z0-9_.-]/g, "_")}.jsonl`);
}

function readSamples(testId: string) {
  const file = samplesFile(testId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function appendSample(testId: string, sample: any) {
  fs.appendFileSync(samplesFile(testId), `${JSON.stringify(sample)}\n`, "utf-8");
}

function taskCounts(tasks: any[]) {
  const statuses: Record<string, number> = {};
  for (const task of tasks) statuses[String(task.status || "unknown")] = Number(statuses[String(task.status || "unknown")] || 0) + 1;
  const idempotencyGroups = new Map<string, number>();
  for (const task of tasks) {
    const key = String(task.idempotency_key || "").trim();
    if (key) idempotencyGroups.set(key, Number(idempotencyGroups.get(key) || 0) + 1);
  }
  return {
    total: tasks.length,
    statuses,
    duplicate_idempotency_groups: Array.from(idempotencyGroups.values()).filter(count => count > 1).length,
  };
}

function runnerSnapshot() {
  const file = path.join(CCM_DIR, "agent-runner", "heartbeat.json");
  const heartbeat = readJson(file, null);
  const pid = Number(heartbeat?.pid || 0);
  const ageMs = heartbeat?.updated_at ? Date.now() - Date.parse(heartbeat.updated_at) : null;
  return {
    status: heartbeat?.status || "missing",
    pid,
    process_alive: processAlive(pid),
    heartbeat_age_ms: ageMs,
    healthy: !!heartbeat && processAlive(pid) && ageMs !== null && ageMs < (heartbeat.status === "running" ? 10 * 60 * 1000 : 30_000) && heartbeat.status !== "error",
  };
}

function feishuSnapshot() {
  const config = loadFeishuConfig();
  const globalPid = readPid(path.join(CCM_DIR, "pids", "ccm-control-bot.pid"));
  const configDir = path.join(CCM_DIR, "configs");
  const projectConnections = fs.existsSync(configDir)
    ? fs.readdirSync(configDir).filter(name => /^\.config-.*\.toml\.lock$/i.test(name)).map(name => {
      const pid = readPid(path.join(configDir, name));
      return { config: name.replace(/^\.|\.lock$/g, ""), pid, alive: processAlive(pid) };
    })
    : [];
  const globalExpected = config.control_bot_enabled === true;
  const activeProjects = projectConnections.filter(item => item.alive);
  return {
    global: { expected: globalExpected, pid: globalPid, alive: processAlive(globalPid) },
    projects: projectConnections,
    active_project_connections: activeProjects.length,
    stale_project_locks: projectConnections.filter(item => !item.alive).length,
    healthy: !globalExpected || processAlive(globalPid),
  };
}

async function eventLoopLagMs() {
  const started = Date.now();
  await new Promise(resolve => setTimeout(resolve, 25));
  return Math.max(0, Date.now() - started - 25);
}

function makeAlert(code: string, severity: "warning" | "critical", message: string, data: any = {}) {
  return { code, severity, message, data };
}

function evaluateSample(sample: any, baseline: any) {
  const alerts: any[] = [];
  const rssGrowth = Number(sample.memory.rss || 0) - Number(baseline?.memory?.rss || sample.memory.rss || 0);
  const traceGrowth = Number(sample.ledger.traces.bytes || 0) - Number(baseline?.ledger?.traces?.bytes || sample.ledger.traces.bytes || 0);
  if (!sample.runner.healthy) alerts.push(makeAlert("runner_unhealthy", "critical", "Agent Runner 心跳或进程异常", sample.runner));
  if (!sample.feishu.healthy) alerts.push(makeAlert("feishu_unhealthy", "critical", "至少一个预期的飞书连接未存活", sample.feishu));
  if (sample.ledger.leases.stale > Number(baseline?.ledger?.leases?.stale || 0)) alerts.push(makeAlert("new_stale_task_lease", "warning", `新增失效任务租约：${sample.ledger.leases.stale - Number(baseline?.ledger?.leases?.stale || 0)}`));
  if (sample.ledger.operations.stale_in_progress > Number(baseline?.ledger?.operations?.stale_in_progress || 0)) alerts.push(makeAlert("new_stale_idempotency", "warning", `新增失效幂等操作：${sample.ledger.operations.stale_in_progress - Number(baseline?.ledger?.operations?.stale_in_progress || 0)}`));
  if (sample.tasks.duplicate_idempotency_groups > Number(baseline?.tasks?.duplicate_idempotency_groups || 0)) alerts.push(makeAlert("new_duplicate_tasks", "critical", `新增重复任务组：${sample.tasks.duplicate_idempotency_groups - Number(baseline?.tasks?.duplicate_idempotency_groups || 0)}`));
  if (sample.tasks.stuck_without_lease > Number(baseline?.tasks?.stuck_without_lease || 0)) alerts.push(makeAlert("new_stuck_tasks", "critical", `新增无有效租约的长时间执行任务：${sample.tasks.stuck_without_lease - Number(baseline?.tasks?.stuck_without_lease || 0)}`));
  if (sample.event_loop_lag_ms > 500) alerts.push(makeAlert("event_loop_lag", "warning", `事件循环延迟 ${sample.event_loop_lag_ms}ms`));
  if (rssGrowth > 256 * 1024 * 1024) alerts.push(makeAlert("rss_growth", "warning", `RSS 相对基线增长 ${Math.round(rssGrowth / 1024 / 1024)}MB`));
  if (traceGrowth > 200 * 1024 * 1024) alerts.push(makeAlert("trace_growth", "warning", `Trace 数据相对基线增长 ${Math.round(traceGrowth / 1024 / 1024)}MB`));
  if (!Object.values(sample.runtimes).some(Boolean)) alerts.push(makeAlert("all_runtimes_unavailable", "critical", "Claude/Codex/Cursor 均不可用"));
  if (sample.drill?.last_result?.pass === false) alerts.push(makeAlert("fault_drill_failed", "critical", "最近一次自动故障演练失败", sample.drill.last_result));
  return alerts;
}

export async function collectSoakSample() {
  const tasks = loadTasks();
  const leases = listTaskLeases();
  const activeLeaseTasks = new Set(leases.filter((item: any) => item.status === "active" && processAlive(Number(item.owner_pid || 0)) && Date.parse(item.expires_at || 0) > Date.now()).map((item: any) => item.task_id));
  const stuckWithoutLease = tasks.filter((task: any) => task.status === "in_progress" && Date.now() - Date.parse(task.updated_at || task.started_at || task.created_at || 0) > 30 * 60 * 1000 && !activeLeaseTasks.has(task.id)).length;
  const memory = process.memoryUsage();
  return {
    at: new Date().toISOString(),
    boot_id: BOOT_ID,
    pid: process.pid,
    uptime_seconds: Math.round(process.uptime()),
    memory: { rss: memory.rss, heap_used: memory.heapUsed, heap_total: memory.heapTotal, external: memory.external },
    event_loop_lag_ms: await eventLoopLagMs(),
    tasks: { ...taskCounts(tasks), stuck_without_lease: stuckWithoutLease },
    ledger: getReliabilityLedgerStats(),
    runner: runnerSnapshot(),
    feishu: feishuSnapshot(),
    runtimes: {
      claudecode: isRuntimeCommandAvailable("claudecode"),
      codex: isRuntimeCommandAvailable("codex"),
      cursor: isRuntimeCommandAvailable("cursor"),
    },
    drill: getReliabilityDrillStatus(),
  };
}

function aggregateSamples(state: any, samples: any[]) {
  const values = (selector: (sample: any) => number) => samples.map(selector).filter(Number.isFinite);
  const summarize = (numbers: number[]) => numbers.length ? { min: Math.min(...numbers), max: Math.max(...numbers), avg: Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length), first: numbers[0], last: numbers[numbers.length - 1] } : { min: 0, max: 0, avg: 0, first: 0, last: 0 };
  const rss = summarize(values(sample => Number(sample.memory?.rss || 0)));
  const heap = summarize(values(sample => Number(sample.memory?.heap_used || 0)));
  const lag = summarize(values(sample => Number(sample.event_loop_lag_ms || 0)));
  const runnerHealthy = samples.filter(sample => sample.runner?.healthy).length;
  const feishuHealthy = samples.filter(sample => sample.feishu?.healthy).length;
  const criticalAlerts = (state.alerts || []).filter((alert: any) => alert.severity === "critical");
  const warningAlerts = (state.alerts || []).filter((alert: any) => alert.severity === "warning");
  const duplicateGroupsMax = Math.max(0, ...samples.map(sample => Number(sample.tasks?.duplicate_idempotency_groups || 0)));
  const stuckTasksMax = Math.max(0, ...samples.map(sample => Number(sample.tasks?.stuck_without_lease || 0)));
  const baselineDuplicateGroups = Number(state.baseline?.tasks?.duplicate_idempotency_groups || 0);
  const baselineStuckTasks = Number(state.baseline?.tasks?.stuck_without_lease || 0);
  const restarts = new Set(samples.map(sample => sample.boot_id).filter(Boolean)).size - 1;
  const durationHours = samples.length > 1 ? (Date.parse(samples[samples.length - 1].at) - Date.parse(samples[0].at)) / 3_600_000 : 0;
  const rssGrowthPerHour = durationHours > 0 ? Math.round((rss.last - rss.first) / durationHours) : 0;
  const pass = criticalAlerts.length === 0 && duplicateGroupsMax <= baselineDuplicateGroups && stuckTasksMax <= baselineStuckTasks && runnerHealthy === samples.length && feishuHealthy === samples.length;
  return {
    verdict: pass ? "stable" : criticalAlerts.length ? "failed" : "warning",
    pass,
    samples: samples.length,
    observed_hours: Number(durationHours.toFixed(3)),
    restarts_observed: Math.max(0, restarts),
    availability: {
      runner_percent: samples.length ? Number((runnerHealthy / samples.length * 100).toFixed(2)) : 0,
      feishu_percent: samples.length ? Number((feishuHealthy / samples.length * 100).toFixed(2)) : 0,
    },
    memory: { rss, heap_used: heap, rss_growth_per_hour: rssGrowthPerHour },
    event_loop_lag_ms: lag,
    invariants: {
      no_new_duplicate_tasks: duplicateGroupsMax <= baselineDuplicateGroups,
      no_new_stuck_tasks_without_lease: stuckTasksMax <= baselineStuckTasks,
      runner_always_healthy: runnerHealthy === samples.length,
      feishu_always_healthy: feishuHealthy === samples.length,
      fault_drill_passed: samples.every(sample => sample.drill?.last_result?.pass !== false),
    },
    alerts: { critical: criticalAlerts.length, warning: warningAlerts.length, items: state.alerts || [] },
  };
}

function reportMarkdown(state: any, summary: any) {
  const mb = (value: number) => `${(Number(value || 0) / 1024 / 1024).toFixed(1)} MB`;
  return [
    `# CCM ${state.duration_hours} 小时稳定性浸泡测试报告`,
    "",
    `- 测试 ID：${state.id}`,
    `- 状态：${state.status}`,
    `- 开始：${state.started_at}`,
    `- 结束：${state.completed_at || state.ends_at}`,
    `- 结论：${summary.verdict}`,
    `- 样本：${summary.samples}`,
    `- 检测到服务重启：${summary.restarts_observed} 次`,
    "",
    "## 可用性",
    "",
    `- Agent Runner：${summary.availability.runner_percent}%`,
    `- 飞书连接：${summary.availability.feishu_percent}%`,
    "",
    "## 资源",
    "",
    `- RSS：${mb(summary.memory.rss.first)} → ${mb(summary.memory.rss.last)}，峰值 ${mb(summary.memory.rss.max)}`,
    `- RSS 增长速率：${mb(summary.memory.rss_growth_per_hour)}/小时`,
    `- Heap 峰值：${mb(summary.memory.heap_used.max)}`,
    `- 事件循环延迟峰值：${summary.event_loop_lag_ms.max} ms`,
    "",
    "## 起始基线",
    "",
    `- 原有无租约长时间任务：${state.baseline_findings?.stuck_tasks_without_lease || 0}`,
    `- 原有失效租约：${state.baseline_findings?.stale_task_leases || 0}`,
    `- 原有失效飞书锁文件：${state.baseline_findings?.stale_feishu_lock_files || 0}`,
    "",
    "## 核心不变量",
    "",
    ...Object.entries(summary.invariants).map(([key, value]) => `- ${value ? "通过" : "失败"}：${key}`),
    "",
    "## 告警",
    "",
    ...(summary.alerts.items.length ? summary.alerts.items.map((item: any) => `- [${item.severity}] ${item.code}：${item.message}（${item.first_at}，出现 ${item.count} 次）`) : ["- 无"]),
    "",
  ].join("\n");
}

function finishTest(state: any, status: "completed" | "stopped" | "failed", reason = "") {
  if (sampleTimer) clearInterval(sampleTimer);
  sampleTimer = null;
  state.status = status;
  state.completed_at = new Date().toISOString();
  state.stop_reason = reason;
  const samples = readSamples(state.id);
  const summary = aggregateSamples(state, samples);
  const jsonFile = path.join(REPORT_DIR, `${state.id}.json`);
  const markdownFile = path.join(REPORT_DIR, `${state.id}.md`);
  const report = { version: 1, test: { ...state, latest_sample: undefined }, summary, generated_at: new Date().toISOString() };
  writeJsonAtomic(jsonFile, report);
  fs.writeFileSync(markdownFile, reportMarkdown(state, summary), "utf-8");
  state.report = { json_path: jsonFile, markdown_path: markdownFile, summary };
  writeJsonAtomic(STATE_FILE, state);
  return state;
}

async function takeSampleAndPersist() {
  if (sampleInFlight) return getSoakTestStatus();
  sampleInFlight = true;
  try {
    const state = readJson(STATE_FILE, null);
    if (!state || state.status !== "running") return state;
    const sample = await collectSoakSample();
    const alerts = evaluateSample(sample, state.baseline);
    const existingAlerts = Array.isArray(state.alerts) ? state.alerts : [];
    for (const alert of alerts) {
      const existing = existingAlerts.find((item: any) => item.code === alert.code && item.severity === alert.severity);
      if (existing) {
        existing.count = Number(existing.count || 1) + 1;
        existing.last_at = sample.at;
        existing.data = alert.data;
      } else {
        existingAlerts.push({ ...alert, count: 1, first_at: sample.at, last_at: sample.at });
      }
    }
    appendSample(state.id, { ...sample, alerts });
    state.alerts = existingAlerts.slice(-200);
    state.samples_count = Number(state.samples_count || 0) + 1;
    state.last_sample_at = sample.at;
    state.next_sample_at = new Date(Date.now() + state.interval_ms).toISOString();
    state.latest_sample = sample;
    state.boot_ids = Array.from(new Set([...(state.boot_ids || []), BOOT_ID]));
    writeJsonAtomic(STATE_FILE, state);
    if (Date.now() >= Date.parse(state.ends_at)) return finishTest(state, "completed");
    return state;
  } catch (error: any) {
    const state = readJson(STATE_FILE, null);
    if (state) {
      state.sample_errors = Number(state.sample_errors || 0) + 1;
      state.last_sample_error = String(error.message || error).slice(0, 2000);
      writeJsonAtomic(STATE_FILE, state);
    }
    return state;
  } finally {
    sampleInFlight = false;
  }
}

function scheduleSamples(state: any) {
  if (sampleTimer) clearInterval(sampleTimer);
  sampleTimer = setInterval(() => { void takeSampleAndPersist(); }, state.interval_ms);
  sampleTimer.unref?.();
}

export async function startSoakTest(options: any = {}) {
  ensureDirs();
  const existing = readJson(STATE_FILE, null);
  if (existing?.status === "running" && options.force !== true) return { started: false, already_running: true, state: existing };
  if (existing?.status === "running") finishTest(existing, "stopped", "由新浸泡测试替换");
  const durationMs = Math.max(5_000, Math.min(7 * 24 * 60 * 60 * 1000, Number(options.duration_ms || options.durationMs || 24 * 60 * 60 * 1000)));
  const intervalMs = Math.max(1_000, Math.min(10 * 60 * 1000, Number(options.interval_ms || options.intervalMs || 60_000)));
  const initialSample = await collectSoakSample();
  const startedAt = new Date().toISOString();
  const state: any = {
    version: 1,
    id: `soak_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    status: "running",
    started_at: startedAt,
    ends_at: new Date(Date.now() + durationMs).toISOString(),
    duration_ms: durationMs,
    duration_hours: Number((durationMs / 3_600_000).toFixed(3)),
    interval_ms: intervalMs,
    samples_count: 0,
    sample_errors: 0,
    alerts: [],
    boot_ids: [BOOT_ID],
    baseline: initialSample,
    baseline_findings: {
      stale_task_leases: initialSample.ledger?.leases?.stale || 0,
      stale_idempotency_operations: initialSample.ledger?.operations?.stale_in_progress || 0,
      stuck_tasks_without_lease: initialSample.tasks?.stuck_without_lease || 0,
      duplicate_task_groups: initialSample.tasks?.duplicate_idempotency_groups || 0,
      stale_feishu_lock_files: initialSample.feishu?.stale_project_locks || 0,
    },
    latest_sample: initialSample,
    next_sample_at: new Date(Date.now() + intervalMs).toISOString(),
  };
  writeJsonAtomic(STATE_FILE, state);
  appendSample(state.id, { ...initialSample, alerts: evaluateSample(initialSample, initialSample) });
  state.samples_count = 1;
  state.last_sample_at = initialSample.at;
  writeJsonAtomic(STATE_FILE, state);
  scheduleSamples(state);
  return { started: true, state };
}

export function getSoakTestStatus() {
  const state = readJson(STATE_FILE, null);
  if (!state) return { status: "not_started" };
  return {
    ...state,
    scheduler_running: !!sampleTimer,
    remaining_ms: state.status === "running" ? Math.max(0, Date.parse(state.ends_at) - Date.now()) : 0,
  };
}

export async function sampleSoakTestNow() {
  return takeSampleAndPersist();
}

export function stopSoakTest(reason = "用户停止浸泡测试") {
  const state = readJson(STATE_FILE, null);
  if (!state || state.status !== "running") return state || { status: "not_started" };
  return finishTest(state, "stopped", reason);
}

export function resumeSoakTest() {
  const state = readJson(STATE_FILE, null);
  if (!state || state.status !== "running") return { resumed: false, state };
  state.boot_ids = Array.from(new Set([...(state.boot_ids || []), BOOT_ID]));
  state.resumed_at = new Date().toISOString();
  writeJsonAtomic(STATE_FILE, state);
  if (Date.now() >= Date.parse(state.ends_at)) {
    void takeSampleAndPersist();
    return { resumed: true, finalizing: true, state };
  }
  scheduleSamples(state);
  void takeSampleAndPersist();
  return { resumed: true, state };
}

export function shutdownSoakMonitor() {
  if (sampleTimer) clearInterval(sampleTimer);
  sampleTimer = null;
}

export function getSoakReport() {
  const state = readJson(STATE_FILE, null);
  if (!state?.report?.json_path) return null;
  return readJson(state.report.json_path, null);
}

export function runSoakTestSelfTest() {
  const samples = [
    { at: "2026-01-01T00:00:00.000Z", boot_id: "a", memory: { rss: 100, heap_used: 50 }, event_loop_lag_ms: 2, runner: { healthy: true }, feishu: { healthy: true }, tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 }, drill: { last_result: { pass: true } } },
    { at: "2026-01-01T01:00:00.000Z", boot_id: "b", memory: { rss: 120, heap_used: 60 }, event_loop_lag_ms: 3, runner: { healthy: true }, feishu: { healthy: true }, tasks: { duplicate_idempotency_groups: 0, stuck_without_lease: 0 }, drill: { last_result: { pass: true } } },
  ];
  const summary = aggregateSamples({ alerts: [] }, samples);
  const checks = {
    stableSamplesPass: summary.pass === true && summary.verdict === "stable",
    restartIsObserved: summary.restarts_observed === 1,
    availabilityCalculated: summary.availability.runner_percent === 100 && summary.availability.feishu_percent === 100,
    memorySlopeCalculated: summary.memory.rss_growth_per_hour === 20,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
