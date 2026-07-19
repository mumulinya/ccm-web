import * as fs from "fs";
import * as path from "path";
import { sendJson, CCM_DIR, SESSIONS_DIR } from "../../core/utils";
import { resolveContainedPath, validateProjectName, validateSessionId } from "./project-validation";
import { getConfigs } from "../../core/db";
import {
  generateSessionTitleWithModel,
  isMeaningfulSessionTitleInput,
  isSessionTitlePlaceholder,
} from "../../system/session-title";
import { purgeProjectChatRunsForSession } from "../../projects/chat-runs";
import { compactProjectSessionWithModel, scheduleProjectSessionMemoryExtraction } from "./project-session-compaction";
import {
  getProjectSessionAgentBinding,
  purgeProjectSessionAgentBinding,
  rotateProjectSessionAgentBinding,
} from "./project-session-agent-binding";

export const WEB_SESSIONS_DIR = path.join(CCM_DIR, "web-sessions");

export function getProjectSessionDir(projectName: string): string {
  return resolveContainedPath(WEB_SESSIONS_DIR, validateProjectName(projectName));
}

function getSessionFilePath(projectName: string, sessionId: string) {
  return resolveContainedPath(getProjectSessionDir(projectName), `${validateSessionId(sessionId)}.json`);
}

function requireActiveProject(projectName: string) {
  const project = validateProjectName(projectName);
  const config = getConfigs().find((item) => item.name === project);
  if (!config) throw new Error("项目不存在或已经归档");
  return { project, config };
}

function ensureWebSessionDir(projectName: string) {
  const dir = getProjectSessionDir(projectName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 查找 cc-connect 的 session 文件（带 hash 的）
export function findCcSessionFile(projectName: string) {
  const safeProjectName = validateProjectName(projectName);
  if (!fs.existsSync(SESSIONS_DIR)) return null;
  const escaped = safeProjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`^${escaped}(?:_[^/\\\\]+)?\\.json$`);
  const files = fs.readdirSync(SESSIONS_DIR).filter(f =>
    matcher.test(f) && !fs.statSync(resolveContainedPath(SESSIONS_DIR, f)).isDirectory()
  );
  const hashed = files.find(f => f !== `${safeProjectName}.json`);
  return hashed ? resolveContainedPath(SESSIONS_DIR, hashed) : files[0] ? resolveContainedPath(SESSIONS_DIR, files[0]) : null;
}

// 从 cc-connect 单文件同步到文件夹格式
export function syncFromCcToFilesystem(projectName: string) {
  const ccFile = findCcSessionFile(projectName);
  if (!ccFile || !fs.existsSync(ccFile)) return;
  try {
    const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
    const dir = ensureWebSessionDir(projectName);
    for (const [sid, session] of Object.entries(data.sessions || {})) {
      const sessionData = session as any;
      const filePath = getSessionFilePath(projectName, validateSessionId(sid));
      // 只更新有变化的
      if (!fs.existsSync(filePath) || JSON.parse(fs.readFileSync(filePath, "utf-8")).updated_at !== sessionData.updated_at) {
        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
      }
    }
    // 删除文件夹中已不存在的会话
    const ccSids = new Set(Object.keys(data.sessions || {}));
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
      const fid = f.replace(".json", "");
      if (!ccSids.has(fid)) fs.unlinkSync(resolveContainedPath(dir, f));
    }
  } catch {}
}

// 从文件夹格式同步回 cc-connect 单文件
export function syncToFilesystemToCc(projectName: string) {
  const ccFile = findCcSessionFile(projectName);
  if (!ccFile) return;
  try {
    const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
    const dir = getProjectSessionDir(projectName);
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
      const sid = f.replace(".json", "");
      const sessionData = JSON.parse(fs.readFileSync(resolveContainedPath(dir, f), "utf-8"));
      ccData.sessions[sid] = sessionData;
    }
    // 更新 counter
    const maxNum = Math.max(0, ...Object.keys(ccData.sessions).map(s => parseInt(s.replace("s", "")) || 0));
    ccData.counter = maxNum + 1;
    fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
  } catch {}
}

// 双向同步
export function syncSessions(projectName: string) {
  syncFromCcToFilesystem(projectName);
}

// 获取会话列表（从文件夹读取）
export function getSessions(projectName: string) {
  syncSessions(projectName);
  const dir = getProjectSessionDir(projectName);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(resolveContainedPath(dir, f), "utf-8"));
        return {
          id: data.id || f.replace(".json", ""),
          name: data.name || data.id || f.replace(".json", ""),
          agent_type: data.agent_type || "claudecode",
          message_count: (data.history || []).length,
          last_message: (data.history || []).slice(-1)[0]?.content?.substring(0, 100) || "",
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
}

// 获取会话详情
export function getSessionDetail(projectName: string, sessionId: string) {
  const filePath = getSessionFilePath(projectName, sessionId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return { ...data, agent_binding: getProjectSessionAgentBinding(projectName, sessionId) };
    } catch {}
  }
  // fallback: 从 cc-connect 文件读取
  const ccFile = findCcSessionFile(projectName);
  if (ccFile) {
    try {
      const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
      const session = data.sessions[sessionId] || null;
      return session ? { ...session, agent_binding: getProjectSessionAgentBinding(projectName, sessionId) } : null;
    } catch {}
  }
  return null;
}

function normalizeWebSessionMessage(message: any) {
  const input = message && typeof message === "object" ? message : {};
  const safe: any = {
    id: String(input.id || input.message_id || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`),
    role: input.role,
    content: String(input.content || ""),
    agent: input.agent || null,
    timestamp: input.timestamp || new Date().toISOString(),
  };
  for (const key of [
    "requestText",
    "task_id",
    "run_id",
    "taskExperience",
    "fileChanges",
    "workEvents",
    "projectRun",
    "agenticRun",
    "managementReceipt",
    "provider_usage",
    "type",
  ]) {
    if (Object.prototype.hasOwnProperty.call(input, key)) safe[key] = input[key];
  }
  return safe;
}

function messageMatchesDeleteSelector(message: any, selector: any, index: number) {
  if (!message || !selector) return false;
  const id = String(selector.id || selector.message_id || "").trim();
  const taskId = String(selector.task_id || selector.taskId || "").trim();
  const timestamp = String(selector.timestamp || "").trim();
  if (id && String(message.id || message.message_id || "") === id) return true;
  if (taskId && String(message.task_id || message.taskExperience?.task_id || message.run_id || "") === taskId) return true;
  if (timestamp && String(message.timestamp || "") === timestamp) return true;
  if (Number.isInteger(selector.index) && selector.index === index) return true;
  return false;
}

function getNextSessionId(projectName: string) {
  const dir = getProjectSessionDir(projectName);
  const nums: number[] = [];
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).filter(f => f.endsWith(".json")).forEach(f => nums.push(parseInt(f.replace("s","").replace(".json","")) || 0));
  }
  const ccFile = findCcSessionFile(projectName);
  if (ccFile) {
    try {
      const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
      Object.keys(data.sessions || {}).forEach(s => nums.push(parseInt(s.replace("s","")) || 0));
    } catch {}
  }
  return `s${nums.length > 0 ? Math.max(...nums) + 1 : 1}`;
}

const projectSessionTitleJobs = new Map<string, Promise<any>>();

export function scheduleProjectSessionAutoTitle(project: string, sessionId: string, options: { modelCall?: (request: any) => Promise<any> } = {}) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(sessionId);
  const key = `${safeProject}::${safeSessionId}`;
  const existingJob = projectSessionTitleJobs.get(key);
  if (existingJob) return existingJob;
  const job = (async () => {
    const filePath = getSessionFilePath(safeProject, safeSessionId);
    if (!fs.existsSync(filePath)) return { renamed: false, reason: "session_missing" };
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!isSessionTitlePlaceholder(data.name, data.title_origin || data.titleOrigin)) return { renamed: false, reason: "title_already_set", name: data.name };
    const history = Array.isArray(data.history) ? data.history : [];
    const userIndex = history.findIndex((message: any) => message?.role === "user"
      && (isMeaningfulSessionTitleInput(message?.content) || (message?.files || message?.attachments || []).length));
    if (userIndex < 0) return { renamed: false, reason: "meaningful_user_message_missing", name: data.name };
    const userMessage = history[userIndex];
    const assistantMessage = history.slice(userIndex + 1).find((message: any) => message?.role === "assistant" && String(message?.content || "").trim());
    if (!assistantMessage) return { renamed: false, reason: "assistant_reply_missing", name: data.name };
    const files = userMessage.files || userMessage.attachments || [];
    const generated = await generateSessionTitleWithModel({
      scope: "project",
      userMessage: String(userMessage.content || ""),
      assistantMessage: String(assistantMessage.content || ""),
      attachmentNames: files.map((file: any) => String(file?.name || file?.filename || "")).filter(Boolean),
    }, options);
    if (!generated.title) return { renamed: false, reason: "title_input_skipped", name: data.name, generated };
    const latest = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!isSessionTitlePlaceholder(latest.name, latest.title_origin || latest.titleOrigin)) return { renamed: false, reason: "title_changed_during_generation", name: latest.name };
    latest.name = generated.title;
    latest.title_origin = generated.source === "model" ? "model" : "fallback";
    latest.title_generated_at = new Date().toISOString();
    latest.updated_at = latest.title_generated_at;
    fs.writeFileSync(filePath, JSON.stringify(latest, null, 2));
    syncToFilesystemToCc(safeProject);
    return { renamed: true, name: latest.name, generated };
  })().finally(() => projectSessionTitleJobs.delete(key));
  projectSessionTitleJobs.set(key, job);
  return job;
}

// === Sessions API 路由分流 ===
export function handleSessionsApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/sessions/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, name } = JSON.parse(body);
        const safeProject = requireActiveProject(project).project;
        const dir = ensureWebSessionDir(safeProject);
        const sid = getNextSessionId(safeProject);
        const now = new Date();
        const sessionName = String(name || "新会话").trim() || "新会话";
        const sessionData = { id: sid, name: sessionName, title_origin: isSessionTitlePlaceholder(sessionName) ? "placeholder" : "manual", agent_type: "claudecode", history: [], created_at: now.toISOString(), updated_at: now.toISOString() };
        fs.writeFileSync(getSessionFilePath(safeProject, sid), JSON.stringify(sessionData, null, 2));
        syncToFilesystemToCc(safeProject);
        sendJson(res, { success: true, sessionId: sid, name: sessionName });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId, message } = JSON.parse(body);
        if (!project || !sessionId || !message) return sendJson(res, { error: "缺少参数" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!data.history) data.history = [];
        const normalizedMessage = normalizeWebSessionMessage(message);
        data.history.push(normalizedMessage);
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        if (normalizedMessage.role === "assistant") {
          scheduleProjectSessionMemoryExtraction(project, sessionId);
          void scheduleProjectSessionAutoTitle(project, sessionId).catch((error: any) => {
            console.warn(`[项目会话] 自动命名失败 (${project}/${sessionId})：${error?.message || error}`);
          });
        }
        sendJson(res, { success: true, count: data.history.length, name: data.name });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/message/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { project, sessionId } = payload;
        if (!project || !sessionId) return sendJson(res, { error: "缺少参数" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const before = Array.isArray(data.history) ? data.history.length : 0;
        data.history = (Array.isArray(data.history) ? data.history : []).filter((message: any, index: number) => !messageMatchesDeleteSelector(message, payload, index));
        const deleted = before - data.history.length;
        const rotation = deleted > 0 ? rotateProjectSessionAgentBinding(project, sessionId, "项目会话消息删除，压缩边界失效") : null;
        if (deleted > 0) delete data.compaction;
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        sendJson(res, { success: true, deleted, count: data.history.length, binding_generation: rotation?.nextGeneration || 0 });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/messages/replace" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { project, sessionId } = payload;
        if (!project || !sessionId || !Array.isArray(payload.messages)) return sendJson(res, { error: "缺少参数" }, 400);
        if (payload.messages.length > 10000) return sendJson(res, { error: "单个会话消息数量不能超过 10000 条" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const before = Array.isArray(data.history) ? data.history.length : 0;
        data.history = payload.messages.map(normalizeWebSessionMessage);
        const rotation = rotateProjectSessionAgentBinding(project, sessionId, "项目会话消息替换，压缩边界失效");
        delete data.compaction;
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        sendJson(res, { success: true, replaced: before, count: data.history.length, binding_generation: rotation.nextGeneration });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId } = JSON.parse(body || "{}");
        if (!project || !sessionId) return sendJson(res, { error: "缺少参数" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const cleared = Array.isArray(data.history) ? data.history.length : 0;
        const rotation = rotateProjectSessionAgentBinding(project, sessionId, "用户清空项目会话");
        data.history = [];
        delete data.compaction;
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        sendJson(res, { success: true, cleared, binding_generation: rotation.nextGeneration, closed_agent_sessions: rotation.closed.length });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/sessions/compact" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const project = validateProjectName(payload.project);
        const sessionId = validateSessionId(payload.sessionId || payload.session_id);
        const result = await compactProjectSessionWithModel(project, sessionId, {
          force: true,
          reason: "manual_slash_compact",
          customInstructions: String(payload.customInstructions || payload.custom_instructions || "").trim(),
        });
        sendJson(res, { success: true, project, session_id: sessionId, mode: "model_required", ...result });
      } catch (e: any) { sendJson(res, { success: false, error: e?.message || "项目会话压缩失败" }, 400); }
    });
    return true;
  }

  if (pathname === "/api/sessions/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId } = JSON.parse(body);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const bindingCleanup = purgeProjectSessionAgentBinding(project, sessionId);
        const runCleanup = purgeProjectChatRunsForSession(project, sessionId);
        fs.unlinkSync(filePath);
        const ccFile = findCcSessionFile(project);
        if (ccFile) {
          try {
            const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            delete data.sessions[sessionId];
            for (const [k, v] of Object.entries(data.active_session || {})) {
              if (v === sessionId) delete data.active_session[k];
            }
            fs.writeFileSync(ccFile, JSON.stringify(data, null, 2));
          } catch {}
        }
        sendJson(res, { success: true, removed_agent_sessions: bindingCleanup.removed.length, removed_project_runs: runCleanup.removed.length });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/rename" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId, name } = JSON.parse(body);
        const safeName = String(name || "").trim();
        if (!safeName || safeName.length > 80) return sendJson(res, { error: "会话名称应为 1 到 80 个字符" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        data.name = safeName;
        data.title_origin = "manual";
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        const ccFile = findCcSessionFile(project);
        if (ccFile) {
          try {
            const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            if (ccData.sessions[sessionId]) {
              ccData.sessions[sessionId].name = safeName;
              ccData.sessions[sessionId].title_origin = "manual";
              ccData.sessions[sessionId].updated_at = data.updated_at;
              fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
            }
          } catch {}
        }
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/auto-name" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { project, sessionId } = JSON.parse(body);
        requireActiveProject(project);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const result = await scheduleProjectSessionAutoTitle(project, sessionId);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        sendJson(res, { success: true, name: data.name, title_source: data.title_origin || "", renamed: result.renamed === true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  return false;
}
