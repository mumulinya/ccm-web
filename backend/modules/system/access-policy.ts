import * as crypto from "crypto";
import * as path from "path";
import { CCM_DIR, sendJson } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

export type FeatureModule =
  | "workbench" | "resource_workspace" | "developer_tools" | "knowledge" | "memory"
  | "personal" | "terminal_ops" | "tool_ops" | "schedule_ops" | "maintenance_ops"
  | "platform_settings" | "menu_ops";
export type ResourceType = "project" | "group";
export type ResourceLevel = "use" | "manage";

export const FEATURE_MODULES: Array<{ id: FeatureModule; label: string; description: string }> = [
  { id: "workbench", label: "工作协作", description: "工作台、全局助手、任务派发与任务回放" },
  { id: "resource_workspace", label: "项目与群聊", description: "项目管理和群聊协作" },
  { id: "developer_tools", label: "开发与代码", description: "代码协作、代码智能和自动开发运营" },
  { id: "knowledge", label: "知识库", description: "知识库与文档" },
  { id: "memory", label: "记忆中心", description: "记忆控制中心" },
  { id: "personal", label: "个人工具", description: "宠物、音乐和对话搜索" },
  { id: "terminal_ops", label: "终端与日志", description: "终端工作台和项目日志" },
  { id: "tool_ops", label: "工具与 MCP", description: "工具配置、MCP、技能和市场" },
  { id: "schedule_ops", label: "定时任务", description: "定时任务管理" },
  { id: "maintenance_ops", label: "维护与指标", description: "性能监控和清理中心" },
  { id: "platform_settings", label: "平台设置", description: "渠道、模型、开发 Agent 和 TestAgent 设置" },
  { id: "menu_ops", label: "菜单管理", description: "菜单配置" },
];

type FeatureGrant = { grantId: string; userId: string; modules: FeatureModule[]; revision: number; updatedAt: string; updatedBy: string };
type ResourceGrant = { grantId: string; userId: string; resourceType: ResourceType; resourceId: string; level: ResourceLevel; revision: number; updatedAt: string; updatedBy: string };
type Store = { schema: "ccm-access-policy-v1"; revision: number; featureGrants: FeatureGrant[]; resourceGrants: ResourceGrant[]; updatedAt: string };
type AuditEvent = { eventId: string; action: string; actorUserId: string; targetUserId: string; kind: "feature" | "resource"; resourceType?: ResourceType; resourceId?: string; previous?: unknown; next?: unknown; occurredAt: string };

const STORE_FILE = path.join(CCM_DIR, "access-policy.json");
const AUDIT_FILE = path.join(CCM_DIR, "access-policy-audit.jsonl");
const now = () => new Date().toISOString();
const emptyStore = (): Store => ({ schema: "ccm-access-policy-v1", revision: 1, featureGrants: [], resourceGrants: [], updatedAt: now() });
const featureSet = new Set(FEATURE_MODULES.map(item => item.id));

function loadStore(): Store {
  const raw: any = readJsonWithBackup<any>(STORE_FILE, emptyStore());
  return {
    schema: "ccm-access-policy-v1",
    revision: Math.max(1, Number(raw?.revision || 1)),
    featureGrants: Array.isArray(raw?.featureGrants) ? raw.featureGrants : [],
    resourceGrants: Array.isArray(raw?.resourceGrants) ? raw.resourceGrants : [],
    updatedAt: String(raw?.updatedAt || now()),
  };
}
function saveStore(store: Store) { writeJsonAtomic(STORE_FILE, { ...store, schema: "ccm-access-policy-v1", updatedAt: now() }); }
function audit(event: Omit<AuditEvent, "eventId" | "occurredAt">) {
  const row: AuditEvent = { eventId: `apa_${crypto.randomUUID()}`, occurredAt: now(), ...event };
  require("fs").appendFileSync(AUDIT_FILE, `${JSON.stringify(row)}\n`, "utf8");
}
function userFeatures(store: Store, userId: string, admin = false) { return admin ? FEATURE_MODULES.map(item => item.id) : (store.featureGrants.find(item => item.userId === userId)?.modules || []); }
function resourceLevel(store: Store, userId: string, type: ResourceType, id: string, admin = false): ResourceLevel | null {
  if (admin) return "manage";
  return store.resourceGrants.find(item => item.userId === userId && item.resourceType === type && item.resourceId === id)?.level || null;
}
export function getEffectiveAccess(userId: string, role: string) {
  const store = loadStore(); const admin = role === "admin";
  return { policyRevision: store.revision, features: userFeatures(store, userId, admin), resources: admin ? [] : store.resourceGrants.filter(item => item.userId === userId).map(item => ({ resourceType: item.resourceType, resourceId: item.resourceId, level: item.level, revision: item.revision })) };
}
export function hasFeatureAccess(userId: string, role: string, module: FeatureModule) { return role === "admin" || getEffectiveAccess(userId, role).features.includes(module); }
export function hasResourceAccess(userId: string, role: string, type: ResourceType, id: string, required: ResourceLevel = "use") {
  const level = resourceLevel(loadStore(), userId, type, id, role === "admin"); return level === "manage" || (required === "use" && level === "use");
}

/**
 * Resolve the resource boundary for task reads.  A task may be a global
 * aggregate with nested targets, so all declared targets must be authorized
 * before returning the aggregate; otherwise an authorized project could be
 * used to read another project's task details.
 */
export function hasTaskResourceAccess(task: any, principal: any, required: ResourceLevel = "use") {
  if (!principal || principal.kind !== "browser" || principal.role === "admin") return true;
  const userId = String(principal.userId || "");
  const refs = new Map<string, Set<string>>([["project", new Set()], ["group", new Set()]]);
  const add = (type: ResourceType, value: any) => { const id = String(value || "").trim(); if (id) refs.get(type)!.add(id); };
  add("project", task?.target_project || task?.targetProject || task?.project || task?.project_id || task?.projectId);
  add("group", task?.group_id || task?.groupId || task?.target_group || task?.targetGroup);
  const targets = [task?.mission_target, task?.missionTarget, task?.targets, task?.mission_targets, task?.missionTargets, task?.child_targets, task?.childTargets];
  for (const value of targets) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      add("project", item?.project || item?.project_id || item?.projectId || (typeof item === "string" ? item : ""));
      add("group", item?.group || item?.group_id || item?.groupId || item?.target_group || item?.targetGroup);
    }
  }
  const projectRefs = refs.get("project")!;
  const groupRefs = refs.get("group")!;
  if (!projectRefs.size && !groupRefs.size) return false;
  for (const id of projectRefs) if (!hasResourceAccess(userId, principal.role, "project", id, required)) return false;
  for (const id of groupRefs) if (!hasResourceAccess(userId, principal.role, "group", id, required)) return false;
  return true;
}

export function authorizeResource(req: any, res: any, type: ResourceType, id: any, required: ResourceLevel = "use") {
  const principal = req?.ccmAuth;
  if (!principal || principal.kind !== "browser" || principal.role === "admin") return true;
  if (hasResourceAccess(String(principal.userId || ""), principal.role, type, String(id || ""), required)) return true;
  sendJson(res, { success: false, error: type === "project" ? "当前账户没有该项目的访问权限" : "当前账户没有该群聊的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
  return false;
}

/** Remove grants with the account while preserving an auditable revocation. */
export function removeUserAccess(userId: string, actorUserId: string) {
  const targetUserId = String(userId || "").trim();
  if (!targetUserId) return;
  withFileLock(STORE_FILE, () => {
    const store = loadStore();
    const features = store.featureGrants.find(item => item.userId === targetUserId);
    const resources = store.resourceGrants.filter(item => item.userId === targetUserId);
    if (!features && !resources.length) return;
    store.featureGrants = store.featureGrants.filter(item => item.userId !== targetUserId);
    store.resourceGrants = store.resourceGrants.filter(item => item.userId !== targetUserId);
    store.revision += 1;
    saveStore(store);
    if (features) audit({ action: "user_deleted_grants_revoked", actorUserId, targetUserId, kind: "feature", previous: features.modules, next: [] });
    for (const grant of resources) audit({ action: "user_deleted_grants_revoked", actorUserId, targetUserId, kind: "resource", resourceType: grant.resourceType, resourceId: grant.resourceId, previous: grant.level, next: null });
  });
}
export function filterAccessibleResources<T>(items: T[], userId: string, role: string, type: ResourceType, getId: (item: T) => string) {
  if (role === "admin") return items;
  return items.filter(item => hasResourceAccess(userId, role, type, getId(item), "use"));
}
export function featureForApi(pathname: string): FeatureModule | null {
  if (/^\/api\/(?:global-agent|tasks|task-templates|requirements|workbench|missions|automation-session)/.test(pathname)) return "workbench";
  if (/^\/api\/(?:start|stop|terminal|logs)/.test(pathname)) return "terminal_ops";
  if (/^\/api\/projects\/runtime(?:\/|$)/.test(pathname)) return "terminal_ops";
  if (/^\/api\/projects\/(?:tools|verification-commands|test-targets|code|changes|shared|folders|session-runtime-event)/.test(pathname)) return "developer_tools";
  if (/^\/api\/(?:projects|groups|sessions|agent-runs|project-runs)/.test(pathname)) return "resource_workspace";
  if (/^\/api\/(?:git|code-changes|code-intelligence|auto-dev)/.test(pathname)) return "developer_tools";
  if (/^\/api\/(?:knowledge|rag)/.test(pathname)) return "knowledge";
  if (/^\/api\/memory/.test(pathname)) return "memory";
  if (/^\/api\/(?:pets|music|search)/.test(pathname)) return "personal";
  if (/^\/api\/(?:terminal|logs)/.test(pathname)) return "terminal_ops";
  if (/^\/api\/(?:tools|marketplace|smithery)/.test(pathname)) return "tool_ops";
  if (/^\/api\/cron/.test(pathname)) return "schedule_ops";
  if (/^\/api\/(?:metrics|cleanup|reliability)/.test(pathname)) return "maintenance_ops";
  if (/^\/api\/(?:settings|orchestrator|agent-provider|development-agents|system\/settings-status)/.test(pathname)) return "platform_settings";
  if (/^\/api\/navigation\/(?:config|default)/.test(pathname)) return "menu_ops";
  return null;
}

export function authorizeResourceQuery(req: any, res: any, parsed: any) {
  const principal = req.ccmAuth;
  if (!principal || principal.kind !== "browser" || principal.role === "admin") return true;
  const query = parsed?.query || {};
  const project = String(query.project || query.project_id || query.projectId || "").trim();
  const group = String(query.group_id || query.groupId || query.group || "").trim();
  const required: ResourceLevel = /(?:runtime|git|changes|shared|attachments|members|tools|test-targets)/.test(String(parsed?.pathname || "")) ? "manage" : "use";
  if (project && !hasResourceAccess(principal.userId, principal.role, "project", project, required)) { sendJson(res, { success: false, error: "当前账户没有该项目的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403); return false; }
  if (group && !hasResourceAccess(principal.userId, principal.role, "group", group, required)) { sendJson(res, { success: false, error: "当前账户没有该群聊的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403); return false; }
  return true;
}

function parseBody(req: any): Promise<any> { return new Promise((resolve, reject) => { let text = ""; req.on("data", (chunk: any) => text += chunk); req.on("end", () => { try { resolve(text ? JSON.parse(text) : {}); } catch (error) { reject(error); } }); }); }
function admin(req: any) { return req.ccmAuth?.kind === "browser" && req.ccmAuth.role === "admin"; }
export function handleAccessPolicyApi(pathname: string, req: any, res: any) {
  if (!pathname.startsWith("/api/admin/")) return false;
  if (!admin(req)) { sendJson(res, { success: false, error: "仅管理员可以管理用户与权限", code: "ADMIN_REQUIRED" }, 403); return true; }
  if (pathname === "/api/admin/feature-access" && req.method === "GET") { const store = loadStore(); sendJson(res, { success: true, revision: store.revision, modules: FEATURE_MODULES, grants: store.featureGrants }); return true; }
  if (pathname === "/api/admin/resource-access" && req.method === "GET") { const store = loadStore(); sendJson(res, { success: true, revision: store.revision, grants: store.resourceGrants }); return true; }
  if (pathname === "/api/admin/access-audit" && req.method === "GET") { let rows: AuditEvent[] = []; try { rows = require("fs").readFileSync(AUDIT_FILE, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line: string) => JSON.parse(line)).slice(-500).reverse(); } catch {} sendJson(res, { success: true, events: rows }); return true; }
  const featureMatch = pathname.match(/^\/api\/admin\/feature-access\/([^/]+)$/);
  const resourceMatch = pathname.match(/^\/api\/admin\/resource-access\/([^/]+)$/);
  if ((featureMatch || resourceMatch) && ["PUT", "DELETE"].includes(req.method)) {
    void parseBody(req).then((payload) => {
      const targetUserId = decodeURIComponent((featureMatch || resourceMatch)![1]);
      const actorUserId = req.ccmAuth.userId;
      const result = withFileLock(STORE_FILE, () => {
        const store = loadStore(); if (payload.revision !== undefined && Number(payload.revision) !== store.revision) { const error: any = new Error("权限数据已变化，请刷新后重试"); error.code = "ACCESS_POLICY_CONFLICT"; throw error; }
        if (featureMatch) {
          const previous = store.featureGrants.find(item => item.userId === targetUserId) || null;
          if (req.method === "DELETE") {
            store.featureGrants = store.featureGrants.filter(item => item.userId !== targetUserId);
            audit({ action: "grant_revoked", actorUserId, targetUserId, kind: "feature", previous: previous?.modules || [], next: [] });
          }
          else { const modules = Array.from(new Set((Array.isArray(payload.modules) ? payload.modules : []).filter((item: any) => featureSet.has(item)))) as FeatureModule[]; const next: FeatureGrant = { grantId: previous?.grantId || `fgr_${crypto.randomUUID()}`, userId: targetUserId, modules, revision: store.revision + 1, updatedAt: now(), updatedBy: actorUserId }; store.featureGrants = store.featureGrants.filter(item => item.userId !== targetUserId).concat(next); audit({ action: previous ? "grant_changed" : "grant_created", actorUserId, targetUserId, kind: "feature", previous: previous?.modules || [], next: modules }); }
        } else {
          const type = payload.resourceType as ResourceType; const id = String(payload.resourceId || "").trim(); const level = payload.level as ResourceLevel;
          if (!(["project", "group"].includes(type) && id && (req.method === "DELETE" || ["use", "manage"].includes(level)))) throw new Error("资源权限参数无效");
          const previous = store.resourceGrants.find(item => item.userId === targetUserId && item.resourceType === type && item.resourceId === id) || null;
          if (req.method === "DELETE") {
            store.resourceGrants = store.resourceGrants.filter(item => !(item.userId === targetUserId && item.resourceType === type && item.resourceId === id));
            audit({ action: "grant_revoked", actorUserId, targetUserId, kind: "resource", resourceType: type, resourceId: id, previous: previous?.level || null, next: null });
          }
          else { const next: ResourceGrant = { grantId: previous?.grantId || `rgr_${crypto.randomUUID()}`, userId: targetUserId, resourceType: type, resourceId: id, level, revision: store.revision + 1, updatedAt: now(), updatedBy: actorUserId }; store.resourceGrants = store.resourceGrants.filter(item => !(item.userId === targetUserId && item.resourceType === type && item.resourceId === id)).concat(next); audit({ action: previous ? "grant_changed" : "grant_created", actorUserId, targetUserId, kind: "resource", resourceType: type, resourceId: id, previous: previous?.level || null, next: level }); }
        }
        store.revision += 1; saveStore(store); return store;
      }); sendJson(res, { success: true, revision: result.revision });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "保存权限失败", code: error?.code }, error?.code === "ACCESS_POLICY_CONFLICT" ? 409 : 400)); return true;
  }
  sendJson(res, { success: false, error: "Not Found" }, 404); return true;
}
