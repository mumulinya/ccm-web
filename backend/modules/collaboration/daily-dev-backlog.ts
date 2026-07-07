import * as crypto from "crypto";
import { getConfigs, loadCronJobs, loadTasks, saveCronJobs } from "../../core/db";
import { loadGroups, saveGroups } from "./storage";

type DailyDevRuntimeDeps = {
  validateDailyDevGroupReady: (group: any) => any;
  getReadyDailyDevMembers: (group: any, configs?: any[]) => any;
  getTaskExecutionPhase: (task: any) => string;
  taskNeedsUserIntervention: (task: any) => boolean;
  isTaskQueuedInMemory: (taskId: string) => boolean;
  createTask: (task: any) => any;
  enqueueTask: (taskId: string, ctx: any) => any;
  getQueueStatus: () => any;
  getAgentExecutionReadiness: () => any;
  continueDailyDevTasksFromGaps: (ctx: any, options: any) => any;
  buildDailyDevAgentDiagnostics: () => any;
  hasDailyDevContinuationGaps: (task: any) => boolean;
};

let runtimeDeps: Partial<DailyDevRuntimeDeps> = {};

export function configureDailyDevBacklogRuntime(deps: DailyDevRuntimeDeps) {
  runtimeDeps = deps;
}

function dep<K extends keyof DailyDevRuntimeDeps>(name: K): DailyDevRuntimeDeps[K] {
  const value = runtimeDeps[name];
  if (!value) throw new Error(`Daily Dev backlog runtime dependency is not configured: ${String(name)}`);
  return value as DailyDevRuntimeDeps[K];
}

const PRIORITY_WEIGHT: Record<string, number> = { high: 3, normal: 2, low: 1 };

function compactFormText(value: any, fallback = "未填写") {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  return text || fallback;
}

function makeDailyDevBacklogFileName(title: string) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = String(title || "requirement")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "requirement";
  return `backlog-${day}-${slug}-${crypto.randomBytes(3).toString("hex")}.md`;
}

function buildDailyDevBacklogUserQuestion(quality: any) {
  const missing = Array.isArray(quality?.missing) ? quality.missing.filter(Boolean) : [];
  if (!missing.length) return "请补充业务目标、开发范围、业务/接口文档或验收标准后再派发。";
  return `为了让主 Agent 稳定拆分并派发给子 Agent，请补充：${missing.join("、")}。`;
}

function buildDailyDevBacklogDocument(payload: any, title: string, goal: string) {
  const createdAt = new Date().toISOString();
  const quality = evaluateDailyDevIntakeQuality(payload || {}, goal || payload?.business_goal || payload?.businessGoal || "");
  const initialState = quality.pass ? "ready" : "needs_user";
  return [
    `# ${compactFormText(title, goal.slice(0, 60) || "业务开发需求")}`,
    "",
    `- 状态: ${initialState}`,
    `- 类型: daily_dev`,
    `- 优先级: ${compactFormText(payload.priority, "normal")}`,
    `- 创建时间: ${createdAt}`,
    `- 代码变更: ${payload.requires_code_changes === false || payload.requiresCodeChanges === false ? "允许无代码变更" : "必须有实际文件变更"}`,
    "",
    "## 业务目标",
    compactFormText(goal),
    "",
    "## 开发范围",
    compactFormText(payload.scope || payload.development_scope || payload.developmentScope),
    "",
    "## 业务/接口文档",
    compactFormText(payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments),
    "",
    "## 验收标准",
    compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria),
    "",
    "## 约束/注意事项",
    compactFormText(payload.constraints || payload.notes, "无"),
    "",
    "## 需要用户补充",
    quality.pass ? "无" : buildDailyDevBacklogUserQuestion(quality),
    "",
    "## 主 Agent 执行要求",
    "- 读取本需求后，先判断涉及项目和子 Agent。",
    "- 拆分成可执行工作单，派发给对应子 Agent 编写代码。",
    "- 等待 CCM_AGENT_RECEIPT，并在最终报告中引用变更文件、验证结果和风险。",
  ].join("\n");
}

export function persistDailyDevBacklogFile(groups: any[], group: any, payload: any, title: string, goal: string) {
  if (payload.persist_documents === false || payload.persistDocuments === false) return null;
  if (!group.shared_files) group.shared_files = [];
  const name = makeDailyDevBacklogFileName(title || goal);
  const quality = evaluateDailyDevIntakeQuality(payload || {}, goal || payload?.business_goal || payload?.businessGoal || "");
  const initialState = quality.pass ? "ready" : "needs_user";
  const content = buildDailyDevBacklogDocument(payload, title, goal);
  const record = {
    name,
    type: "text",
    readable: true,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: "daily_dev_backlog",
    status: initialState,
    needs_user_question: initialState === "needs_user" ? buildDailyDevBacklogUserQuestion(quality) : "",
    state_history: [{
      state: initialState,
      reason: initialState === "ready" ? "需求信息足够，等待主 Agent 认领" : "需求信息不足，等待用户补充",
      actor: "system",
      at: new Date().toISOString(),
    }],
  };
  group.shared_files.push(record);
  saveGroups(groups);
  return { name, content, status: initialState };
}

export function readDailyDevBacklogStatus(file: any) {
  const explicit = String(file?.status || "").trim().toLowerCase();
  if (explicit) return explicit;
  const match = String(file?.content || "").match(/^\s*-\s*状态\s*:\s*([^\n\r]+)/mi);
  return String(match?.[1] || "").trim().toLowerCase();
}

function readDailyDevBacklogPriority(file: any) {
  const explicit = String(file?.priority || "").trim().toLowerCase();
  const match = String(file?.content || "").match(/^\s*-\s*优先级\s*:\s*([^\n\r]+)/mi);
  const priority = explicit || String(match?.[1] || "normal").trim().toLowerCase();
  return PRIORITY_WEIGHT[priority] ? priority : "normal";
}

const DAILY_DEV_BACKLOG_STATES = ["draft", "needs_user", "ready", "planned", "dispatched", "running", "reviewing", "blocked", "failed", "done"];

function normalizeDailyDevBacklogState(status: any) {
  const value = String(status || "").trim().toLowerCase();
  if (DAILY_DEV_BACKLOG_STATES.includes(value)) return value;
  if (value === "queued") return "dispatched";
  if (value === "in_progress") return "running";
  return value || "draft";
}

function dailyDevBacklogStateLabel(state: string) {
  return ({
    draft: "草稿",
    needs_user: "待补充",
    ready: "可接活",
    planned: "已计划",
    dispatched: "已派发",
    running: "执行中",
    reviewing: "验收中",
    blocked: "阻塞",
    failed: "失败",
    done: "完成",
  } as any)[state] || state || "未知";
}

function appendDailyDevBacklogHistory(file: any, state: string, reason = "", actor = "system") {
  if (!file) return;
  const history = Array.isArray(file.state_history) ? file.state_history : [];
  const last = history[history.length - 1];
  if (last?.state === state && last?.reason === reason) return;
  file.state_history = [...history, {
    state,
    reason: String(reason || "").slice(0, 500),
    actor,
    at: new Date().toISOString(),
  }].slice(-30);
}

function getDailyDevBacklogTask(file: any) {
  const taskId = String(file?.task_id || "").trim();
  if (!taskId) return null;
  return loadTasks().find((task: any) => task.id === taskId) || null;
}

function getDailyDevBacklogQuality(file: any) {
  const payload = extractDailyDevBacklogPayload(file);
  return evaluateDailyDevIntakeQuality(payload, payload.business_goal || "");
}

function buildDailyDevBacklogStateCard(file: any, group: any) {
  const rawStatus = readDailyDevBacklogStatus(file) || "draft";
  const task = getDailyDevBacklogTask(file);
  const quality = getDailyDevBacklogQuality(file);
  let state = normalizeDailyDevBacklogState(rawStatus);
  let owner = "用户";
  let nextAction = "补充业务目标、范围、文档或验收标准";
  let blocker = "";
  let questionToUser = String(file?.needs_user_question || "");
  const evidence: string[] = [];

  if (!quality.pass && !task && !["blocked", "failed", "done"].includes(state)) {
    state = "needs_user";
    blocker = quality.missing.join("；");
    questionToUser = questionToUser || buildDailyDevBacklogUserQuestion(quality);
  }

  if (task) {
    owner = task.target_project || "主 Agent";
    evidence.push(`关联任务 ${task.id}`);
    const summary = task.delivery_summary || {};
    const phase = dep("getTaskExecutionPhase")(task);
    if (task.status === "done") {
      state = "done";
      nextAction = "查看交付报告或发起新需求";
      if (summary.has_final_review) evidence.push("主 Agent 已复盘");
      if (summary.actual_file_change_count) evidence.push(`实际变更 ${summary.actual_file_change_count} 个`);
      if (summary.verification_executed?.length) evidence.push(`已验证 ${summary.verification_executed.length} 项`);
    } else if (task.status === "failed") {
      state = "failed";
      owner = "主 Agent / 用户";
      nextAction = "点击重试或按阻塞项继续";
      blocker = task.status_detail || task.result || file.last_result || "任务执行失败";
    } else if (phase === "blocked" || dep("taskNeedsUserIntervention")(task)) {
      state = "blocked";
      owner = "用户 / 系统恢复";
      nextAction = "按阻塞项补充信息或复检执行通道";
      blocker = task.status_detail || (summary.blockers || summary.needs || [])[0] || file.last_result || "等待人工处理";
    } else if (task.status === "in_progress") {
      state = summary.has_final_review || summary.receipt_statuses?.length ? "reviewing" : "running";
      owner = state === "reviewing" ? "主 Agent" : "子 Agent";
      nextAction = state === "reviewing" ? "等待主 Agent 汇总验收" : "等待子 Agent 执行并提交结果说明";
    } else if (dep("isTaskQueuedInMemory")(task.id)) {
      state = "dispatched";
      owner = "任务队列";
      nextAction = "等待队列调度主 Agent";
    } else {
      state = "planned";
      owner = "主 Agent";
      nextAction = "加入队列或等待定时接活调度";
    }
  } else if (state === "ready") {
    owner = "主 Agent";
    nextAction = dailyDevGroupCanDispatch(group?.id || "") ? "等待自动接活，或点击立即派发" : "先修复群聊/项目 Agent 配置";
  } else if (state === "dispatched" || rawStatus === "queued") {
    owner = "主 Agent";
    nextAction = "等待任务创建或队列恢复";
  } else if (state === "blocked") {
    owner = "用户";
    nextAction = "补充信息后恢复为 ready";
    blocker = file.last_result || "需求被标记阻塞";
  } else if (state === "failed") {
    owner = "用户 / 主 Agent";
    nextAction = "恢复为 ready 后重派";
    blocker = file.last_result || "需求处理失败";
  }

  return {
    state,
    raw_status: rawStatus,
    owner,
    next_action: nextAction,
    blocker,
    question_to_user: questionToUser,
    quality,
    evidence,
    history: Array.isArray(file.state_history) ? file.state_history : [],
  };
}

export function isDailyDevBacklogFile(file: any) {
  const content = String(file?.content || "");
  return file?.category === "daily_dev_backlog"
    || /^backlog-[\w-]+\.md$/i.test(String(file?.name || ""))
    || /类型\s*:\s*daily_dev/i.test(content);
}

function extractMarkdownSection(content: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "mi");
  return String(content.match(pattern)?.[1] || "").trim();
}

function replaceBacklogStatusLine(content: string, status: string) {
  const line = `- 状态: ${status}`;
  if (/^\s*-\s*状态\s*:/mi.test(content)) {
    return content.replace(/^\s*-\s*状态\s*:[^\n\r]*/mi, line);
  }
  return `${line}\n${content}`;
}

function extractDailyDevBacklogPayload(file: any) {
  const content = String(file?.content || "");
  const title = String(content.match(/^#\s+(.+)$/m)?.[1] || file?.name || "业务开发需求").trim();
  const businessGoal = extractMarkdownSection(content, "业务目标") || title;
  const acceptance = extractMarkdownSection(content, "验收标准");
  const documents = [
    `群聊需求池文件：${file.name}`,
    content,
  ].filter(Boolean).join("\n\n");
  return {
    title,
    business_goal: businessGoal,
    scope: extractMarkdownSection(content, "开发范围"),
    documents,
    acceptance,
    constraints: extractMarkdownSection(content, "约束/注意事项"),
    priority: readDailyDevBacklogPriority(file),
    requires_code_changes: !/代码变更\s*:\s*允许无代码变更/i.test(content),
    backlog_file: file.name,
  };
}

function isImportableDailyDevSourceFile(file: any, options: any = {}) {
  if (!file || file.readable === false || isDailyDevBacklogFile(file)) return false;
  if (!options.force && file.daily_dev_imported_backlog) return false;
  const content = String(file.content || "").trim();
  if (content.length < 20) return false;
  const name = String(file.name || "");
  return /\.(md|markdown|txt|prd|json|yaml|yml)$/i.test(name) || file.type === "text" || file.type === "markdown";
}

function firstUsefulParagraph(content: string, max = 600) {
  const cleaned = String(content || "")
    .split(/\n{2,}/)
    .map(part => part.replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s*/gm, "").trim())
    .find(Boolean) || "";
  return compactFormText(cleaned.slice(0, max), "");
}

function buildDailyDevPayloadFromSharedFile(file: any, group: any, options: any = {}) {
  const content = String(file.content || "").trim();
  const heading = String(content.match(/^#\s+(.+)$/m)?.[1] || "").trim();
  const title = compactFormText(options.title || heading || file.name, "共享文档业务需求").replace(/\.(md|markdown|txt|prd|json|yaml|yml)$/i, "");
  const goal = extractMarkdownSection(content, "业务目标")
    || extractMarkdownSection(content, "目标")
    || firstUsefulParagraph(content, 500)
    || title;
  return {
    title,
    business_goal: goal,
    scope: extractMarkdownSection(content, "开发范围") || extractMarkdownSection(content, "范围") || "由主 Agent 根据源共享文档判断涉及项目和改动范围。",
    documents: [`源共享文档：${file.name}`, `所属开发群聊：${group?.name || group?.id || "未命名群聊"}`, content].join("\n\n"),
    acceptance: extractMarkdownSection(content, "验收标准")
      || extractMarkdownSection(content, "验收")
      || "主 Agent 最终报告必须说明完成内容、涉及文件、验证结果、风险和仍需补充事项。",
    constraints: extractMarkdownSection(content, "约束/注意事项") || extractMarkdownSection(content, "约束") || "",
    priority: options.priority || readDailyDevBacklogPriority(file) || "normal",
    requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
  };
}

export function importSharedDocsToDailyDevBacklog(options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const groups = loadGroups();
  const imported: any[] = [];
  const skipped: any[] = [];

  for (const group of groups.filter((item: any) => !groupId || item.id === groupId)) {
    const files = Array.isArray(group.shared_files) ? group.shared_files : [];
    for (const file of files) {
      if (imported.length >= limit) break;
      if (!isImportableDailyDevSourceFile(file, options)) {
        if (file && !isDailyDevBacklogFile(file)) skipped.push({ group_id: group.id, name: file.name, reason: file.daily_dev_imported_backlog ? "已导入" : "不可导入" });
        continue;
      }
      const payload = buildDailyDevPayloadFromSharedFile(file, group, options);
      const backlog = persistDailyDevBacklogFile(groups, group, payload, payload.title, payload.business_goal);
      if (!backlog) {
        skipped.push({ group_id: group.id, name: file.name, reason: "未启用需求池写入" });
        continue;
      }
      const now = new Date().toISOString();
      file.daily_dev_imported_backlog = backlog.name;
      file.daily_dev_imported_at = now;
      file.daily_dev_import_status = "imported";
      file.updated_at = now;
      imported.push({ group_id: group.id, group_name: group.name || group.id, source: file.name, backlog: backlog.name, title: payload.title });
    }
  }

  saveGroups(groups);
  return {
    success: true,
    imported: imported.length,
    skipped: skipped.length,
    items: imported,
    skipped_items: skipped.slice(0, 20),
    counts: listDailyDevBacklogs(groupId).reduce((acc: any, item: any) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function claimReadyDailyDevBacklog(groupId: string, claim: any = {}) {
  const groups = loadGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;
  const files = Array.isArray(group.shared_files) ? group.shared_files : [];
  const candidates = files
    .map((file: any, index: number) => ({ file, index }))
    .filter(({ file }: any) => file?.readable !== false && isDailyDevBacklogFile(file) && readDailyDevBacklogStatus(file) === "ready")
    .sort((a: any, b: any) => {
      const pa = PRIORITY_WEIGHT[readDailyDevBacklogPriority(a.file)] || 2;
      const pb = PRIORITY_WEIGHT[readDailyDevBacklogPriority(b.file)] || 2;
      if (pa !== pb) return pb - pa;
      return Date.parse(a.file.created_at || a.file.updated_at || "") - Date.parse(b.file.created_at || b.file.updated_at || "");
    });
  const selected = candidates[0];
  if (!selected) return null;

  const file = files[selected.index];
  const now = new Date().toISOString();
  file.status = "planned";
  file.claimed_at = now;
  file.claimed_by = claim.source || "daily_dev_cron";
  file.claimed_by_cron_job_id = claim.cron_job_id || null;
  file.updated_at = now;
  appendDailyDevBacklogHistory(file, "planned", "定时任务已认领，准备创建主 Agent 任务", claim.source || "daily_dev_cron");
  file.content = replaceBacklogStatusLine(String(file.content || ""), "planned");
  saveGroups(groups);
  return extractDailyDevBacklogPayload(file);
}

export function markDailyDevBacklogStatus(groupId: string, fileName: string, status: string, meta: any = {}) {
  if (!groupId || !fileName) return null;
  const groups = loadGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group || !Array.isArray(group.shared_files)) return null;
  const file = group.shared_files.find((item: any) => item?.name === fileName);
  if (!file) return null;
  const now = new Date().toISOString();
  const nextState = normalizeDailyDevBacklogState(status);
  file.status = nextState;
  file.updated_at = now;
  if (meta.task_id) file.task_id = meta.task_id;
  if (meta.result) file.last_result = String(meta.result).slice(0, 800);
  if (nextState === "done") file.completed_at = now;
  if (nextState === "blocked" || nextState === "failed" || nextState === "needs_user") file.blocked_at = now;
  appendDailyDevBacklogHistory(file, nextState, meta.result || meta.reason || `状态变更为 ${nextState}`, meta.actor || "system");
  file.content = replaceBacklogStatusLine(String(file.content || ""), nextState);
  saveGroups(groups);
  return file;
}

export function listDailyDevBacklogs(groupId = "") {
  const groups = loadGroups();
  return groups
    .filter((group: any) => !groupId || group.id === groupId)
    .flatMap((group: any) => {
      const files = Array.isArray(group.shared_files) ? group.shared_files : [];
      return files
        .filter((file: any) => isDailyDevBacklogFile(file))
        .map((file: any) => {
          const content = String(file.content || "");
          const title = String(content.match(/^#\s+(.+)$/m)?.[1] || file.name || "业务开发需求").trim();
          const stateCard = buildDailyDevBacklogStateCard(file, group);
          return {
            group_id: group.id,
            group_name: group.name || group.id,
            name: file.name,
            title,
            status: stateCard.state,
            raw_status: stateCard.raw_status,
            state: stateCard.state,
            state_label: dailyDevBacklogStateLabel(stateCard.state),
            owner: stateCard.owner,
            next_action: stateCard.next_action,
            blocker: stateCard.blocker,
            question_to_user: stateCard.question_to_user,
            quality: stateCard.quality,
            evidence: stateCard.evidence,
            state_history: stateCard.history,
            priority: readDailyDevBacklogPriority(file),
            task_id: file.task_id || null,
            claimed_by_cron_job_id: file.claimed_by_cron_job_id || null,
            created_at: file.created_at || "",
            updated_at: file.updated_at || "",
            claimed_at: file.claimed_at || "",
            completed_at: file.completed_at || "",
            blocked_at: file.blocked_at || "",
            last_result: file.last_result || "",
            business_goal: extractMarkdownSection(content, "业务目标") || title,
          };
        });
    })
    .sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { needs_user: 0, ready: 1, planned: 2, dispatched: 3, running: 4, reviewing: 5, blocked: 6, failed: 7, done: 8, draft: 9, queued: 3, in_progress: 4 };
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      const pa = PRIORITY_WEIGHT[a.priority] || 2;
      const pb = PRIORITY_WEIGHT[b.priority] || 2;
      if (pa !== pb) return pb - pa;
      return Date.parse(a.created_at || a.updated_at || "") - Date.parse(b.created_at || b.updated_at || "");
    });
}

function dailyDevGroupCanDispatch(groupId: string) {
  try {
    const group = loadGroups().find(g => g.id === groupId);
    if (!group) return false;
    dep("validateDailyDevGroupReady")(group);
    return true;
  } catch {
    return false;
  }
}

export function dispatchDailyDevBacklog(groupId: string, fileName: string, ctx: any, options: any = {}) {
  const groups = loadGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group || !Array.isArray(group.shared_files)) {
    return { success: false, status: 404, error: "开发群聊或需求池不存在" };
  }
  let groupReadiness: any = null;
  try {
    groupReadiness = dep("validateDailyDevGroupReady")(group);
  } catch (e: any) {
    return { success: false, status: 409, error: e.message };
  }
  const file = group.shared_files.find((item: any) => item?.name === fileName);
  if (!file || !isDailyDevBacklogFile(file)) {
    return { success: false, status: 404, error: "需求池文件不存在" };
  }
  const currentStatus = readDailyDevBacklogStatus(file);
  if (currentStatus === "done") {
    return { success: false, status: 409, error: "已完成需求不能重新派发，请先恢复为 ready" };
  }
  if (["queued", "planned", "dispatched", "in_progress", "running", "reviewing"].includes(currentStatus) && file.task_id && !options.force) {
    return { success: false, status: 409, error: "需求已经关联执行任务，如需重派请先恢复为 ready" };
  }

  const payload = extractDailyDevBacklogPayload(file);
  const now = new Date().toISOString();
  file.status = "planned";
  file.claimed_at = now;
  file.claimed_by = options.source || "manual_backlog_dispatch";
  file.updated_at = now;
  appendDailyDevBacklogHistory(file, "planned", "需求已被认领，正在创建主 Agent 任务", options.source || "manual_backlog_dispatch");
  file.content = replaceBacklogStatusLine(String(file.content || ""), "planned");
  saveGroups(groups);

  try {
    const taskPayload = { ...payload, documents: payload.documents, source_documents: payload.documents };
    const task = dep("createTask")({
      title: payload.title,
      description: buildDailyDevTaskDescription(taskPayload),
      target_project: groupReadiness.coordinator.project,
      group_id: groupId,
      assign_type: "group",
      priority: payload.priority || "normal",
      auto_execute: options.auto_execute !== false && options.autoExecute !== false,
      workflow_type: "daily_dev",
      requires_code_changes: payload.requires_code_changes !== false,
      requires_verification: true,
      business_goal: payload.business_goal,
      acceptance_criteria: payload.acceptance || "",
      source_documents: payload.documents,
      workflow_meta: {
        ...(options.workflow_meta || options.workflowMeta || {}),
        intake: {
          backlog_file: payload.backlog_file,
          source: "manual-backlog-dispatch",
          dispatched_at: now,
        },
      },
    });
    file.task_id = task.id;
    file.status = "dispatched";
    file.last_result = "已由用户从需求池立即派发给主 Agent";
    file.updated_at = new Date().toISOString();
    appendDailyDevBacklogHistory(file, "dispatched", "已创建主 Agent 任务并交给队列", options.source || "manual_backlog_dispatch");
    file.content = replaceBacklogStatusLine(String(file.content || ""), "dispatched");
    saveGroups(groups);

    let queueResult = null;
    if (task.auto_execute) {
      queueResult = dep("enqueueTask")(task.id, ctx);
      if (queueResult?.blocked) {
        markDailyDevBacklogStatus(groupId, fileName, "dispatched", {
          task_id: task.id,
          result: queueResult.message || "任务已创建，等待执行通道恢复",
        });
      }
    }
    return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: dep("getQueueStatus")() };
  } catch (e: any) {
    markDailyDevBacklogStatus(groupId, fileName, "ready", {
      result: `立即派发失败，已恢复为 ready：${e.message}`,
    });
    return { success: false, status: 400, error: e.message };
  }
}

export function dispatchReadyDailyDevBacklogs(ctx: any, options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const candidates = listDailyDevBacklogs(groupId)
    .filter((item: any) => item.status === "ready")
    .filter((item: any) => !options.only_executable_groups || dailyDevGroupCanDispatch(item.group_id))
    .slice(0, limit);

  const results = candidates.map((item: any) => {
    const result = dispatchDailyDevBacklog(item.group_id, item.name, ctx, {
      auto_execute: autoExecute,
      source: "bulk-backlog-dispatch",
      workflow_meta: {
        bulk_dispatch: {
          source: "daily-dev-backlog-bulk",
          requested_at: new Date().toISOString(),
        },
      },
    });
    return {
      group_id: item.group_id,
      group_name: item.group_name,
      name: item.name,
      title: item.title,
      priority: item.priority,
      ...result,
    };
  });

  return {
    success: true,
    total_candidates: candidates.length,
    dispatched: results.filter((item: any) => item.success).length,
    queued: results.filter((item: any) => item.queued).length,
    failed: results.filter((item: any) => !item.success).length,
    auto_execute: autoExecute,
    limit,
    results,
    items: listDailyDevBacklogs(groupId),
    queue_status: dep("getQueueStatus")(),
  };
}

export function runDailyDevAutopilotOnce(ctx: any, options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const gapContinueLimit = Math.max(1, Math.min(50, Number(options.gap_continue_limit || options.gapContinueLimit || 5)));
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const dailyDevExecutionReadiness = dep("getAgentExecutionReadiness")();
  const canAutoExecuteDailyDev = !autoExecute || dailyDevExecutionReadiness.ready === true;
  const gapContinueResult = !canAutoExecuteDailyDev
    ? { success: true, skipped: true, skip_reason: dailyDevExecutionReadiness.message, total_candidates: 0, continued: 0, queued: 0, blocked: 0, failed: 0, results: [] }
    : options.continue_gaps === false || options.continueGaps === false
    ? { success: true, total_candidates: 0, continued: 0, queued: 0, blocked: 0, failed: 0, results: [] }
    : dep("continueDailyDevTasksFromGaps")(ctx, {
      group_id: groupId,
      limit: gapContinueLimit,
      auto_execute: autoExecute,
      max_per_task: options.max_gap_continue_per_task || options.maxGapContinuePerTask || 3,
    });
  const shouldImport = options.import_shared_docs !== false && options.importSharedDocs !== false;
  const importResult = shouldImport
    ? importSharedDocsToDailyDevBacklog({
      group_id: groupId,
      limit,
      force: !!options.force_import || !!options.forceImport,
      priority: options.priority || "normal",
      requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
    })
    : { success: true, imported: 0, skipped: 0, items: [], skipped_items: [], counts: {} };
  const dispatchResult = canAutoExecuteDailyDev
    ? dispatchReadyDailyDevBacklogs(ctx, {
      group_id: groupId,
      limit,
      auto_execute: autoExecute,
      only_executable_groups: options.only_executable_groups !== false && options.onlyExecutableGroups !== false,
    })
    : { success: true, skipped: true, skip_reason: dailyDevExecutionReadiness.message, dispatched: 0, queued: 0, failed: 0, results: [], items: listDailyDevBacklogs(groupId), queue_status: dep("getQueueStatus")() };
  const diagnostics = dep("buildDailyDevAgentDiagnostics")();
  const blockedItems = [
    ...(gapContinueResult.results || []).filter((item: any) => item.queue_result?.blocked),
    ...(dispatchResult.results || []).filter((item: any) => item.queue_result?.blocked),
  ];
  const failedItems = [
    ...(gapContinueResult.results || []).filter((item: any) => !item.success),
    ...(dispatchResult.results || []).filter((item: any) => !item.success),
  ];
  const readyBacklogCount = listDailyDevBacklogs(groupId).filter((item: any) => item.status === "ready").length;
  const continuationGapCount = loadTasks().filter((task: any) => (!groupId || task.group_id === groupId) && dep("hasDailyDevContinuationGaps")(task)).length;
  const hasPendingDailyDevWork = readyBacklogCount > 0 || importResult.imported > 0 || continuationGapCount > 0;
  const outcomeStatus = (!canAutoExecuteDailyDev && autoExecute && hasPendingDailyDevWork) || blockedItems.length > 0
    ? "waiting_execution"
    : failedItems.length > 0
      ? "partial_failure"
      : gapContinueResult.queued > 0
        ? "continued"
        : dispatchResult.queued > 0
          ? "queued"
          : dispatchResult.dispatched > 0
            ? "created"
            : (importResult.imported > 0 ? "imported" : "idle");
  const blockedMessage = blockedItems[0]?.queue_result?.message || (!canAutoExecuteDailyDev ? dailyDevExecutionReadiness.message : "");
  const nextActions = outcomeStatus === "waiting_execution"
    ? ["先点击“复检执行通道”并让 Agent CLI 真实探针通过，系统会再派发或恢复 daily_dev 任务", blockedMessage].filter(Boolean)
    : outcomeStatus === "idle"
      ? ["上传业务文档到开发群聊，或在任务派发页创建业务开发任务"]
      : diagnostics.autopilot?.next_actions || [];
  return {
    success: true,
    outcome: {
      status: outcomeStatus,
      message: outcomeStatus === "waiting_execution"
        ? (!canAutoExecuteDailyDev
          ? `已有 ${readyBacklogCount} 个 ready 需求、${continuationGapCount} 个续跑缺口等待执行准入；请先复检 Agent CLI`
          : `已有 ${gapContinueResult.continued || 0} 个续跑任务、${dispatchResult.dispatched || 0} 个新任务等待执行，但执行通道阻塞`)
        : outcomeStatus === "continued"
          ? `已按交付缺口续跑 ${gapContinueResult.continued || 0} 个任务，入队 ${gapContinueResult.queued || 0} 个`
        : outcomeStatus === "queued"
          ? `已派发 ${dispatchResult.dispatched || 0} 条需求，入队 ${dispatchResult.queued || 0} 条`
          : outcomeStatus === "created"
            ? `已创建 ${dispatchResult.dispatched || 0} 个任务，等待队列处理`
            : outcomeStatus === "imported"
              ? `已导入 ${importResult.imported || 0} 份共享文档，等待下一轮派发`
              : "没有新的共享文档或 ready 需求",
      blocked: outcomeStatus === "waiting_execution",
      next_actions: nextActions.slice(0, 4),
    },
    continued: gapContinueResult.continued || 0,
    gap_queued: gapContinueResult.queued || 0,
    imported: importResult.imported || 0,
    import_skipped: importResult.skipped || 0,
    dispatched: dispatchResult.dispatched || 0,
    queued: dispatchResult.queued || 0,
    failed: (gapContinueResult.failed || 0) + (dispatchResult.failed || 0),
    gap_continue_result: gapContinueResult,
    import_result: importResult,
    dispatch_result: dispatchResult,
    autopilot: diagnostics.autopilot,
    execution_readiness: dailyDevExecutionReadiness,
    can_auto_execute_daily_dev: canAutoExecuteDailyDev,
    ready_backlog_count: readyBacklogCount,
    continuation_gap_count: continuationGapCount,
    has_pending_daily_dev_work: hasPendingDailyDevWork,
    queue_status: dep("getQueueStatus")(),
  };
}

const DEFAULT_DAILY_DEV_CRON_PROMPT = [
  "请按日常开发主 Agent 工作流执行：",
  "1. 优先续跑已有 daily_dev 任务的交付缺口，再检查群聊共享文档和 ready backlog。",
  "2. 先理解业务目标、接口/字段、影响范围和验收标准，再拆给对应项目子 Agent 开发。",
  "3. 子 Agent 必须修改代码后返回 CCM_AGENT_RECEIPT，说明动作、文件、验证和阻塞点。",
  "4. 主 Agent 必须等待回执并复盘；发现缺口时继续返工或说明需要用户补充的信息。",
  "5. 最终报告要包含完成内容、涉及项目/文件、验证结果、风险和下一步。"
].join("\n");

function isDailyDevCronJobForGroup(job: any, groupId: string) {
  return (job?.target_type === "group" || job?.group_id)
    && job?.group_id === groupId
    && (job?.workflow_type === "daily_dev" || job?.workflowType === "daily_dev" || job?.daily_dev || job?.dailyDev);
}

export function ensureDailyDevAutopilotCronJobs(options: any = {}) {
  const groups = loadGroups();
  const configs = getConfigs();
  const jobs = loadCronJobs();
  const now = new Date().toISOString();
  const schedule = String(options.schedule || "*/30 * * * *").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || groups.length || 1)));
  const backlogBatchLimit = Math.max(1, Math.min(20, Number(options.backlog_batch_limit || options.backlogBatchLimit || 3)));
  const gapContinueLimit = Math.max(1, Math.min(20, Number(options.gap_continue_limit || options.gapContinueLimit || 3)));
  const enableExisting = options.enable_existing !== false && options.enableExisting !== false;
  const created: any[] = [];
  const existing: any[] = [];
  const enabled: any[] = [];
  const skipped: any[] = [];

  for (const group of groups) {
    if (created.length >= limit) break;
    const readiness = dep("getReadyDailyDevMembers")(group, configs);
    const groupName = readiness.normalizedGroup?.name || readiness.normalizedGroup?.id || group.id;
    if (!readiness.normalizedGroup || readiness.normalizedGroup.orchestrator?.enabled === false || readiness.readyMembers.length === 0) {
      skipped.push({
        group_id: group.id,
        group_name: groupName,
        reason: readiness.readyMembers.length === 0 ? "没有可写工作目录的子 Agent" : "群聊主 Agent 未启用",
      });
      continue;
    }
    const found = jobs.find((job: any) => isDailyDevCronJobForGroup(job, readiness.normalizedGroup.id));
    if (found) {
      if (found.enabled === false && enableExisting) {
        found.enabled = true;
        found.updated_at = now;
        found.next_run = found.next_run || null;
        enabled.push({ id: found.id, group_id: readiness.normalizedGroup.id, name: found.name });
      } else {
        existing.push({ id: found.id, group_id: readiness.normalizedGroup.id, name: found.name, enabled: found.enabled !== false });
      }
      continue;
    }
    const job = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: `日常业务开发 - ${groupName}`,
      target_type: "group",
      workflow_type: "daily_dev",
      requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
      project: "",
      group_id: readiness.normalizedGroup.id,
      schedule,
      prompt: String(options.prompt || DEFAULT_DAILY_DEV_CRON_PROMPT).trim(),
      priority: options.priority || "normal",
      backlog_batch_limit: backlogBatchLimit,
      import_shared_docs: options.import_shared_docs !== false && options.importSharedDocs !== false,
      continue_gaps: options.continue_gaps !== false && options.continueGaps !== false,
      gap_continue_limit: gapContinueLimit,
      enabled: true,
      created_at: now,
      updated_at: now,
      created_by: "daily_dev_autopilot_ensure",
      last_run: null,
      last_run_key: null,
      last_status: "never",
      last_result: "",
      last_task_id: null,
      run_count: 0,
      next_run: null,
    };
    jobs.push(job);
    created.push({
      id: job.id,
      name: job.name,
      group_id: job.group_id,
      group_name: groupName,
      schedule: job.schedule,
      ready_members: readiness.readyMembers.map((member: any) => member.project),
    });
  }

  if (created.length > 0 || enabled.length > 0) saveCronJobs(jobs);
  return {
    success: true,
    created: created.length,
    enabled: enabled.length,
    existing: existing.length,
    skipped: skipped.length,
    schedule,
    created_jobs: created,
    enabled_jobs: enabled,
    existing_jobs: existing,
    skipped_groups: skipped,
    jobs: loadCronJobs(),
  };
}

export function buildDailyDevTaskDescription(payload: any) {
  const requiresCodeChanges = payload.requires_code_changes !== false && payload.requiresCodeChanges !== false;
  const planMode = payload.plan_mode || payload.planMode || null;
  const planLines = planMode ? [
    "",
    "执行前只读探索（Plan Mode）：",
    compactFormText(planMode.read_only_exploration?.summary || "已进入只读探索，执行前不得修改文件。"),
    "",
    "影响范围预判：",
    [
      Array.isArray(planMode.impact_scope?.projects) && planMode.impact_scope.projects.length ? `项目：${planMode.impact_scope.projects.join("、")}` : "",
      Array.isArray(planMode.impact_scope?.areas) && planMode.impact_scope.areas.length ? `区域：${planMode.impact_scope.areas.join("、")}` : "",
      planMode.impact_scope?.multi_agent ? "需要多 Agent 协作或至少由主 Agent 统一验收。" : "可由主 Agent 判断是否需要派发子 Agent。",
    ].filter(Boolean).join("\n") || "由主 Agent 只读探索后继续收敛。",
    "",
    "风险与权限边界：",
    [
      planMode.risk?.summary ? `风险：${planMode.risk.summary}` : "",
      ...(Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries.map((item: any) => `- ${item}`) : []),
    ].filter(Boolean).join("\n") || "无额外权限边界。",
    "",
    "子 Agent 工作单要求：",
    (Array.isArray(planMode.sub_agent_work_order_requirements) ? planMode.sub_agent_work_order_requirements : []).map((item: any) => `- ${item}`).join("\n") || "- 工作单必须自包含目标、背景、边界、验收标准和回执格式。",
    "",
    "会话续跑策略：",
    planMode.session_strategy?.native_resume_first
      ? "优先复用 native session；任务完成并通过主 Agent 最终验收前，不得销毁任务级会话。native 不可用时使用 scratchpad 注入上轮回执、未完成 Todo 和验收缺口继续。"
      : "任务完成并通过主 Agent 最终验收前，必须保留可恢复上下文。",
  ] : [];
  const lines = [
    "业务目标：",
    compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description),
    "",
    "开发范围：",
    compactFormText(payload.scope || payload.development_scope || payload.developmentScope),
    "",
    "业务/接口文档：",
    compactFormText(payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments),
    "",
    "验收标准：",
    compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria),
    "",
    "约束/注意事项：",
    compactFormText(payload.constraints || payload.notes, "无"),
    "",
    "代码变更要求：",
    requiresCodeChanges
      ? "必须产生实际代码/配置/文档文件变更；系统会用执行前后的工作区差异作为完成门禁。"
      : "本任务允许不产生代码变更，但仍必须说明调研、验证或方案产出。",
    "",
    "验证证据要求：",
    "必须至少提供一条可采信的已执行验证记录，例如实际运行的构建、类型检查、测试、lint、接口自测或人工核验结果；只写建议运行、未运行或失败验证不能完成。",
    "",
    "主 Agent 执行要求：",
    "- 先理解业务目标和文档，再判断需要哪些子 Agent 参与。",
    "- 把任务拆成可执行工作单，派给对应项目子 Agent 编写或修改代码。",
    "- 子 Agent 必须返回 CCM_AGENT_RECEIPT，说明修改文件、执行动作、验证方式和阻塞点。",
    requiresCodeChanges
      ? "- 这是开发交付任务；如果没有实际文件变更，不允许把任务判定为完成。"
      : "- 如无需改代码，必须在最终报告中说明原因和可验收产出。",
    "- 主 Agent 必须等待子 Agent 结果说明并复盘；发现缺口时继续追问或返工，不能提前宣布完成。",
    "- 最终报告要说明完成内容、涉及项目/文件、已执行验证、风险和仍需用户确认的事项。",
    ...planLines,
  ];
  return lines.join("\n");
}

export function evaluateDailyDevIntakeQuality(payload: any, goal: string) {
  const textLen = (value: any) => String(value || "").replace(/\s+/g, " ").trim().length;
  const scope = payload.scope || payload.development_scope || payload.developmentScope;
  const documents = payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments;
  const acceptance = payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria;
  const checks = [
    { key: "business_goal", ok: textLen(goal) >= 8, label: "业务目标至少说明要解决什么问题" },
    { key: "scope", ok: textLen(scope) >= 8, label: "开发范围需要说明涉及页面、接口、模块或权限等边界" },
    { key: "documents", ok: textLen(documents) >= 12, label: "业务/接口文档需要包含字段、规则、链接或共享文件说明" },
    { key: "acceptance", ok: textLen(acceptance) >= 8, label: "验收标准需要说明主 Agent 最终必须证明什么" },
  ];
  const passed = checks.filter(item => item.ok).map(item => item.key);
  const missing = checks.filter(item => !item.ok).map(item => item.label);
  const pass = checks[0].ok && checks[3].ok && (checks[1].ok || checks[2].ok);
  return {
    pass,
    score: passed.length,
    total: checks.length,
    passed,
    missing,
    message: pass
      ? "业务需求信息足够创建日常开发任务"
      : "业务需求信息不足，主 Agent 可能无法稳定拆分给子 Agent",
  };
}
