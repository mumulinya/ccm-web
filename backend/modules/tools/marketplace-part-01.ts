// Behavior-freeze split from marketplace.ts (part 1/2).
import * as crypto from "crypto";
import * as dns from "dns/promises";
import * as fs from "fs";
import * as https from "https";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { sendJson } from "../../core/utils";
import {
  deleteMcpTool,
  deleteSkill,
  loadProjectConfigs,
  loadMcpTools,
  loadSkills,
  saveMcpTool,
  saveSkill,
  SKILL_PACKAGES_DIR,
} from "../../core/db";
import { loadGroups } from "../collaboration/storage";
import { buildToolAuthorizationOptions, normalizeToolAuthorization, parseMcpGrant } from "../../tools/tool-authorization";
import { listRecentRuntimeToolAudits, probeRuntimeToolReadiness, resyncMissingRuntimeToolSnapshots, resyncRecentRuntimeToolSnapshots, syncRuntimeToolsWithCatalog } from "../../tools/runtime-tool-sync";
import { assertCcmInternalSkillMutable } from "../../skills/internal-skill-catalog";
import { isInternalMcpName } from "../../tools/internal-mcp-registry";

const { toolManager } = require("../../tools/tool-manager");
const execFileAsync = promisify(execFile);

export const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const INSTALLATIONS_FILE = path.join(CCM_DIR, "marketplace", "installations.json");
const MARKETPLACE_OPERATIONS_FILE = path.join(CCM_DIR, "marketplace", "operations.jsonl");
const SOURCES_FILE = path.join(CCM_DIR, "marketplace", "sources.json");
export const SMITHERY_CONFIG_FILE = path.join(CCM_DIR, "smithery-config.json");
export const MAX_CATALOG_BYTES = 2 * 1024 * 1024;
export const MAX_SKILL_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SKILL_PACKAGE_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_PACKAGE_FILES = 300;
export const CCM_COMMUNITY_CATALOG_URL = "https://raw.githubusercontent.com/mumulinya/ccm-web/main/public/marketplace.json";
export const SKILLS_SH_SEARCH_URL = "https://skills.sh/api/search";
export const SMITHERY_SERVERS_URL = "https://api.smithery.ai/servers";
export const DEFAULT_MARKETPLACE_PAGE_SIZE = 12;
export const MAX_MARKETPLACE_PAGE_SIZE = 50;

export interface MarketplaceSource {
  id: string;
  label: string;
  kind: "builtin" | "skills-sh" | "smithery" | "catalog" | "github" | "direct";
  url?: string;
  trust: "official" | "community" | "custom";
}

export interface MarketplaceListOptions {
  query?: string;
  page?: number;
  pageSize?: number;
  category?: string;
  sort?: string;
  requestedItem?: any;
}

export interface InstallationRecord {
  key: string;
  name: string;
  type: "mcp" | "skill";
  version: string;
  checksum: string;
  source: MarketplaceSource;
  sourceProof?: any;
  packagePath?: string;
  installedAt: string;
  updatedAt: string;
}

interface MarketplaceSavedSource extends MarketplaceSource {
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceInstallStore {
  skillPackagesDir?: string;
  loadInstallations?: () => InstallationRecord[];
  saveInstallations?: (items: InstallationRecord[]) => void;
  saveMcpTool?: (tool: any) => void;
  saveSkill?: (skill: any) => void;
  deleteMcpTool?: (name: string) => void;
  deleteSkill?: (name: string) => void;
  reloadTools?: () => void | Promise<void>;
  appendAudit?: (entry: any) => void;
  loadAudit?: () => any[];
  loadRuntimeAudits?: () => any[];
  loadMcpTools?: () => any[];
  loadSkills?: () => any[];
  loadProjectConfigs?: () => any;
  loadGroups?: () => any[];
}

export function safeSlug(value: any) {
  const slug = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "tool";
}

export function installationKey(type: string, name: string) {
  return `${type}:${String(name || "").trim().toLowerCase()}`;
}

export function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function appendJsonlBounded(file: string, entry: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
      const content = fs.readFileSync(file, "utf-8");
      const tail = content.slice(-1024 * 1024);
      fs.writeFileSync(file, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
    }
    fs.appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
  } catch {}
}

export function appendMarketplaceOperationAudit(entry: any, store: MarketplaceInstallStore = {}) {
  const safeEntry = {
    schema: "ccm-marketplace-operation-v1",
    action: entry.action,
    key: entry.key,
    type: entry.type,
    name: entry.name,
    source: entry.source ? {
      id: entry.source.id,
      label: entry.source.label,
      kind: entry.source.kind,
      trust: entry.source.trust,
      url: entry.source.url,
    } : undefined,
    previousVersion: entry.previousVersion || "",
    version: entry.version || "",
    previousChecksum: entry.previousChecksum || "",
    checksum: entry.checksum || "",
    changed: entry.changed === true,
    packageManaged: entry.packageManaged === true,
    toolManagerReloaded: entry.toolManagerReloaded === true,
    authorizationImpact: entry.authorizationImpact ? sanitizeMarketplaceAuthorizationImpact(entry.authorizationImpact) : undefined,
    runtimeImpact: entry.runtimeImpact ? sanitizeMarketplaceRuntimeImpact(entry.runtimeImpact) : undefined,
    runtimeResync: entry.runtimeResync ? sanitizeMarketplaceRuntimeResync(entry.runtimeResync) : undefined,
    sourceProof: entry.sourceProof ? sanitizeMarketplaceSourceProof(entry.sourceProof) : undefined,
  };
  if (store.appendAudit) store.appendAudit(safeEntry);
  else appendJsonlBounded(MARKETPLACE_OPERATIONS_FILE, safeEntry);
}

function sanitizeMarketplaceOperationAuditEntry(entry: any) {
  const action = cleanImpactText(entry?.action || "");
  const type = entry?.type === "skill" ? "skill" : (entry?.type === "mcp" ? "mcp" : "");
  const name = cleanImpactText(entry?.name || "", 240);
  const source = entry?.source && typeof entry.source === "object" ? {
    id: cleanImpactText(entry.source.id || "", 120),
    label: cleanImpactText(entry.source.label || "", 160),
    kind: ["builtin", "smithery", "catalog", "github", "direct"].includes(entry.source.kind) ? entry.source.kind : "",
    trust: ["official", "community", "custom"].includes(entry.source.trust) ? entry.source.trust : "",
    url: cleanImpactText(entry.source.url || "", 500),
  } : undefined;
  return {
    schema: "ccm-marketplace-operation-v1",
    at: cleanImpactText(entry?.at || "", 80),
    action,
    key: cleanImpactText(entry?.key || (type && name ? installationKey(type, name) : ""), 260),
    type,
    name,
    source,
    previousVersion: cleanImpactText(entry?.previousVersion || "", 80),
    version: cleanImpactText(entry?.version || "", 80),
    previousChecksum: cleanImpactText(entry?.previousChecksum || "", 160),
    checksum: cleanImpactText(entry?.checksum || "", 160),
    changed: entry?.changed === true,
    packageManaged: entry?.packageManaged === true,
    toolManagerReloaded: entry?.toolManagerReloaded === true,
    authorizationImpact: entry?.authorizationImpact ? sanitizeMarketplaceAuthorizationImpact(entry.authorizationImpact) : undefined,
    runtimeImpact: entry?.runtimeImpact ? sanitizeMarketplaceRuntimeImpact(entry.runtimeImpact) : undefined,
    runtimeResync: entry?.runtimeResync ? sanitizeMarketplaceRuntimeResync(entry.runtimeResync) : undefined,
    sourceProof: entry?.sourceProof ? sanitizeMarketplaceSourceProof(entry.sourceProof) : undefined,
  };
}

export function readMarketplaceOperationAudit(input: any = {}, store: MarketplaceInstallStore = {}) {
  const requestedLimit = Number(input?.limit || 60);
  const limit = Math.max(1, Math.min(200, Number.isFinite(requestedLimit) ? requestedLimit : 60));
  let rawEntries: any[] = [];
  if (store.loadAudit) {
    rawEntries = store.loadAudit();
  } else {
    try {
      if (fs.existsSync(MARKETPLACE_OPERATIONS_FILE)) {
        const content = fs.readFileSync(MARKETPLACE_OPERATIONS_FILE, "utf-8").slice(-1024 * 1024);
        rawEntries = content.split(/\r?\n/).filter(Boolean).map(line => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean);
      }
    } catch {
      rawEntries = [];
    }
  }
  const items = rawEntries
    .map(sanitizeMarketplaceOperationAuditEntry)
    .filter(entry => entry.action && entry.type && entry.name)
    .slice(-limit)
    .reverse();
  const actionCounts = items.reduce((acc: any, entry: any) => {
    acc[entry.action] = Number(acc[entry.action] || 0) + 1;
    return acc;
  }, {});
  const impactedScopes = items.reduce((sum: number, entry: any) => sum + Number(entry.authorizationImpact?.summary?.scopeCount || 0), 0);
  const impactedRuntimeSnapshots = items.reduce((sum: number, entry: any) => sum + Number(entry.runtimeImpact?.summary?.runtimeSnapshots || 0), 0);
  const staleRuntimeSnapshots = items.reduce((sum: number, entry: any) => sum + Number(entry.runtimeImpact?.summary?.catalogStale || 0), 0);
  const runtimeResynced = items.reduce((sum: number, entry: any) => {
    const summary = entry.runtimeResync?.summary || {};
    return sum + Math.max(Number(summary.resynced || 0), Number(summary.created || 0));
  }, 0);
  const runtimeResyncFailed = items.reduce((sum: number, entry: any) => sum + Number(entry.runtimeResync?.summary?.failed || 0), 0);
  return {
    schema: "ccm-marketplace-operations-v1",
    limit,
    items,
    summary: {
      totalReturned: items.length,
      actionCounts,
      impactedScopes,
      impactedRuntimeSnapshots,
      staleRuntimeSnapshots,
      runtimeResynced,
      runtimeResyncFailed,
      truncated: rawEntries.length > items.length,
    },
  };
}

function cleanImpactText(value: any, max = 180) {
  const text = String(value || "").replace(/[\0\r\n\t]+/g, " ").trim();
  return text.slice(0, max);
}

function normalizeImpactMcpServerName(value: any) {
  return cleanImpactText(value).replace(/^ccm__/i, "").toLowerCase();
}

function mcpGrantTargetsMarketplaceServer(grant: any, serverName: string) {
  const target = normalizeImpactMcpServerName(serverName);
  if (!target) return false;
  const parsed = parseMcpGrant(String(grant || ""));
  return normalizeImpactMcpServerName(parsed.server) === target;
}

function skillGrantTargetsMarketplaceSkill(grant: any, skillName: string) {
  return cleanImpactText(grant).toLowerCase() === cleanImpactText(skillName).toLowerCase();
}

function safeNumber(value: any) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function sanitizeMarketplaceAuthorizationScope(row: any) {
  const scope = row?.scope === "group" ? "group" : "project";
  const mcp = Array.isArray(row?.grants?.mcp) ? row.grants.mcp.map((grant: any) => cleanImpactText(grant)).filter(Boolean) : [];
  const skill = Array.isArray(row?.grants?.skill) ? row.grants.skill.map((grant: any) => cleanImpactText(grant)).filter(Boolean) : [];
  return {
    scope,
    id: cleanImpactText(row?.id || row?.scopeId || "", 240),
    name: cleanImpactText(row?.name || "", 240),
    grants: { mcp, skill },
  };
}

function sanitizeMarketplaceAuthorizationImpact(value: any) {
  const scopes = (Array.isArray(value?.scopes) ? value.scopes : []).map(sanitizeMarketplaceAuthorizationScope).filter((row: any) => row.id);
  return {
    schema: "ccm-marketplace-authorization-impact-v1",
    action: cleanImpactText(value?.action || ""),
    type: value?.type === "skill" ? "skill" : "mcp",
    name: cleanImpactText(value?.name || "", 240),
    summary: {
      scopeCount: safeNumber(value?.summary?.scopeCount ?? scopes.length),
      projects: safeNumber(value?.summary?.projects),
      groups: safeNumber(value?.summary?.groups),
      mcpGrants: safeNumber(value?.summary?.mcpGrants),
      skillGrants: safeNumber(value?.summary?.skillGrants),
    },
    scopes,
    truncated: value?.truncated === true,
  };
}

function loadAuthorizationImpactProjectConfigs(store: MarketplaceInstallStore = {}) {
  try {
    const configs = (store.loadProjectConfigs || loadProjectConfigs)();
    return configs && typeof configs === "object" && !Array.isArray(configs) ? configs : {};
  } catch {
    return {};
  }
}

function loadAuthorizationImpactGroups(store: MarketplaceInstallStore = {}) {
  try {
    const groups = (store.loadGroups || loadGroups)();
    return Array.isArray(groups) ? groups : [];
  } catch {
    return [];
  }
}

export function buildMarketplaceAuthorizationImpact(input: { action: string; type: string; name: string }, store: MarketplaceInstallStore = {}) {
  const type = input.type === "skill" ? "skill" : "mcp";
  const name = cleanImpactText(input.name, 240);
  const scopes: any[] = [];
  const addScope = (scope: "project" | "group", id: any, label: any, tools: any) => {
    const normalized = normalizeToolAuthorization(tools || {});
    const grants = type === "mcp"
      ? { mcp: normalized.mcp.filter(grant => mcpGrantTargetsMarketplaceServer(grant, name)), skill: [] as string[] }
      : { mcp: [] as string[], skill: normalized.skill.filter(grant => skillGrantTargetsMarketplaceSkill(grant, name)) };
    if (!grants.mcp.length && !grants.skill.length) return;
    scopes.push(sanitizeMarketplaceAuthorizationScope({ scope, id, name: label || id, grants }));
  };

  const projectConfigs = loadAuthorizationImpactProjectConfigs(store);
  for (const [projectId, config] of Object.entries(projectConfigs)) {
    const row = config as any;
    addScope("project", projectId, row?.name || row?.displayName || row?.project || projectId, row?.tools || {});
  }
  for (const group of loadAuthorizationImpactGroups(store)) {
    addScope("group", group?.id, group?.name || group?.title || group?.id, group?.tools || {});
  }

  const projectCount = scopes.filter(row => row.scope === "project").length;
  const groupCount = scopes.filter(row => row.scope === "group").length;
  const mcpGrants = scopes.reduce((sum, row) => sum + row.grants.mcp.length, 0);
  const skillGrants = scopes.reduce((sum, row) => sum + row.grants.skill.length, 0);
  const limitedScopes = scopes.slice(0, 200);
  return sanitizeMarketplaceAuthorizationImpact({
    action: input.action,
    type,
    name,
    summary: {
      scopeCount: scopes.length,
      projects: projectCount,
      groups: groupCount,
      mcpGrants,
      skillGrants,
    },
    scopes: limitedScopes,
    truncated: scopes.length > limitedScopes.length,
  });
}

export function previewMarketplaceAuthorizationImpact(payload: any, store: MarketplaceInstallStore = {}) {
  const type = String(payload?.type || "").toLowerCase();
  const name = String(payload?.name || "").trim();
  const action = String(payload?.action || "preview").toLowerCase();
  if (!["mcp", "skill"].includes(type) || !name) throw new Error("授权影响预检参数无效");
  const normalizedAction = ["install", "update", "uninstall", "preview"].includes(action) ? action : "preview";
  return {
    authorizationImpact: buildMarketplaceAuthorizationImpact({ action: normalizedAction, type, name }, store),
  };
}

function runtimeAuditRequestsMarketplaceItem(audit: any, type: string, name: string) {
  const requested = audit?.requested || audit?.allowedTools || audit?.allowed_tools || {};
  if (type === "skill") {
    return uniqueImpactList(requested.skill).some(grant => skillGrantTargetsMarketplaceSkill(grant, name));
  }
  return uniqueImpactList(requested.mcp).some(grant => mcpGrantTargetsMarketplaceServer(grant, name));
}

function uniqueImpactList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => cleanImpactText(item, 240)).filter(Boolean)));
}

function sanitizeMarketplaceRuntimeSnapshot(row: any) {
  const failedChecks = Array.isArray(row?.failedChecks) ? row.failedChecks.map((item: any) => cleanImpactText(item, 120)).filter(Boolean) : [];
  return {
    runtime: cleanImpactText(row?.runtime || "", 80),
    snapshotId: cleanImpactText(row?.snapshotId || "", 80),
    projectName: cleanImpactText(row?.projectName || "", 240),
    groupId: cleanImpactText(row?.groupId || "", 180),
    catalogStale: row?.catalogStale === true,
    deliveryReady: row?.deliveryReady === true,
    runtimeReady: row?.runtimeReady === true,
    overallReady: row?.overallReady === true,
    dispatchReady: row?.dispatchReady !== false,
    currentCatalogRevision: cleanImpactText(row?.currentCatalogRevision || "", 80),
    catalogRevision: cleanImpactText(row?.catalogRevision || "", 80),
    failedChecks: failedChecks.slice(0, 12),
  };
}

function sanitizeMarketplaceRuntimeImpact(value: any) {
  const snapshots = (Array.isArray(value?.snapshots) ? value.snapshots : []).map(sanitizeMarketplaceRuntimeSnapshot).filter((row: any) => row.runtime || row.snapshotId);
  return {
    schema: "ccm-marketplace-runtime-impact-v1",
    action: cleanImpactText(value?.action || ""),
    type: value?.type === "skill" ? "skill" : "mcp",
    name: cleanImpactText(value?.name || "", 240),
    summary: {
      runtimeSnapshots: safeNumber(value?.summary?.runtimeSnapshots ?? snapshots.length),
      catalogStale: safeNumber(value?.summary?.catalogStale),
      dispatchBlocked: safeNumber(value?.summary?.dispatchBlocked),
      deliveryBlocked: safeNumber(value?.summary?.deliveryBlocked),
      affectedProjects: safeNumber(value?.summary?.affectedProjects),
      affectedGroups: safeNumber(value?.summary?.affectedGroups),
    },
    snapshots,
    truncated: value?.truncated === true,
  };
}

function sanitizeMarketplaceRuntimeResyncItem(item: any) {
  return {
    action: cleanImpactText(item?.action || "", 80),
    reason: cleanImpactText(item?.reason || "", 180),
    before: item?.before ? sanitizeMarketplaceRuntimeSnapshot(item.before) : undefined,
    after: item?.after ? sanitizeMarketplaceRuntimeSnapshot(item.after) : (item?.runtime || item?.snapshotId ? sanitizeMarketplaceRuntimeSnapshot(item) : undefined),
  };
}

function sanitizeMarketplaceRuntimeResync(value: any) {
  const items = (Array.isArray(value?.items) ? value.items : [])
    .map(sanitizeMarketplaceRuntimeResyncItem)
    .filter((item: any) => item.action)
    .slice(0, 80);
  return {
    schema: "ccm-marketplace-runtime-resync-v1",
    success: value?.success !== false,
    requestedAt: cleanImpactText(value?.requestedAt || "", 80),
    error: value?.error ? cleanImpactText(value.error, 500) : undefined,
    summary: {
      scanned: safeNumber(value?.summary?.scanned),
      selected: safeNumber(value?.summary?.selected),
      created: safeNumber(value?.summary?.created),
      resynced: safeNumber(value?.summary?.resynced),
      skipped: safeNumber(value?.summary?.skipped),
      failed: safeNumber(value?.summary?.failed),
    },
    items,
  };
}

function loadMarketplaceRuntimeAudits(store: MarketplaceInstallStore = {}) {
  try {
    const audits = store.loadRuntimeAudits ? store.loadRuntimeAudits() : listRecentRuntimeToolAudits(80);
    return Array.isArray(audits) ? audits : [];
  } catch {
    return [];
  }
}

export function buildMarketplaceRuntimeImpact(input: { action: string; type: string; name: string }, store: MarketplaceInstallStore = {}) {
  const type = input.type === "skill" ? "skill" : "mcp";
  const name = cleanImpactText(input.name, 240);
  const snapshots: any[] = [];
  const catalog = buildMarketplaceRuntimeCatalog(store);
  for (const audit of loadMarketplaceRuntimeAudits(store)) {
    if (!runtimeAuditRequestsMarketplaceItem(audit, type, name)) continue;
    const readiness = probeRuntimeToolReadiness(audit, { record: false, catalog });
    const failedChecks = Array.isArray(readiness.checks)
      ? readiness.checks.filter(check => !check.ok).map(check => check.id)
      : [];
    snapshots.push(sanitizeMarketplaceRuntimeSnapshot({
      runtime: readiness.runtime,
      snapshotId: readiness.snapshotId,
      projectName: readiness.projectName,
      groupId: readiness.groupId,
      catalogStale: readiness.catalogStale === true,
      deliveryReady: readiness.deliveryReady === true,
      runtimeReady: readiness.runtimeReady === true,
      overallReady: readiness.overallReady === true,
      dispatchReady: readiness.dispatchGate?.dispatchReady !== false,
      catalogRevision: readiness.catalogRevision,
      currentCatalogRevision: readiness.currentCatalogRevision,
      failedChecks,
    }));
  }
  const limitedSnapshots = snapshots.slice(0, 80);
  const projectIds = new Set(snapshots.map(row => row.projectName).filter(Boolean));
  const groupIds = new Set(snapshots.map(row => row.groupId).filter(Boolean));
  return sanitizeMarketplaceRuntimeImpact({
    action: input.action,
    type,
    name,
    summary: {
      runtimeSnapshots: snapshots.length,
      catalogStale: snapshots.filter(row => row.catalogStale).length,
      dispatchBlocked: snapshots.filter(row => row.dispatchReady === false).length,
      deliveryBlocked: snapshots.filter(row => row.deliveryReady === false).length,
      affectedProjects: projectIds.size,
      affectedGroups: groupIds.size,
    },
    snapshots: limitedSnapshots,
    truncated: snapshots.length > limitedSnapshots.length,
  });
}

function marketplaceAutoResyncRequested(value: any) {
  if (value === true) return true;
  const text = String(value || "").toLowerCase();
  return ["1", "true", "yes", "auto"].includes(text);
}

export function buildMarketplaceRuntimeCatalog(store: MarketplaceInstallStore = {}) {
  return {
    mcpTools: (store.loadMcpTools || loadMcpTools)(),
    skills: (store.loadSkills || loadSkills)(),
    skillPackagesDir: store.skillPackagesDir || SKILL_PACKAGES_DIR,
  };
}

export function maybeAutoResyncMarketplaceRuntime(impact: any, options: any = {}, store: MarketplaceInstallStore = {}) {
  if (!marketplaceAutoResyncRequested(options?.autoResync)) return null;
  const snapshots = Array.isArray(impact?.snapshots) ? impact.snapshots : [];
  const snapshotIds = snapshots.map(snapshot => cleanImpactText(snapshot?.snapshotId || "", 80)).filter(Boolean);
  try {
    const catalog = buildMarketplaceRuntimeCatalog(store);
    const existing = snapshotIds.length ? resyncRecentRuntimeToolSnapshots({
      staleOnly: false,
      limit: Math.min(50, Math.max(1, snapshotIds.length)),
      snapshotIds,
      audits: loadMarketplaceRuntimeAudits(store),
      catalog,
    }) : null;
    const missing = resyncMissingRuntimeToolSnapshots({
      type: impact?.type,
      name: impact?.name,
      limit: 30,
      projects: store.loadProjectConfigs ? store.loadProjectConfigs() : loadProjectConfigs(),
      groups: store.loadGroups ? store.loadGroups() : loadGroups(),
      catalog,
    });
    const existingSummary: any = existing?.summary || {};
    const missingSummary: any = missing?.summary || {};
    const result = {
      schema: "ccm-runtime-tool-resync-v1",
      success: true,
      requestedAt: new Date().toISOString(),
      summary: {
        scanned: safeNumber(existingSummary.scanned) + safeNumber(missingSummary.scanned),
        selected: safeNumber(existingSummary.selected) + safeNumber(missingSummary.selected),
        created: safeNumber(missingSummary.created),
        resynced: safeNumber(existingSummary.resynced) + safeNumber(missingSummary.created),
        skipped: safeNumber(existingSummary.skipped) + safeNumber(missingSummary.skipped),
        failed: safeNumber(existingSummary.failed) + safeNumber(missingSummary.failed),
      },
      items: [
        ...((Array.isArray(existing?.items) ? existing.items : [])),
        ...((Array.isArray(missing?.items) ? missing.items : [])),
      ],
    };
    if (!result.items.length && result.summary.selected === 0) return null;
    return sanitizeMarketplaceRuntimeResync(result);
  } catch (error: any) {
    return sanitizeMarketplaceRuntimeResync({
      success: false,
      requestedAt: new Date().toISOString(),
      error: error?.message || String(error),
      summary: { scanned: 0, selected: 0, resynced: 0, skipped: 0, failed: 1 },
      items: [],
    });
  }
}

export function previewToolCatalogMutationImpact(input: { action: string; type: string; name: string }, store: MarketplaceInstallStore = {}) {
  const type = input?.type === "skill" ? "skill" : "mcp";
  const name = cleanImpactText(input?.name || "", 240);
  if (!name) throw new Error("工具名称不能为空");
  const action = cleanImpactText(input?.action || "preview", 40);
  return {
    authorizationImpact: buildMarketplaceAuthorizationImpact({ action, type, name }, store),
    runtimeImpact: buildMarketplaceRuntimeImpact({ action, type, name }, store),
  };
}

export function completeToolCatalogMutationLifecycle(input: { action: string; type: string; name: string; autoResync?: any }, store: MarketplaceInstallStore = {}) {
  const preview = previewToolCatalogMutationImpact(input, store);
  const runtimeResync = maybeAutoResyncMarketplaceRuntime(preview.runtimeImpact, {
    autoResync: input?.autoResync !== false,
  }, store);
  const runtimeImpact = runtimeResync?.summary?.resynced || runtimeResync?.summary?.created
    ? buildMarketplaceRuntimeImpact({ action: input.action, type: input.type, name: input.name }, store)
    : preview.runtimeImpact;
  return { authorizationImpact: preview.authorizationImpact, runtimeImpact, runtimeResync };
}

export function loadInstallations(): InstallationRecord[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(INSTALLATIONS_FILE, "utf-8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveInstallations(items: InstallationRecord[]) {
  writeJsonAtomic(INSTALLATIONS_FILE, { version: 1, items });
}

export function marketplaceSourceId(url: string) {
  return `external-${sha256(url).slice(0, 12)}`;
}

export function normalizeSavedSource(value: any): MarketplaceSavedSource | null {
  const url = String(value?.url || "").trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const now = new Date().toISOString();
  const label = String(value?.label || parsed.hostname).replace(/[\r\n\t]+/g, " ").trim().slice(0, 80) || parsed.hostname;
  const trust = value?.trust === "community" ? "community" : "custom";
  return {
    id: String(value?.id || marketplaceSourceId(parsed.toString())).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || marketplaceSourceId(parsed.toString()),
    label,
    kind: "catalog",
    url: parsed.toString(),
    trust,
    enabled: value?.enabled !== false,
    createdAt: String(value?.createdAt || now),
    updatedAt: String(value?.updatedAt || now),
  };
}

export function loadMarketplaceSources(): MarketplaceSavedSource[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8"));
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    return rawItems.map(normalizeSavedSource).filter(Boolean) as MarketplaceSavedSource[];
  } catch {
    return [];
  }
}

export function saveMarketplaceSources(items: MarketplaceSavedSource[]) {
  writeJsonAtomic(SOURCES_FILE, { version: 1, items });
}

function isPathInside(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function removeManagedPackage(packagePath: string, skillPackagesDir = SKILL_PACKAGES_DIR) {
  if (!packagePath || !isPathInside(skillPackagesDir, packagePath)) return;
  if (fs.existsSync(packagePath)) fs.rmSync(packagePath, { recursive: true, force: true });
}

export function sha256(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function objectKeys(value: any) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).map(key => String(key || "").trim()).filter(Boolean).sort()
    : [];
}

function marketplaceEnvKeys(item: any) {
  if (item?.env && typeof item.env === "object" && !Array.isArray(item.env)) return objectKeys(item.env);
  return String(item?.env || "")
    .split(/\r?\n/)
    .map(line => line.split("=")[0]?.trim())
    .filter(Boolean)
    .sort();
}

function marketplaceSourceSummary(source: any = {}) {
  return {
    id: cleanImpactText(source?.id || "", 120),
    label: cleanImpactText(source?.label || "", 160),
    kind: ["builtin", "smithery", "catalog", "github", "direct"].includes(source?.kind) ? source.kind : "",
    trust: ["official", "community", "custom"].includes(source?.trust) ? source.trust : "",
    url: cleanImpactText(source?.url || "", 500),
  };
}

function marketplaceSourceMaterial(item: any, packageStats: any = null) {
  if (item?.type === "mcp") {
    return {
      type: "mcp",
      name: String(item?.name || ""),
      version: String(item?.version || ""),
      transport: item?.url ? "http" : "stdio",
      command: String(item?.command || ""),
      args: Array.isArray(item?.args) ? item.args.map(String) : [],
      url: String(item?.url || ""),
      envKeys: marketplaceEnvKeys(item),
      headerKeys: objectKeys(item?.headers),
      sourceUrl: String(item?.sourceUrl || ""),
    };
  }
  return {
    type: "skill",
    name: String(item?.name || ""),
    version: String(item?.version || ""),
    sourceUrl: String(item?.sourceUrl || ""),
    downloadUrl: String(item?.downloadUrl || ""),
    promptBytes: Buffer.byteLength(String(item?.prompt || ""), "utf-8"),
    packageBacked: !!(item?.sourceUrl && !item?.prompt),
    packageStats: packageStats ? {
      files: safeNumber(packageStats.files),
      totalBytes: safeNumber(packageStats.totalBytes),
    } : undefined,
  };
}

function marketplaceMaterialKind(item: any) {
  if (item?.type === "mcp") return item?.url ? "remote_mcp" : "stdio_mcp";
  if (item?.prompt) return "inline_skill";
  if (item?.downloadUrl && !parseGithubSkillSource(item.downloadUrl)) return "downloaded_skill";
  return "github_skill_package";
}

export function buildMarketplaceSourceProof(item: any, input: any = {}) {
  const material = marketplaceSourceMaterial(item, input.packageStats || null);
  return sanitizeMarketplaceSourceProof({
    schema: "ccm-marketplace-source-proof-v1",
    itemId: item?.id,
    type: item?.type,
    name: item?.name,
    version: item?.version,
    source: item?.source,
    materialKind: input.materialKind || marketplaceMaterialKind(item),
    materialHash: sha256(JSON.stringify(material)),
    checksum: input.checksum || "",
    envKeys: item?.type === "mcp" ? material.envKeys : [],
    headerKeys: item?.type === "mcp" ? material.headerKeys : [],
    packageStats: input.packageStats || null,
  });
}

export function sanitizeMarketplacePreviewItem(item: any) {
  return {
    id: cleanImpactText(item?.id || "", 260),
    name: cleanImpactText(item?.name || "", 240),
    displayName: cleanImpactText(item?.displayName || item?.name || "", 240),
    type: item?.type === "skill" ? "skill" : (item?.type === "mcp" ? "mcp" : ""),
    description: cleanImpactText(item?.description || "", 500),
    author: cleanImpactText(item?.author || "", 160),
    version: cleanImpactText(item?.version || "", 80),
    source: marketplaceSourceSummary(item?.source || {}),
    sourceUrl: cleanImpactText(item?.sourceUrl || "", 500),
    downloadUrl: cleanImpactText(item?.downloadUrl || "", 500),
    homepage: cleanImpactText(item?.homepage || "", 500),
    command: item?.type === "mcp" ? cleanImpactText(item?.command || "", 240) : "",
    args: item?.type === "mcp" && Array.isArray(item?.args) ? item.args.map((arg: any) => cleanImpactText(arg, 240)).slice(0, 80) : [],
    url: item?.type === "mcp" ? cleanImpactText(item?.url || "", 500) : "",
    envKeys: item?.type === "mcp" ? marketplaceEnvKeys(item) : [],
    headerKeys: item?.type === "mcp" ? objectKeys(item?.headers) : [],
  };
}

export function sanitizeMarketplaceSourceProof(value: any) {
  const packageStats = value?.packageStats || {};
  return {
    schema: "ccm-marketplace-source-proof-v1",
    itemId: cleanImpactText(value?.itemId || "", 260),
    type: value?.type === "skill" ? "skill" : (value?.type === "mcp" ? "mcp" : ""),
    name: cleanImpactText(value?.name || "", 240),
    version: cleanImpactText(value?.version || "", 80),
    source: marketplaceSourceSummary(value?.source || {}),
    materialKind: cleanImpactText(value?.materialKind || "", 80),
    materialHash: cleanImpactText(value?.materialHash || "", 80),
    checksum: cleanImpactText(value?.checksum || "", 160),
    envKeys: Array.isArray(value?.envKeys) ? value.envKeys.map((key: any) => cleanImpactText(key, 120)).filter(Boolean).slice(0, 60) : [],
    headerKeys: Array.isArray(value?.headerKeys) ? value.headerKeys.map((key: any) => cleanImpactText(key, 120)).filter(Boolean).slice(0, 60) : [],
    packageStats: {
      files: safeNumber(packageStats.files),
      totalBytes: safeNumber(packageStats.totalBytes),
    },
  };
}

export function compareVersions(left: string, right: string) {
  const parse = (value: string) => String(value || "0").split(/[.+-]/).map(part => Number(part.match(/^\d+/)?.[0] || 0));
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta) return delta;
  }
  return 0;
}

function normalizeSource(value: any, fallback: MarketplaceSource): MarketplaceSource {
  const source = value && typeof value === "object" ? value : {};
  return {
    id: String(source.id || fallback.id),
    label: String(source.label || fallback.label),
    kind: ["builtin", "skills-sh", "smithery", "catalog", "github", "direct"].includes(source.kind) ? source.kind : fallback.kind,
    url: String(source.url || fallback.url || "") || undefined,
    trust: ["official", "community", "custom"].includes(source.trust) ? source.trust : fallback.trust,
  };
}

export function baseMarketplaceSourceId(value: any) {
  return String(value || "").replace(/:claude-plugin$/i, "");
}

export function publicMarketplaceSources() {
  return loadMarketplaceSources().filter(source => source.enabled !== false);
}

export function normalizeMarketplaceItem(item: any, fallbackSource: MarketplaceSource) {
  const type = String(item?.type || "").toLowerCase();
  if (!["mcp", "skill"].includes(type)) throw new Error("商城条目 type 必须为 mcp 或 skill");
  const name = String(item?.name || item?.displayName || item?.slug || "").trim();
  if (!name || name.length > 120 || /[\\/\0\r\n]/.test(name)) throw new Error("商城条目名称无效");
  const source = normalizeSource(item?.source, fallbackSource);
  const normalized: any = {
    ...item,
    id: String(item?.id || `${source.id}:${type}:${safeSlug(name)}`),
    name,
    type,
    description: String(item?.description || item?.summary || "").trim(),
    author: String(item?.author?.name || item?.author || item?.owner || source.label || "Unknown"),
    version: String(item?.version || "0.0.0"),
    source,
    sourceUrl: String(item?.sourceUrl || item?.repository || item?.homepage || source.url || ""),
    downloadUrl: String(item?.downloadUrl || item?.skillUrl || ""),
    homepage: String(item?.homepage || item?.repository || ""),
    command: String(item?.command || "").trim(),
    args: Array.isArray(item?.args) ? item.args.map(String) : [],
    url: String(item?.url || "").trim(),
    env: item?.env && typeof item.env === "object" ? item.env : String(item?.env || ""),
    prompt: String(item?.prompt || item?.content || ""),
  };
  if (type === "mcp" && !normalized.command && !normalized.url) throw new Error(`MCP "${name}" 缺少 command 或 url`);
  if (type === "skill" && !normalized.prompt && !normalized.downloadUrl && !normalized.sourceUrl) {
    throw new Error(`Skill "${name}" 缺少 prompt、downloadUrl 或 sourceUrl`);
  }
  return normalized;
}

export function normalizeMarketplaceInstallRequest(item: any, fallbackSource: MarketplaceSource) {
  const type = String(item?.type || "").toLowerCase();
  if (!["mcp", "skill"].includes(type)) throw new Error("商城条目 type 必须为 mcp 或 skill");
  const name = String(item?.name || item?.displayName || item?.slug || "").trim();
  if (!name || name.length > 120 || /[\\/\0\r\n]/.test(name)) throw new Error("商城条目名称无效");
  const source = normalizeSource(item?.source, fallbackSource);
  return {
    id: String(item?.id || `${source.id}:${type}:${safeSlug(name)}`),
    name,
    type,
    source,
  };
}

function cleanRelativePackagePath(value: any) {
  const raw = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = raw.split("/").filter(part => part && part !== ".");
  if (parts.some(part => part === "..")) return "";
  return parts.join("/");
}

export function githubRepoFromUrlOrShorthand(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const shorthand = raw.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (shorthand) return shorthand[1].replace(/\.git$/i, "");
  try {
    const parsed = new URL(raw);
    if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
  } catch {
    const ssh = raw.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
    return ssh ? ssh[1].replace(/\.git$/i, "") : null;
  }
}

function githubContextFromCatalogUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.toLowerCase() === "raw.githubusercontent.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 4) {
        const filePath = parts.slice(3).join("/");
        return {
          repo: `${parts[0]}/${parts[1]}`,
          ref: parts[2],
          basePath: cleanRelativePackagePath(path.posix.dirname(filePath)),
        };
      }
    }
    if (["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 5 && ["blob", "raw"].includes(parts[2])) {
        const filePath = parts.slice(4).join("/");
        return {
          repo: `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`,
          ref: parts[3],
          basePath: cleanRelativePackagePath(path.posix.dirname(filePath)),
        };
      }
    }
  } catch {}
  return null;
}

function githubContextFromPluginSource(pluginSource: any, catalogUrl = "") {
  if (typeof pluginSource === "string") {
    const catalogContext = githubContextFromCatalogUrl(catalogUrl);
    if (!catalogContext) return null;
    return {
      repo: catalogContext.repo,
      ref: catalogContext.ref,
      basePath: cleanRelativePackagePath(path.posix.join(catalogContext.basePath || "", cleanRelativePackagePath(pluginSource))),
    };
  }
  if (!pluginSource || typeof pluginSource !== "object") return null;
  if (pluginSource.source === "github" && pluginSource.repo) {
    return {
      repo: String(pluginSource.repo),
      ref: String(pluginSource.ref || pluginSource.sha || ""),
      basePath: "",
    };
  }
  if (pluginSource.source === "git-subdir" && pluginSource.url) {
    const repo = githubRepoFromUrlOrShorthand(pluginSource.url);
    return repo ? {
      repo,
      ref: String(pluginSource.ref || pluginSource.sha || ""),
      basePath: cleanRelativePackagePath(pluginSource.path),
    } : null;
  }
  if (pluginSource.source === "url" && pluginSource.url) {
    const repo = githubRepoFromUrlOrShorthand(pluginSource.url);
    return repo ? {
      repo,
      ref: String(pluginSource.ref || pluginSource.sha || ""),
      basePath: "",
    } : null;
  }
  return null;
}

function githubSkillSourceUrl(pluginSource: any, skillPath: any, catalogUrl = "") {
  const context = githubContextFromPluginSource(pluginSource, catalogUrl);
  if (!context?.repo) return "";
  const relativeSkill = cleanRelativePackagePath(skillPath);
  if (!relativeSkill) return "";
  const packagePath = cleanRelativePackagePath(path.posix.join(context.basePath || "", relativeSkill));
  const ref = context.ref || "HEAD";
  return `https://github.com/${context.repo}/tree/${encodeURIComponent(ref)}/${packagePath.split("/").map(encodeURIComponent).join("/")}`;
}

function mergeInlineMcpServers(spec: any): Record<string, any> {
  const merged: Record<string, any> = {};
  const absorb = (value: any) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [name, config] of Object.entries(value)) {
      if (!config || typeof config !== "object" || Array.isArray(config)) continue;
      const row = config as any;
      if (row.command || row.url) merged[String(name)] = row;
    }
  };
  if (Array.isArray(spec)) {
    for (const item of spec) absorb(item);
  } else {
    absorb(spec);
  }
  return merged;
}

function convertClaudePluginMarketplace(parsed: any, source: MarketplaceSource, catalogUrl = "") {
  const plugins = Array.isArray(parsed?.plugins) ? parsed.plugins : [];
  const items: any[] = [];
  for (const plugin of plugins) {
    const pluginName = String(plugin?.name || "").trim();
    if (!pluginName) continue;
    const pluginDescription = String(plugin.description || parsed?.metadata?.description || "");
    const pluginHomepage = (() => {
      const repo = githubContextFromPluginSource(plugin.source, catalogUrl)?.repo;
      return repo ? `https://github.com/${repo}` : String(plugin.homepage || plugin.repository || "");
    })();
    const pluginSource: MarketplaceSource = {
      ...source,
      id: `${source.id}:claude-plugin`,
      label: `${source.label} / Claude Plugin`,
      kind: "catalog",
    };
    const mcpServers = mergeInlineMcpServers(plugin.mcpServers);
    for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
      const config = serverConfig as any;
      items.push(normalizeMarketplaceItem({
        name: `${pluginName}-${serverName}`,
        type: "mcp",
        description: String(config.description || pluginDescription || `MCP server from Claude plugin ${pluginName}`),
        command: config.command,
        args: Array.isArray(config.args) ? config.args : [],
        url: config.url,
        headers: config.headers,
        env: config.env || "",
        author: plugin.author || parsed?.owner?.name || parsed?.owner || source.label,
        version: plugin.version || parsed?.metadata?.version || "0.0.0",
        homepage: pluginHomepage,
        sourceUrl: pluginHomepage || catalogUrl,
      }, pluginSource));
    }
    const skillPaths = Array.isArray(plugin.skills) ? plugin.skills : (plugin.skills ? [plugin.skills] : []);
    for (const skillPath of skillPaths) {
      const sourceUrl = githubSkillSourceUrl(plugin.source, skillPath, catalogUrl);
      if (!sourceUrl) continue;
      const skillBase = path.posix.basename(cleanRelativePackagePath(skillPath)) || "skill";
      items.push(normalizeMarketplaceItem({
        name: `${pluginName}-${skillBase}`,
        type: "skill",
        description: pluginDescription || `Skill from Claude plugin ${pluginName}`,
        sourceUrl,
        homepage: pluginHomepage || sourceUrl,
        author: plugin.author || parsed?.owner?.name || parsed?.owner || source.label,
        version: plugin.version || parsed?.metadata?.version || "0.0.0",
      }, pluginSource));
    }
  }
  return items;
}

export function catalogItemsFromParsedJson(parsed: any, source: MarketplaceSource, catalogUrl = "") {
  const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || parsed.tools || []);
  const ccmItems = Array.isArray(rawItems)
    ? rawItems.map((item: any) => normalizeMarketplaceItem(item, { ...source, url: catalogUrl || source.url }))
    : [];
  const claudeItems = convertClaudePluginMarketplace(parsed, { ...source, url: catalogUrl || source.url }, catalogUrl || source.url || "");
  const seen = new Set<string>();
  return [...ccmItems, ...claudeItems].filter(item => {
    const key = `${item.type}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function decorateInstallState(items: any[]) {
  const installations = loadInstallations();
  const installedMcp = new Map(loadMcpTools().map(item => [String(item.name), item]));
  const installedSkills = new Map(loadSkills().map(item => [String(item.name), item]));
  return items.map(item => {
    const record = installations.find(entry => entry.key === installationKey(item.type, item.name));
    const installed = item.type === "mcp" ? installedMcp.has(item.name) : installedSkills.has(item.name);
    return {
      ...item,
      installed,
      installedVersion: record?.version || (item.type === "mcp" ? installedMcp.get(item.name)?.version : installedSkills.get(item.name)?.version) || "",
      updateAvailable: !!record && compareVersions(item.version, record.version) > 0,
      installation: record || null,
    };
  });
}

export function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const value = address.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
}

export async function assertSafeHttpsUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("外部来源 URL 无效");
  }
  if (parsed.protocol !== "https:") throw new Error("外部来源仅允许 HTTPS");
  if (parsed.username || parsed.password) throw new Error("外部来源 URL 不允许内嵌凭据");
  if (["localhost", "localhost.localdomain"].includes(parsed.hostname.toLowerCase())) throw new Error("外部来源不允许访问本机地址");
  const addresses = await dns.lookup(parsed.hostname, { all: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw new Error("外部来源不允许访问内网地址");
  return parsed;
}

export async function fetchRemote(value: string, maxBytes: number, headers: Record<string, string> = {}, redirects = 0): Promise<{ body: Buffer; contentType: string; finalUrl: string }> {
  if (redirects > 4) throw new Error("外部来源重定向次数过多");
  const parsed = await assertSafeHttpsUrl(value);
  return new Promise((resolve, reject) => {
    const request = https.get(parsed, {
      headers: { "User-Agent": "ccm-tool-marketplace/1.0", Accept: "application/json,text/markdown,text/plain,*/*", ...headers },
      timeout: 15000,
    }, response => {
      const status = Number(response.statusCode || 0);
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        const next = new URL(response.headers.location, parsed).toString();
        fetchRemote(next, maxBytes, headers, redirects + 1).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`外部来源请求失败 (HTTP ${status})`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", chunk => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxBytes) {
          request.destroy(new Error(`外部来源内容超过 ${Math.round(maxBytes / 1024)}KB 限制`));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => resolve({
        body: Buffer.concat(chunks),
        contentType: String(response.headers["content-type"] || ""),
        finalUrl: parsed.toString(),
      }));
    });
    request.on("timeout", () => request.destroy(new Error("外部来源请求超时")));
    request.on("error", reject);
  });
}

export function parseSkillMarkdown(content: string, fallbackName = "", fallbackDescription = "") {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter = match?.[1] || "";
  const readField = (name: string) => {
    const field = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "mi"))?.[1]?.trim() || "";
    return field.replace(/^['"]|['"]$/g, "");
  };
  return {
    name: readField("name") || fallbackName,
    description: readField("description") || fallbackDescription,
    prompt: match ? text.slice(match[0].length).trim() : text.trim(),
    content: text,
  };
}

function ensureSkillFrontmatter(content: string, name: string, description: string) {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description || `CCM installed skill: ${name}`)}\n---\n\n${text.trim()}\n`;
  }
  let frontmatter = match[1];
  if (/^name:/mi.test(frontmatter)) frontmatter = frontmatter.replace(/^name:\s*.*$/mi, `name: ${JSON.stringify(name)}`);
  else frontmatter = `name: ${JSON.stringify(name)}\n${frontmatter}`;
  if (/^description:/mi.test(frontmatter)) {
    frontmatter = frontmatter.replace(/^description:\s*.*$/mi, `description: ${JSON.stringify(description || `CCM installed skill: ${name}`)}`);
  } else {
    frontmatter = `${frontmatter}\ndescription: ${JSON.stringify(description || `CCM installed skill: ${name}`)}`;
  }
  return `---\n${frontmatter.trim()}\n---\n\n${text.slice(match[0].length).trim()}\n`;
}

export function parseGithubSkillSource(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    let ref = "";
    let subpath = "";
    if (["tree", "blob"].includes(parts[2])) {
      ref = parts[3] || "";
      subpath = parts.slice(4).join("/");
      if (parts[2] === "blob" && path.posix.basename(subpath).toLowerCase() === "skill.md") subpath = path.posix.dirname(subpath);
    }
    return {
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
      ref,
      subpath: subpath === "." ? "" : subpath,
      repository: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

function findSkillDirectories(root: string, depth = 0): string[] {
  if (depth > 5) return [];
  if (fs.existsSync(path.join(root, "SKILL.md"))) return [root];
  const result: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".git" || entry.name === "node_modules") continue;
    result.push(...findSkillDirectories(path.join(root, entry.name), depth + 1));
    if (result.length > 30) break;
  }
  return result;
}

export function validateSkillDirectory(root: string) {
  const skillFile = path.join(root, "SKILL.md");
  if (!fs.existsSync(skillFile)) throw new Error("Skill 包中未找到 SKILL.md");
  let files = 0;
  let totalBytes = 0;
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error("Skill 包不允许包含符号链接");
      if (stat.isDirectory()) {
        if (entry.name !== ".git") walk(file);
        continue;
      }
      files += 1;
      totalBytes += stat.size;
      if (files > MAX_SKILL_PACKAGE_FILES) throw new Error(`Skill 包文件数超过 ${MAX_SKILL_PACKAGE_FILES}`);
      if (stat.size > MAX_SKILL_FILE_BYTES) throw new Error(`Skill 包文件 ${entry.name} 超过大小限制`);
      if (totalBytes > MAX_SKILL_PACKAGE_BYTES) throw new Error("Skill 包总体积超过 10MB");
    }
  };
  walk(root);
  return { files, totalBytes };
}

export async function cloneGithubSkill(item: any, staging: string) {
  const github = parseGithubSkillSource(item.sourceUrl || item.downloadUrl);
  if (!github) throw new Error("GitHub Skill 来源 URL 无效");
  await assertSafeHttpsUrl(github.cloneUrl);
  const checkout = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-skill-git-"));
  try {
    const args = ["clone", "--depth", "1", "--no-tags"];
    if (github.ref && !["head", "default"].includes(github.ref.toLowerCase())) args.push("--branch", github.ref);
    args.push(github.cloneUrl, checkout);
    await execFileAsync("git", args, { timeout: 120000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    const requested = github.subpath ? path.resolve(checkout, github.subpath) : checkout;
    if (!isPathInside(checkout, requested) || !fs.existsSync(requested)) throw new Error("GitHub Skill 子目录不存在");
    const candidates = findSkillDirectories(requested);
    if (!candidates.length) throw new Error("GitHub 仓库中未找到 SKILL.md");
    const matched = candidates.find(candidate => safeSlug(path.basename(candidate)) === safeSlug(item.name)) || candidates[0];
    validateSkillDirectory(matched);
    fs.cpSync(matched, staging, { recursive: true, dereference: false, filter: file => path.basename(file) !== ".git" });
  } finally {
    fs.rmSync(checkout, { recursive: true, force: true });
  }
}

export async function stageSkillPackage(item: any, skillPackagesDir = SKILL_PACKAGES_DIR) {
  assertCcmInternalSkillMutable(item?.name, "从外部来源安装或覆盖");
  fs.mkdirSync(skillPackagesDir, { recursive: true });
  const staging = path.join(skillPackagesDir, `.staging-${safeSlug(item.name)}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(staging, { recursive: true });
  try {
    if (item.prompt) {
      fs.writeFileSync(path.join(staging, "SKILL.md"), String(item.prompt || ""), "utf-8");
    } else if (parseGithubSkillSource(item.sourceUrl || item.downloadUrl)) {
      await cloneGithubSkill(item, staging);
    } else if (item.downloadUrl || /^https:\/\//i.test(item.sourceUrl || "")) {
      const remote = await fetchRemote(item.downloadUrl || item.sourceUrl, MAX_SKILL_FILE_BYTES);
      fs.writeFileSync(path.join(staging, "SKILL.md"), remote.body);
    }
    const skillFile = path.join(staging, "SKILL.md");
    const parsed = parseSkillMarkdown(fs.readFileSync(skillFile, "utf-8"), item.name, item.description);
    const normalizedContent = ensureSkillFrontmatter(parsed.content, item.name, item.description || parsed.description);
    fs.writeFileSync(skillFile, normalizedContent, "utf-8");
    const packageStats = validateSkillDirectory(staging);
    return {
      staging,
      skillFile,
      parsed: parseSkillMarkdown(normalizedContent, item.name, item.description),
      checksum: sha256(normalizedContent),
      packageStats,
    };
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

export function installStagedPackage(staging: string, name: string, skillPackagesDir = SKILL_PACKAGES_DIR) {
  assertCcmInternalSkillMutable(name, "从外部来源安装或覆盖");
  const target = path.join(skillPackagesDir, safeSlug(name));
  if (!isPathInside(skillPackagesDir, target)) throw new Error("Skill 安装路径无效");
  const backup = `${target}.backup-${process.pid}-${Date.now()}`;
  if (fs.existsSync(target)) fs.renameSync(target, backup);
  try {
    fs.renameSync(staging, target);
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
    return target;
  } catch (error) {
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    if (fs.existsSync(backup)) fs.renameSync(backup, target);
    throw error;
  }
}

export function localMarketplaceItems() {
  const source: MarketplaceSource = { id: "ccm-official", label: "CCM Official", kind: "builtin", trust: "official" };
  const bundledFeishuEntry = [
    path.resolve(__dirname, "../../../mcp-feishu/dist/index.js"),
    path.join(process.cwd(), "ccm-package", "mcp-feishu", "dist", "index.js"),
    path.join(CCM_DIR, "ccm", "ccm-package", "mcp-feishu", "dist", "index.js"),
  ].find(candidate => fs.existsSync(candidate))
    || path.resolve(__dirname, "../../../mcp-feishu/dist/index.js");
  const filesystemRoot = path.join(CCM_DIR, "shared");
  return [
    normalizeMarketplaceItem({
      name: "mcp-feishu",
      type: "mcp",
      description: "Feishu collaboration connector for messages, task updates, and online documents.",
      command: "node",
      args: [bundledFeishuEntry],
      env: "FEISHU_APP_ID=your_app_id\nFEISHU_APP_SECRET=your_app_secret",
      author: "CC-Connect",
      version: "1.0.2",
    }, source),
    normalizeMarketplaceItem({
      name: "filesystem-mcp",
      type: "mcp",
      description: "Filesystem MCP server scoped to an explicit directory.",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", filesystemRoot],
      author: "Model Context Protocol",
      version: "1.1.0",
    }, source),
    normalizeMarketplaceItem({
      name: "fetch-web-mcp",
      type: "mcp",
      description: "Fetch public web content and convert it into model-friendly text.",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-fetch"],
      author: "Model Context Protocol",
      version: "1.0.0",
    }, source),
    normalizeMarketplaceItem({
      name: "code-safety-auditor",
      type: "skill",
      description: "Review code for authorization, injection, resource leaks, and security regressions.",
      prompt: "Review the supplied code as a senior application security engineer. Check authorization boundaries, input validation, injection risks, secret handling, async resource cleanup, and missing security tests. Return prioritized findings with concrete fixes.",
      author: "CC-Connect",
      version: "2.2.0",
    }, source),
    normalizeMarketplaceItem({
      name: "code-review",
      type: "skill",
      description: "Review code changes for correctness bugs, regressions, missing tests, and maintainability risks.",
      prompt: "Review the supplied code or diff as a senior software engineer. Prioritize correctness bugs, behavioral regressions, authorization mistakes, data loss risks, concurrency issues, and missing tests. Return findings first, ordered by severity, with concrete file or symbol references when available. If no issues are found, say that clearly and list any residual test gaps.",
      author: "CC-Connect",
      version: "1.0.0",
    }, source),
    normalizeMarketplaceItem({
      name: "frontend-design",
      type: "skill",
      description: "Design and review production-grade frontend UI with strong layout, interaction, and accessibility judgment.",
      prompt: "Use this skill for frontend UI design, implementation review, or redesign work. Focus on task-first workflows, responsive layout, visual hierarchy, accessibility, interaction states, and consistency with the existing design system. Avoid generic landing-page filler; provide concrete component, layout, and styling guidance tailored to the product context.",
      author: "CC-Connect",
      version: "1.0.0",
    }, source),
  ];
}

