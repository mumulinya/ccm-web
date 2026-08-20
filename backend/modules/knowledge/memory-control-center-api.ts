// Behavior-freeze extraction from memory-control-center.ts.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_CONTEXT_WINDOW_TOKENS } from "../../system/context-budget";
import { CCM_DIR, GROUP_MESSAGES_DIR } from "../../core/utils";
import { withFileLock, writeJsonAtomic as writeJsonAtomicDurable } from "../../core/atomic-json-file";
import { getConfigs, loadMcpTools, loadProjectConfigs, loadSkills, loadTasks, saveTasks } from "../../core/db";
import {
  inspectGroupSessionMemoryExtractionLease,
  readGroupSessionMemoryExtractionState,
} from "../collaboration/group-session-memory-extraction";
import {
  inspectGroupSessionMemoryModelExtractionArtifactRetention,
  readGroupSessionMemoryTypedMemoryRetryState,
  retryGroupSessionModelExtractionTypedMemory,
  readGroupSessionMemoryModelExtractionHistory,
  replayGroupSessionMemoryModelExtraction,
  readGroupSessionMemoryCustomPromptProfile,
  readGroupSessionMemoryCustomTemplateProfile,
  runGroupSessionMemoryModelExtractionNow,
  runGroupSessionMemoryModelExtractionArtifactRetention,
  saveGroupSessionMemoryCustomPrompt,
  saveGroupSessionMemoryCustomTemplate,
  verifyGroupSessionMemoryDirectWriteSuppressionReceipt,
  verifyGroupSessionMemoryFactSupersessionGraph,
  verifyGroupSessionMemoryModelExtractionReceipt,
  verifyGroupSessionMemoryModelExtractionReplayEvidence,
} from "../collaboration/group-session-memory-model-extraction";
import {
  cancelPreparedDirectAgentDispatch,
  listDirectAgentDispatchSpool,
  pruneDirectAgentDispatchTerminalPair,
} from "../../agents/direct-dispatch-spool";
import {
  listTypedMemoryDispatchWal,
  transitionTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  verifyTypedMemoryDispatchWal,
} from "../collaboration/typed-memory-dispatch-wal";
import { readGroupPostTurnSummaries } from "../collaboration/group-post-turn-summary";
import {
  GROUP_SESSION_LIFECYCLE_HEAD_DIR,
  readGroupSessionLifecycleCommitChain,
  readGroupSessionLifecycleHead,
  readGroupSessionLifecycleJournal,
  verifyGroupSessionLifecycleHead,
} from "../collaboration/group-session-lifecycle-head";
import { MemoryScope, CONTROL_DIR, AUDIT_FILE, GROUP_MEMORY_DIR, GROUP_SESSION_SCOPED_MEMORY_DIR, PROJECT_MEMORY_DIR, GLOBAL_MEMORY_FILE, now, readJson, hash, cleanId, readGroupSessionMemorySnapshotForCenter, readGroupToolContinuitySnapshotForCenter, appendAudit } from "./memory-control-center-types";
import { getMemoryItemId, itemText, scopeControls, applyMemoryControls } from "./memory-control-center-controls";
import { readContextSourceContinuity } from "../../system/main-agent-context-source-continuity";
import {
  estimateGroupMessageTokens,
  verifyGroupTimeBasedToolResultProjectionReceipt,
  verifyGroupPostCompactFileRestoreDedupReceipt,
  verifyGroupPostCompactInvokedSkillAttachmentReceipt,
  verifyGroupPostCompactPlanAttachmentReceipt,
  verifyGroupPostCompactDynamicContextDeltaReceipt,
  verifyGroupPostCompactTaskStatusProjectionReceipt,
} from "../collaboration/group-compaction-projections";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "../collaboration/group-compaction-strategy";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import { readGroupCompactionActivity } from "../collaboration/group-compaction-activity";
import { buildGroupApiMicrocompactNativeApplyProofSummary } from "../collaboration/group-compact-file-references";
import { buildAutoCompactCircuitDisplayState } from "../collaboration/group-memory-auto-compact-circuit-policy";
import { readGroupMainContextUsageBaseline } from "../collaboration/group-prompt-cache-break-detection";
import { verifySessionModelContentReplacementReceipt, verifySessionModelMicroCompactReceipt } from "../../system/session-model-context";
import { readLatestProviderNeutralContextCacheState } from "../../system/provider-neutral-context-cache";
import { readProviderCacheCapabilityState } from "../../system/provider-cache-capability-registry";
import { readContextEngineTrends } from "../../system/context-engine-observability";
import { listContextEngineRecoveryPoints } from "../../system/context-engine-recovery";
import { isUserMcpToolDefinition, selectUserMcpToolDefinitions } from "../../system/session-context-tool-buckets";
import { projectUnifiedCompactionReceipt, projectUnifiedSessionCompactionState } from "../../system/unified-session-compaction";
import { modelVisiblePayloadAccounting } from "../../system/session-compaction-core";

const MODEL_VISIBLE_FIXED_BUCKETS = [
  "system",
  "tools",
  "rules",
  "skills",
  "mcpTools",
  "subagentDefinitions",
  "workerBootstrap",
  "hydratedContext",
  "providerEnvelope",
];

function cleanAvailableContextName(value: any, max = 120) {
  return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}

function normalizeAvailableContextNames(value: any) {
  const rows = Array.isArray(value) ? value : [];
  return [...new Set(rows.map((item: any) => cleanAvailableContextName(
    item && typeof item === "object"
      ? item.name || item.grant || item.server || item.tool
      : item,
  )).filter(Boolean))].slice(0, 100);
}

function scopeConfiguredContextTools(scope: MemoryScope, scopeId: string, memory: any) {
  try {
    if (scope === "global_session" || scope === "global") {
      const store = require("../global/global-agent-tool-authorization").loadGlobalAgentToolAuthorization();
      return store?.tools || {};
    }
    if (scope === "group") {
      const groupId = parseGroupMemoryScopeId(scopeId, memory).groupId;
      const group = require("../collaboration/storage").loadGroups()
        .find((item: any) => String(item?.id || "") === String(groupId || ""));
      return group?.tools || {};
    }
    if (scope === "project" || scope === "project_session") {
      const separator = scopeId.indexOf("::");
      const projectId = cleanId(scope === "project_session" && separator >= 0 ? scopeId.slice(0, separator) : memory?.project || scopeId);
      return loadProjectConfigs()?.[projectId]?.tools || {};
    }
  } catch {}
  return {};
}

function estimateAvailableContextTokens(value: any) {
  if (!value) return 0;
  try {
    return estimateGroupMessageTokens({ role: "system", content: typeof value === "string" ? value : JSON.stringify(value) });
  } catch {
    return 0;
  }
}

function buildAvailableContextCatalog(scope: MemoryScope, scopeId: string, memory: any, modelVisiblePayload: any) {
  const configured = scopeConfiguredContextTools(scope, scopeId, memory);
  const configuredMcp = normalizeAvailableContextNames(configured?.mcp);
  const configuredSkills = normalizeAvailableContextNames(configured?.skill);
  const mcpCatalog = loadMcpTools().filter((item: any) => item?.enabled !== false);
  const skillCatalog = loadSkills().filter((item: any) => item?.enabled !== false);
  const mcpByName = new Map(mcpCatalog.map((item: any) => [String(item?.name || ""), item]));
  const skillByName = new Map(skillCatalog.map((item: any) => [String(item?.name || ""), item]));
  const breakdown = modelVisiblePayload?.tokenBreakdown || modelVisiblePayload?.token_breakdown || {};
  const mcpLoadedTokens = Math.max(0, Number(breakdown.mcpTools ?? breakdown.mcp ?? 0));
  const skillLoadedTokens = Math.max(0, Number(breakdown.skills || 0));
  const loadedEvidence = modelVisiblePayload?.loadedContextItems || modelVisiblePayload?.loaded_context_items || {};
  const loadedMcp = Array.isArray(loadedEvidence?.mcp) ? loadedEvidence.mcp : [];
  const loadedSkills = Array.isArray(loadedEvidence?.skills) ? loadedEvidence.skills : [];
  const invocations = Array.isArray(loadedEvidence?.invocations) ? loadedEvidence.invocations : [];
  const evidenceAvailable = loadedEvidence?.schema === "ccm-loaded-context-items-v1";
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  const boundary = memory?.boundary || memory?.compactBoundary || memory?.compact_boundary || {};
  const restoreReceipt = compaction?.dynamicContextRestoreReceipt
    || compaction?.dynamic_context_restore_receipt
    || boundary?.dynamicContextRestoreReceipt
    || boundary?.post_compact_restore?.dynamicContextRestoreReceipt
    || boundary?.post_compact_restore?.dynamic_context_restore_receipt
    || null;
  const normalizedAliases = (item: any) => Array.from(new Set([
    String(item?.name || ""),
    ...(Array.isArray(item?.aliases) ? item.aliases.map((value: any) => String(value || "")) : []),
  ].map(value => value.trim().toLowerCase()).filter(Boolean)));
  const evidenceMatches = (item: any, name: string, kind: "mcp" | "skill") => {
    if (String(item?.kind || kind) !== kind) return false;
    const target = String(name || "").trim().toLowerCase();
    if (!target) return false;
    return normalizedAliases(item).some(alias => alias === target || (kind === "mcp" && (alias.startsWith(`${target}/`) || target.startsWith(`${alias}/`))));
  };
  const decorateEvidence = (name: string, kind: "mcp" | "skill", available: boolean, configured = true) => {
    const loadedRows = kind === "mcp" ? loadedMcp : loadedSkills;
    const loaded = loadedRows.filter((item: any) => evidenceMatches(item, name, kind));
    const invoked = invocations.filter((item: any) => evidenceMatches(item, name, kind));
    return {
      state: !available && !loaded.length ? "unavailable" : invoked.length ? "invoked" : loaded.length ? "loaded" : "available",
      configured,
      evidenceStatus: evidenceAvailable ? "exact" : "unproven",
      loadLevels: Array.from(new Set(loaded.map((item: any) => String(item?.loadLevel || "")).filter(Boolean))),
      loadSources: Array.from(new Set(loaded.map((item: any) => String(item?.loadSource || item?.load_source || "")).filter(Boolean))),
      loadedTokens: loaded.reduce((sum: number, item: any) => sum + Math.max(0, Number(item?.tokens || item?.tokenCount || item?.token_count || 0)), 0),
      dropReasons: Array.from(new Set(loaded.map((item: any) => String(item?.dropReason || item?.drop_reason || "")).filter(Boolean))),
      invocationCount: invoked.length,
      invocationSucceeded: invoked.some((item: any) => item?.ok === true),
      loadedChecksum: String(loadedEvidence?.checksum || modelVisiblePayload?.loadedContextItemsChecksum || modelVisiblePayload?.loaded_context_items_checksum || ""),
    };
  };
  const mcp = configuredMcp.map((grant: string) => {
    const server = grant.split("/")[0];
    const item: any = mcpByName.get(server) || null;
    return {
      name: grant,
      ...decorateEvidence(grant, "mcp", !!item),
      estimatedTokens: estimateAvailableContextTokens({
        name: grant,
        description: item?.description || "",
        tools: Array.isArray(item?.tools) ? item.tools : [],
      }),
    };
  });
  const skills = configuredSkills.map((name: string) => {
    const item: any = skillByName.get(name) || null;
    return {
      name,
      ...decorateEvidence(name, "skill", !!item),
      estimatedTokens: estimateAvailableContextTokens({
        name,
        description: item?.description || "",
        content: item?.content || item?.prompt || item?.instructions || "",
      }),
    };
  });
  for (const row of loadedMcp) {
    const name = String(row?.name || "").trim();
    if (!name || mcp.some((item: any) => evidenceMatches(row, item.name, "mcp"))) continue;
    if (!isUserMcpToolDefinition({ name, canonicalName: name, server: row?.server, aliases: row?.aliases })) continue;
    mcp.push({
      name,
      ...decorateEvidence(name, "mcp", true, false),
      estimatedTokens: 0,
    });
  }
  for (const row of loadedSkills) {
    const name = String(row?.name || "").trim();
    if (!name || skills.some((item: any) => evidenceMatches(row, item.name, "skill"))) continue;
    skills.push({
      name,
      ...decorateEvidence(name, "skill", true, false),
      estimatedTokens: 0,
    });
  }
  return {
    schema: "ccm-context-available-catalog-v2",
    accounting: "per_item_model_payload_evidence",
    postCompactRestore: restoreReceipt ? {
      status: String(restoreReceipt.status || ""),
      restoredSkillTokens: Math.max(0, Number(restoreReceipt.restoredSkillTokens || 0)),
      restoredMcpSchemaTokens: Math.max(0, Number(restoreReceipt.restoredMcpSchemaTokens || 0)),
      restoredSkillNames: Array.isArray(restoreReceipt.restoredSkillNames) ? restoreReceipt.restoredSkillNames : [],
      loadedToolNames: Array.isArray(restoreReceipt.loadedToolNames) ? restoreReceipt.loadedToolNames : [],
      dropped: Array.isArray(restoreReceipt.dropped) ? restoreReceipt.dropped : [],
      checksum: String(restoreReceipt.checksum || ""),
    } : null,
    mcp: {
      configured: mcp.filter((item: any) => item.configured !== false).length,
      available: mcp.filter((item: any) => item.state !== "unavailable").length,
      loaded: mcp.filter((item: any) => ["loaded", "invoked"].includes(item.state)).length,
      invoked: mcp.filter((item: any) => item.state === "invoked").length,
      loadedThisTurn: mcp.some((item: any) => ["loaded", "invoked"].includes(item.state)),
      loadedTokens: mcpLoadedTokens,
      estimatedTokensIfLoaded: mcp.reduce((sum: number, item: any) => sum + item.estimatedTokens, 0),
      items: mcp,
    },
    skills: {
      configured: skills.filter((item: any) => item.configured !== false).length,
      available: skills.filter((item: any) => item.state !== "unavailable").length,
      loaded: skills.filter((item: any) => ["loaded", "invoked"].includes(item.state)).length,
      invoked: skills.filter((item: any) => item.state === "invoked").length,
      loadedThisTurn: skills.some((item: any) => ["loaded", "invoked"].includes(item.state)),
      loadedTokens: skillLoadedTokens,
      estimatedTokensIfLoaded: skills.reduce((sum: number, item: any) => sum + item.estimatedTokens, 0),
      items: skills,
    },
  };
}

function modelVisiblePayloadFixedTokens(payload: any) {
  const breakdown = payload?.tokenBreakdown || payload?.token_breakdown;
  if (!breakdown || typeof breakdown !== "object") return 0;
  return MODEL_VISIBLE_FIXED_BUCKETS.reduce((sum, key) => sum + Math.max(0, Number(breakdown[key] || 0)), 0);
}

export function isCompleteMemoryCenterContextAccounting(payload: any) {
  const breakdown = payload?.tokenBreakdown || payload?.token_breakdown;
  const totalTokens = Number(payload?.totalTokens ?? payload?.total_tokens ?? 0);
  return !!breakdown
    && typeof breakdown === "object"
    && Number.isFinite(totalTokens)
    && totalTokens > 0
    && modelVisiblePayloadFixedTokens(payload) > 0;
}

export function selectMemoryCenterContextAccounting(input: {
  scope: MemoryScope;
  stored?: any;
  provider?: any;
  rebuilt?: any;
}) {
  const stored = input.stored || null;
  const provider = input.provider || null;
  const rebuilt = input.rebuilt || null;
  if (input.scope === "group" && isCompleteMemoryCenterContextAccounting(provider)) {
    return { payload: provider, source: "provider_payload_accounting" };
  }
  if (isCompleteMemoryCenterContextAccounting(stored)) {
    return { payload: stored, source: "stored_model_visible_payload" };
  }
  if (isCompleteMemoryCenterContextAccounting(rebuilt)) {
    return { payload: rebuilt, source: "current_model_visible_payload_projection" };
  }
  if (rebuilt) return { payload: rebuilt, source: "current_model_visible_payload_projection" };
  if (provider) return { payload: provider, source: "provider_payload_accounting_partial" };
  if (stored) return { payload: stored, source: "stored_model_visible_payload_partial" };
  return { payload: null, source: "" };
}

function latestGroupContextAccounting(scopeId: string, memory: any) {
  try {
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    const baseline = readGroupMainContextUsageBaseline(exact.groupId, exact.sessionId);
    const event = baseline?.valid === true ? baseline.event : null;
    if (!event?.token_breakdown || typeof event.token_breakdown !== "object") return null;
    return {
      event,
      payload: {
        schema: "ccm-model-visible-payload-accounting-v1",
        scope: "group",
        sessionId: `${exact.groupId}:${exact.sessionId}`,
        tokenBreakdown: event.token_breakdown,
        totalTokens: Number(event.accounting_total_tokens || event.estimated_payload_tokens || 0),
        payloadChecksum: String(event.payload_checksum || ""),
        fixedContextChecksum: String(event.fixed_context_checksum || ""),
        contentStored: false,
      },
      updatedAt: String(event.recorded_at || ""),
    };
  } catch {
    return null;
  }
}

function rebuildCurrentGroupContextAccounting(scopeId: string, memory: any) {
  try {
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    if (!exact.groupId || !exact.sessionId.startsWith("gcs_")) return null;
    const storage = require("../collaboration/storage") as typeof import("../collaboration/storage");
    const group = storage.loadGroups().find((item: any) => String(item?.id || "") === exact.groupId);
    if (!group) return null;
    if (!(storage.getGroupMessages(exact.groupId, exact.sessionId) || []).length) return null;
    const projection = require("../collaboration/group-session-model-context") as typeof import("../collaboration/group-session-model-context");
    const routing = require("../collaboration/group-orchestrator-routing") as typeof import("../collaboration/group-orchestrator-routing");
    const core = require("../../system/session-compaction-core") as typeof import("../../system/session-compaction-core");
    const context = projection.buildExactGroupSessionModelContextPacket(exact.groupId, { groupSessionId: exact.sessionId }).rendered;
    const measurement = routing.measureGroupMainAgentPayload({
      group,
      message: "",
      context,
      source: "memory-center-live-accounting",
      groupSessionId: exact.sessionId,
    });
    const payload = core.modelVisiblePayloadAccounting(measurement.snapshot);
    if (!payload?.tokenBreakdown || payload.totalTokens <= 0) return null;
    const transcriptFile = storage.getGroupChatSessionMessagesFile(exact.groupId, exact.sessionId);
    const updatedAtMs = Math.max(
      fs.existsSync(transcriptFile) ? fs.statSync(transcriptFile).mtimeMs : 0,
      fs.existsSync(path.join(CCM_DIR, "groups.json")) ? fs.statSync(path.join(CCM_DIR, "groups.json")).mtimeMs : 0,
    );
    return {
      payload,
      updatedAt: updatedAtMs > 0 ? new Date(updatedAtMs).toISOString() : "",
      source: "current_model_visible_payload_rebuild",
    };
  } catch {
    return null;
  }
}

function rebuildCurrentSessionContextAccounting(scope: MemoryScope, scopeId: string, memory: any) {
  try {
    const core = require("../../system/session-compaction-core") as typeof import("../../system/session-compaction-core");
    if (scope === "global_session") {
      const sessionId = scopeId.replace(/^session:/, "");
      const globalMemory = require("../../agents/global/memory") as typeof import("../../agents/global/memory");
      const transcript = globalMemory.loadGlobalAgentTranscript(sessionId);
      if (!(transcript?.messages || []).length) return null;
      const globalAgent = require("../global/global-agent") as typeof import("../global/global-agent");
      const context = globalAgent.buildAgenticContext("", sessionId, {
        includeSessionContinuity: true,
        recordMemoryMetric: false,
        source: "memory-center-live-accounting",
      });
      const compaction = memory?.compaction?.v2 || memory?.compaction || {};
      const globalToolSpecs = require("../../agents/global/global-agent-run-store").GLOBAL_AGENT_TOOL_SPECS;
      const snapshot = core.buildModelVisiblePayloadSnapshot({
        scope: "global",
        sessionId,
        system: [{ role: "system", content: context }],
        tools: globalToolSpecs,
        activeSummary: memory?.unifiedSessionSummary || compaction.activeSummary || compaction.active_summary || null,
        recentMessages: recentSessionMessagesForMemoryCenter(scope, scopeId, memory),
        contextComponents: {
          rules: {
            memory_context_boundary: context.memory_context_boundary,
            context_source_manifest: context.context_source_manifest,
            authorization_readiness: context.tools?.authorization_readiness,
          },
          skills: context.tools?.skills || [],
          mcpTools: selectUserMcpToolDefinitions(context.tools?.mcp || []),
          subagentDefinitions: { projects: context.projects || [], groups: context.groups || [] },
        },
      });
      const payload = core.modelVisiblePayloadAccounting(snapshot);
      if (!payload?.tokenBreakdown || payload.totalTokens <= 0) return null;
      const updatedAt = String(memory?.transcriptUpdatedAt || transcript?.updatedAt || memory?.updatedAt || "");
      return { payload, updatedAt, source: "current_model_visible_payload_projection" };
    }
    if (scope === "project_session") {
      const separator = scopeId.indexOf("::");
      const project = cleanId(separator >= 0 ? scopeId.slice(0, separator) : "");
      const projectSessionId = cleanId(separator >= 0 ? scopeId.slice(separator + 2) : "");
      if (!project || !projectSessionId) return null;
      const projectCompaction = require("../projects/project-session-compaction") as typeof import("../projects/project-session-compaction");
      const projection = projectCompaction.buildProjectSessionModelContextProjection(project, projectSessionId);
      if (!projection) return null;
      const authorization = require("../../tools/tool-authorization") as typeof import("../../tools/tool-authorization");
      const manager = require("../../tools/tool-manager") as typeof import("../../tools/tool-manager");
      const configured = authorization.normalizeToolAuthorization(loadProjectConfigs()?.[project]?.tools || {});
      const catalog = manager.toolManager.getScopedToolCatalog({
        mcp: configured.mcp,
        skill: configured.skill,
        auditContext: { runtime: "project-main-agent", project, source: "memory-center-live-accounting" },
      });
      let projectMemory: any = null;
      try {
        projectMemory = require("../../projects/memory").buildProjectMemoryPacket(project, { query: "" });
      } catch {}
      const projectConfig = getConfigs().find((item: any) => String(item?.name || "") === project) || null;
      const rules = {
        scope: "exact_project_session_only",
        project,
        projectSessionId,
        mainAgent: "plan_delegate_test_accept",
        crossProjectAccess: false,
        groupContextIncluded: false,
      };
      const snapshot = core.buildModelVisiblePayloadSnapshot({
        scope: "project",
        sessionId: `${project}:${projectSessionId}`,
        system: [{ role: "system", content: { rules, projectMemory, authorizedSkills: catalog.skills } }],
        tools: catalog.tools,
        activeSummary: projection.summary || null,
        recentMessages: projection.visibleMessages,
        contextComponents: {
          rules,
          skills: catalog.skills,
          mcpTools: selectUserMcpToolDefinitions(catalog.tools),
          subagentDefinitions: projectConfig ? [{ project, agent: projectConfig.agent || projectConfig.agent_type || "" }] : [],
        },
      });
      const payload = core.modelVisiblePayloadAccounting(snapshot);
      if (!payload?.tokenBreakdown || payload.totalTokens <= 0) return null;
      const file = scopeFile(scope, scopeId);
      const updatedAtMs = fs.existsSync(file) ? fs.statSync(file).mtimeMs : Date.now();
      return { payload, updatedAt: new Date(updatedAtMs).toISOString(), source: "current_model_visible_payload_projection" };
    }
  } catch {}
  return null;
}

function currentCompactionActivity(scope: MemoryScope, scopeId: string, memory: any) {
  try {
    if (scope === "group") {
      const exact = parseGroupMemoryScopeId(scopeId, memory);
      const ledger = readGroupCompactionActivity(exact.groupId, exact.sessionId);
      const row = ledger?.current;
      const active = row?.status === "running" && Date.parse(String(row?.lease_expires_at || "")) > Date.now();
      return active ? {
        active: true,
        status: "running",
        stage: String(row.stage || "model_compaction"),
        reason: String(row.reason || ""),
        startedAt: String(row.started_at || ""),
        updatedAt: String(row.heartbeat_at || row.started_at || ""),
      } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: String(ledger?.updated_at || "") };
    }
    if (scope === "global_session") {
      return require("../../agents/global/memory").getGlobalAgentSessionCompactionActivity(scopeId.replace(/^session:/, ""));
    }
    if (scope === "project_session") {
      const separator = scopeId.indexOf("::");
      if (separator > 0) {
        return require("../projects/project-session-compaction").getProjectSessionCompactionActivity(
          scopeId.slice(0, separator),
          scopeId.slice(separator + 2),
        );
      }
    }
  } catch {}
  return { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "" };
}

export function listJsonFiles(dir: string) {
  try { return fs.readdirSync(dir).filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-")).map(name => path.join(dir, name)); } catch { return []; }
}


export function readMemoryFile(file: string) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
}


export function groupLabelMap() {
  const groups = readJson(path.join(CCM_DIR, "groups.json"), []);
  return new Map((Array.isArray(groups) ? groups : groups?.groups || []).map((item: any) => [String(item.id), item.name || item.title || item.id]));
}


export function projectFile(project: string) {
  return listJsonFiles(PROJECT_MEMORY_DIR).find(file => readMemoryFile(file)?.project === project) || "";
}


export function parseGroupMemoryScopeId(scopeId: string, memory: any = null) {
  const raw = String(scopeId || "").trim();
  const separator = raw.indexOf("::");
  const explicitGroupId = separator >= 0 ? raw.slice(0, separator) : raw;
  const explicitSessionId = separator >= 0 ? raw.slice(separator + 2) : "";
  const groupId = String(memory?.groupId || explicitGroupId || "").trim();
  const sessionId = String(memory?.groupSessionId || explicitSessionId || "default").trim() || "default";
  return {
    groupId,
    sessionId,
    scopeId: sessionId === "default" ? groupId : `${groupId}::${sessionId}`,
  };
}


export function listGroupSessionMemoryFiles() {
  const files: string[] = [];
  try {
    for (const groupEntry of fs.readdirSync(GROUP_SESSION_SCOPED_MEMORY_DIR, { withFileTypes: true })) {
      if (!groupEntry.isDirectory()) continue;
      const groupDir = path.join(GROUP_SESSION_SCOPED_MEMORY_DIR, groupEntry.name);
      for (const name of fs.readdirSync(groupDir)) {
        if (name.endsWith(".json") && !name.endsWith(".bak") && !name.includes(".pre-rollback-")) files.push(path.join(groupDir, name));
      }
    }
  } catch {}
  return files;
}


export function listGroupMemoryScopes() {
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const file of [...listJsonFiles(GROUP_MEMORY_DIR), ...listGroupSessionMemoryFiles()]) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const parts = parseGroupMemoryScopeId(String(memory.groupId || path.basename(file, ".json")), memory);
    if (!parts.groupId || seen.has(parts.scopeId)) continue;
    seen.add(parts.scopeId);
    rows.push({ ...parts, file, memory });
  }
  return rows;
}


export function listMemoryCenterGroupSessionScopes() {
  const labels = groupLabelMap();
  const stored = listGroupMemoryScopes();
  const storedByScope = new Map(stored.map((entry: any) => [entry.scopeId, entry]));
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const [groupId, groupLabel] of labels.entries()) {
    let sessions: any[] = [];
    try { sessions = require("../collaboration/storage").listGroupChatSessions(groupId).sessions || []; } catch {}
    for (const session of sessions) {
      const sessionId = String(session.id || "");
      if (!sessionId) continue;
      const scopeId = `${groupId}::${sessionId}`;
      const entry: any = storedByScope.get(scopeId);
      const memory = entry?.memory || { groupId, groupSessionId: sessionId, compaction: {} };
      rows.push({
        ...memorySummary("group", scopeId, memory, String(session.title || sessionId)),
        groupId,
        groupSessionId: sessionId,
        groupLabel: String(groupLabel || groupId),
        sessionLabel: String(session.title || sessionId),
        memoryKind: "session",
        hasMemoryState: !!entry,
        messageCount: Number(session.messageCount || 0),
      });
      seen.add(scopeId);
    }
  }
  for (const entry of stored) {
    if (seen.has(entry.scopeId) || entry.sessionId === "default") continue;
    rows.push({
      ...memorySummary("group", entry.scopeId, entry.memory, groupSessionLabel(entry.groupId, entry.sessionId, labels)),
      groupId: entry.groupId,
      groupSessionId: entry.sessionId,
      groupLabel: String(labels.get(entry.groupId) || entry.groupId),
      sessionLabel: entry.sessionId,
      memoryKind: "session",
      hasMemoryState: true,
    });
  }
  return rows;
}


export function groupSessionLabel(groupId: string, sessionId: string, labels = groupLabelMap()) {
  const groupLabel = String(labels.get(groupId) || groupId);
  if (sessionId === "default") return groupLabel;
  try {
    const { listGroupChatSessions } = require("../collaboration/storage");
    const session = listGroupChatSessions(groupId).sessions.find((item: any) => String(item.id) === sessionId);
    return `${groupLabel} / ${session?.title || sessionId}`;
  } catch {
    return `${groupLabel} / ${sessionId}`;
  }
}


export function scopeFile(scope: MemoryScope, scopeId: string) {
  if (scope === "group") {
    const parts = parseGroupMemoryScopeId(scopeId);
    if (parts.sessionId === "default") return path.join(GROUP_MEMORY_DIR, `${parts.groupId}.json`);
    try {
      const { getGroupMemoryFile } = require("../collaboration/memory");
      return getGroupMemoryFile(parts.groupId, parts.sessionId);
    } catch {
      return path.join(GROUP_SESSION_SCOPED_MEMORY_DIR, cleanId(parts.groupId), `${cleanId(parts.sessionId)}.json`);
    }
  }
  if (scope === "global_session") return GLOBAL_MEMORY_FILE;
  if (scope === "project_session") {
    const separator = scopeId.indexOf("::");
    const project = cleanId(separator >= 0 ? scopeId.slice(0, separator) : "");
    const sessionId = cleanId(separator >= 0 ? scopeId.slice(separator + 2) : "");
    return project && sessionId ? path.join(CCM_DIR, "web-sessions", project, `${sessionId}.json`) : "";
  }
  if (scope === "task_agent") return path.join(CCM_DIR, "task-agent-sessions.json");
  if (scope === "project") return projectFile(scopeId);
  return GLOBAL_MEMORY_FILE;
}

export function resolveMemoryCenterTokenState(scope: MemoryScope, scopeId: string, memory: any, options: any = {}) {
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  const warning = compaction.contextPressureWarning || compaction.compactWarning || {};
  const decision = compaction.compactStrategyDecision || {};
  const config = options.config || loadOrchestratorConfig();
  const defaultCapacity = resolveGroupModelContextCapacity(config);
  const capacity = memory?.compaction?.resolved_model_capacity || compaction.resolvedModelCapacity || compaction.resolved_model_capacity || defaultCapacity;
  const modelVisiblePayload = memory?.compaction?.model_visible_payload || compaction.modelVisiblePayload || compaction.model_visible_payload || compaction.postCompactGate?.model_visible_payload || compaction.post_compact_gate?.model_visible_payload || null;
  let currentTokens = Number(compaction.tokenMeasurement?.activeTokens ?? compaction.token_measurement?.activeTokens ?? modelVisiblePayload?.totalTokens ?? compaction.postCompactTokenCount ?? memory?.providerContextUsageBaseline?.observed_context_tokens ?? 0);
  let currentMessageCount = 0;
  const measurementMethod = String(compaction.tokenMeasurement?.method || compaction.token_measurement?.method || "");
  let tokenSource = currentTokens <= 0 ? "empty"
    : measurementMethod === "latest_provider_usage_plus_new_message_estimate" ? "provider_usage_plus_estimate"
    : ["model_visible_payload_estimate", "full_prompt_estimate"].includes(measurementMethod) ? "model_visible_payload"
    : measurementMethod === "final_provider_payload_gate" ? "provider_usage"
    : "post_compact_record";
  let tokenUpdatedAt = warning.createdAt || decision.createdAt || compaction.lastPressureSampleAt || compaction.lastCompactedAt || "";
  let fallbackTokenMeasurement: any = null;
  if (scope === "project") {
    const activeDurable = (Array.isArray(memory?.durableMemories) ? memory.durableMemories : [])
      .filter((item: any) => item?.content && !["resolved", "superseded"].includes(String(item.status || "active")))
      .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .slice(0, 24);
    const projectedContext = {
      project: memory?.project || scopeId,
      workDir: memory?.workDir || "",
      architecture: memory?.architecture || "",
      techStack: memory?.techStack || [],
      durableMemories: activeDurable,
      resources: memory?.resources || {},
    };
    currentTokens = estimateGroupMessageTokens({ role: "system", content: JSON.stringify(projectedContext) });
    currentMessageCount = activeDurable.length;
    tokenSource = "project_long_term_injection_estimate";
    tokenUpdatedAt = memory?.updatedAt || tokenUpdatedAt;
  } else if (scope === "group") {
    const parts = parseGroupMemoryScopeId(scopeId, memory);
    const liveAccounting = latestGroupContextAccounting(scopeId, memory);
    const pressureUpdatedAt = String(warning.createdAt || decision.createdAt || compaction.lastPressureSampleAt || "");
    const liveAccountingIsNewest = !!liveAccounting
      && (!pressureUpdatedAt || Date.parse(liveAccounting.updatedAt) >= Date.parse(pressureUpdatedAt));
    const recordedTokens = Number(
      warning.tokenUsage
        ?? decision.activeTokensBeforeCompact
        ?? compaction.apiMicroCompactEditPlan?.activeTokens
        ?? compaction.postCompactTokenCount
        ?? 0
    );
    if (liveAccountingIsNewest && Number(liveAccounting?.event?.provider_observed_context_tokens || 0) > 0) {
      currentTokens = Number(liveAccounting.event.provider_observed_context_tokens || 0);
      currentMessageCount = Number(compaction.totalMessagesSeen || 0);
      tokenSource = "provider_usage";
      tokenUpdatedAt = liveAccounting.updatedAt;
    } else if (Number.isFinite(recordedTokens) && recordedTokens >= 0 && (warning.schema || decision.schema || compaction.apiMicroCompactEditPlan?.schema)) {
      currentTokens = recordedTokens;
      currentMessageCount = Number(warning.activeMessageCount || decision.activeMessageCount || compaction.totalMessagesSeen || 0);
      tokenSource = warning.schema ? "context_pressure_sample" : decision.schema ? "compact_strategy_sample" : "api_microcompact_sample";
    } else if (currentTokens <= 0) {
      try {
        const messages = require("../collaboration/storage").getGroupMessages(parts.groupId, parts.sessionId);
        currentTokens = messages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
        currentMessageCount = messages.length;
        tokenSource = "message_estimate";
      } catch {}
    } else {
      currentMessageCount = Number(
        (compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length
        || compaction.preservedRecentMessages
        || 0
      );
      tokenSource = String(compaction.tokenMeasurement?.source || compaction.token_measurement?.source || tokenSource);
    }
  } else if (scope === "global_session") {
    if (currentTokens <= 0) {
      try {
        const sessionId = scopeId.replace(/^session:/, "");
        const transcript = require("../../agents/global/memory").loadGlobalAgentTranscript(sessionId);
        const lastCompactedIndex = Number(compaction.lastCompactedIndex ?? memory?.lastCompactedIndex ?? -1);
        const visibleMessages = (Array.isArray(transcript?.messages) ? transcript.messages : []).slice(Math.max(0, lastCompactedIndex + 1));
        currentTokens = visibleMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
        currentMessageCount = visibleMessages.length;
        const summarySource = String(memory?.summarySource || memory?.summary_source || compaction.summarySource || compaction.summary_source || "").toLowerCase();
        if (["model", "session_memory", "session-memory"].includes(summarySource)) {
          const activeSummary = compaction.activeSummary || memory?.summary;
          if (activeSummary) currentTokens += estimateGroupMessageTokens({ role: "system", content: activeSummary });
        }
        tokenSource = "encrypted_transcript_estimate";
        tokenUpdatedAt = transcript?.updatedAt || tokenUpdatedAt;
      } catch {}
    } else {
      currentMessageCount = Number((compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length || 0);
      tokenSource = String(compaction.tokenMeasurement?.source || compaction.token_measurement?.source || tokenSource);
    }
  } else if (scope === "project_session") {
    if (currentTokens <= 0) {
      const history = Array.isArray(memory?.history)
        ? memory.history
        : Array.isArray(memory?.messages) ? memory.messages : [];
      const lastCompactedIndex = Number(compaction.lastCompactedIndex ?? compaction.last_compacted_index ?? -1);
      const visibleMessages = history.slice(Math.max(0, lastCompactedIndex + 1));
      const messageTokens = visibleMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
      const summarySource = String(
        memory?.compaction?.summary_source
        || memory?.compaction?.summarySource
        || compaction.summarySource
        || compaction.summary_source
        || ""
      ).toLowerCase();
      const activeSummary = memory?.unifiedSessionSummary || compaction.activeSummary || compaction.active_summary || null;
      const summaryTokens = activeSummary && ["model", "session_memory", "session-memory"].includes(summarySource)
        ? estimateGroupMessageTokens({ role: "system", content: activeSummary })
        : 0;
      currentTokens = messageTokens + summaryTokens;
      currentMessageCount = visibleMessages.length;
      tokenSource = "project_transcript_estimate";
      tokenUpdatedAt = String(visibleMessages.at(-1)?.timestamp || memory?.updated_at || memory?.updatedAt || tokenUpdatedAt);
      fallbackTokenMeasurement = {
        method: "project_transcript_estimate",
        source: "project_transcript_estimate",
        activeTokens: currentTokens,
        estimatedMessageTokens: messageTokens,
        estimatedSummaryTokens: summaryTokens,
      };
    } else {
      currentMessageCount = Number(
        (compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length
        || (Array.isArray(memory?.history) ? memory.history.length : 0)
      );
      tokenSource = String(compaction.tokenMeasurement?.source || compaction.token_measurement?.source || tokenSource);
    }
  }
  const autoCompactThreshold = scope === "project" ? 0 : Number(
    memory?.compaction?.auto_compact_threshold
    || compaction.autoCompactThreshold
    || compaction.auto_compact_threshold
    || warning.thresholds?.autoCompactThreshold
    || decision.triggerTokens
    || getGroupAutoCompactThreshold(config)
    || capacity.autoCompactThreshold,
  );
  const effectiveContextWindow = Number(capacity.effectiveContextWindow || capacity.effective_context_window || capacity.contextWindow || capacity.context_window || DEFAULT_CONTEXT_WINDOW_TOKENS);
  const remainingTokens = scope === "project" ? 0 : Math.max(0, autoCompactThreshold - currentTokens);
  return {
    currentTokens,
    currentMessageCount,
    tokenSource,
    autoCompactThreshold,
    remainingTokens,
    effectiveContextWindow,
    tokenPressure: scope !== "project" && autoCompactThreshold > 0 ? Math.round((currentTokens / autoCompactThreshold) * 1000) / 10 : 0,
    tokenUpdatedAt,
    sampledAutoCompactThreshold: Number(warning.thresholds?.autoCompactThreshold || decision.triggerTokens || 0),
    fallbackTokenMeasurement,
  };
}


export function healthAlerts(scope: MemoryScope, scopeId: string, memory: any) {
  const alerts: any[] = [];
  const add = (severity: string, code: string, message: string) => alerts.push({ id: `${scope}:${scopeId}:${code}`, scope, scopeId, severity, code, message });
  if (memory?.storageRecovery?.failed) add("critical", "storage_recovery_failed", "主文件和备份均不可读取");
  else if (memory?.storageRecovery?.recoveredFromBackup) add("warning", "storage_recovered", "本次从备份恢复，请检查最近一次写入");
  if (scope === "group") {
    const compaction = memory?.compaction || {};
    if (compaction.health && !["healthy", "empty", "recent-window-only"].includes(String(compaction.health))) add("warning", "compaction_health", `压缩健康状态：${compaction.health}`);
    if (compaction.validation?.pass === false) add("critical", "summary_validation", "压缩摘要未通过事实保真校验");
    if (Number(compaction.thrashCount || 0) >= 3) add("warning", "compaction_thrash", "连续压缩释放空间不足");
    if (Number(compaction.consecutiveFailures || 0) > 0) add("warning", "model_compaction_failure", `模型压缩连续失败 ${compaction.consecutiveFailures} 次`);
    const currentPressure = resolveMemoryCenterTokenState(scope, scopeId, memory).tokenPressure;
    if (currentPressure >= 90) add("warning", "token_pressure", `当前上下文占用 ${Math.round(currentPressure * 10) / 10}%`);
  } else if (scope === "project" || scope === "project_session") {
    if (memory?.integrity?.conclusions?.pass === false || memory?.integrity?.decisions?.pass === false) add("critical", "archive_integrity", "项目记忆归档校验失败");
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    if (Number(compaction.consecutiveFailures || compaction.consecutive_failures || 0) > 0) add("warning", "project_session_compaction_failure", `项目会话压缩连续失败 ${Number(compaction.consecutiveFailures || compaction.consecutive_failures || 0)} 次`);
  } else if (scope === "global" || scope === "global_session") {
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    if (memory?.integrity?.pass === false) add("critical", "global_archive_integrity", `全局记忆归档校验失败：${(memory.integrity.corruptedArchives || []).join("、")}`);
    if (compaction.health && compaction.health !== "healthy") add("warning", "global_compaction_health", `全局压缩健康状态：${compaction.health}`);
    if (Number(compaction.consecutiveFailures || 0) >= 3) add("critical", "global_compaction_circuit_breaker", "全局记忆压缩连续失败，熔断器已触发");
    if (scope === "global" && memory?.privacy?.encryptedTranscripts !== true) add("critical", "global_transcript_encryption", "全局 Agent 原始转录未启用加密");
  } else if (scope === "task_agent") {
    const failures = Number(memory?.compaction?.consecutiveFailures || memory?.compaction?.consecutive_failures || memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0);
    if (failures > 0) add(failures >= 3 ? "critical" : "warning", "task_agent_compaction_failure", `任务 Agent 精确会话压缩连续失败 ${failures} 次`);
  }
  return alerts;
}

export function memoryCenterMicroCompactState(scope: MemoryScope, scopeId: string, memory: any) {
  const applicable = ["group", "global_session", "project_session"].includes(scope)
    && !(scope === "group" && !String(scopeId || "").includes("::gcs_"));
  if (!applicable) return {
    schema: "ccm-memory-center-microcompact-state-v1",
    applicable: false,
    status: "not_applicable",
    reason: "session_scope_required",
    hasReceipt: false,
    receiptValid: false,
    historicalDataUnrecorded: false,
  };
  const compactionContainer = memory?.compaction || {};
  const compaction = compactionContainer?.v2 || compactionContainer;
  const receipt = compactionContainer.timeBasedToolResultProjection
    || compaction.timeBasedToolResultProjection
    || compaction.time_based_tool_result_projection
    || compactionContainer.microCompactReceipt
    || compactionContainer.micro_compact_receipt
    || compaction.microCompactReceipt
    || compaction.micro_compact_receipt
    || null;
  if (!receipt) return {
    schema: "ccm-memory-center-microcompact-state-v1",
    applicable: true,
    status: "historical_unrecorded",
    reason: "receipt_missing",
    hasReceipt: false,
    receiptValid: false,
    historicalDataUnrecorded: true,
    scope,
    scopeId,
    trigger: "",
    clearedToolResultCount: 0,
    keptToolResultCount: 0,
    tokensSaved: 0,
    gapMinutes: 0,
    gapThresholdMinutes: 0,
    evaluatedAt: "",
    rawTranscriptPreserved: true,
    receiptChecksum: "",
  };
  let verification = { valid: false, issues: ["unsupported_receipt_schema"] as string[] };
  if (receipt.schema === "ccm-group-time-based-tool-result-projection-v1") {
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    verification = verifyGroupTimeBasedToolResultProjectionReceipt(receipt, { groupId: exact.groupId, groupSessionId: exact.sessionId });
  } else if (receipt.schema === "ccm-session-microcompact-receipt-v1") {
    const sessionId = scope === "global_session"
      ? String(scopeId).replace(/^session:/, "")
      : scope === "project_session" ? String(scopeId).split("::").slice(1).join("::") : "";
    verification = verifySessionModelMicroCompactReceipt(receipt, { scope: scope === "global_session" ? "global" : "project", sessionId });
  }
  const sharedReceipt = receipt.schema === "ccm-session-microcompact-receipt-v1";
  return {
    schema: "ccm-memory-center-microcompact-state-v1",
    applicable: true,
    status: verification.valid ? (sharedReceipt ? (receipt.applied === true ? "applied" : "skipped") : String(receipt.status || "skipped")) : "invalid_receipt",
    reason: String(receipt.reason || ""),
    hasReceipt: true,
    receiptValid: verification.valid,
    receiptIssues: verification.issues,
    historicalDataUnrecorded: false,
    scope,
    scopeId,
    groupId: String(receipt.group_id || ""),
    groupSessionId: String(receipt.group_session_id || ""),
    trigger: String(receipt.trigger || "") || (String(receipt.reason || "").includes("gap") ? "time_based" : ""),
    clearedToolResultCount: Math.max(0, Number(receipt.cleared_tool_result_count || receipt.clearedToolResultCount || receipt.clearedToolCallIds?.length || 0)),
    keptToolResultCount: Math.max(0, Number(receipt.kept_tool_count || receipt.keptToolResultCount || receipt.keep_recent || receipt.keepRecent || 0)),
    compactableToolCount: Math.max(0, Number(receipt.compactable_tool_count || receipt.compactableToolCount || 0)),
    tokensSaved: Math.max(0, Number(receipt.tokens_saved || receipt.tokensSaved || receipt.clearedResultTokens || 0)),
    gapMinutes: Math.max(0, Number(receipt.gap_minutes || receipt.gapMinutes || 0)),
    gapThresholdMinutes: Math.max(0, Number(receipt.gap_threshold_minutes || receipt.gapThresholdMinutes || 0)),
    evaluatedAt: String(receipt.evaluated_at || receipt.evaluatedAt || ""),
    lastAssistantAt: String(receipt.last_assistant_at || receipt.lastAssistantAt || ""),
    rawTranscriptPreserved: receipt.raw_transcript_preserved === true || receipt.rawTranscriptPreserved === true || receipt.rawLedgerPreserved === true,
    receiptChecksum: String(receipt.receipt_checksum || receipt.receiptChecksum || ""),
  };
}

function memoryCenterPostCompactUsage(scope: MemoryScope, scopeId: string, memory: any, microCompactState: any) {
  const usage: any = { timeBasedToolResultMicrocompact: microCompactState };
  if (["global_session", "project_session"].includes(scope)) {
    const container = memory?.compaction || {};
    const compaction = container?.v2 || container;
    const receipt = container.toolResultContentReplacementReceipt
      || container.tool_result_content_replacement_receipt
      || compaction.toolResultContentReplacementReceipt
      || compaction.tool_result_content_replacement_receipt
      || null;
    if (receipt) {
      const sessionId = scope === "global_session"
        ? String(scopeId).replace(/^session:/, "")
        : String(scopeId).split("::").slice(1).join("::");
      const verification = verifySessionModelContentReplacementReceipt(receipt, {
        scope: scope === "global_session" ? "global" : "project",
        sessionId,
      });
      usage.toolResultContentReplacement = {
        schema: "ccm-memory-center-tool-result-content-replacement-v1",
        status: verification.valid ? (receipt.applied === true ? "applied" : "skipped") : "invalid_receipt",
        receiptValid: verification.valid,
        receiptIssues: verification.issues,
        replacementCount: Array.isArray(receipt.replacements) ? receipt.replacements.length : 0,
        rawLedgerPreserved: receipt.rawLedgerPreserved === true,
        receipt,
      };
    }
    return usage;
  }
  if (scope !== "group") return usage;
  const exact = parseGroupMemoryScopeId(scopeId, memory);
  const nativeProof = buildGroupApiMicrocompactNativeApplyProofSummary(exact.groupId, {
    groupSessionId: exact.sessionId,
    targetProject: String(memory?.compaction?.apiMicroCompactEditPlan?.target_project || memory?.compaction?.apiMicroCompactEditPlan?.targetProject || ""),
    planChecksums: [
      memory?.compaction?.apiMicroCompactEditPlan?.planChecksum,
      memory?.compaction?.apiMicroCompactEditPlan?.plan_checksum,
    ].filter(Boolean),
  });
  const nativeReceiptTotals: any = nativeProof?.platform_execution_receipts?.totals || {};
  const nativeTelemetry: any = nativeProof?.request_telemetry || {};
  usage.apiMicrocompactNativeApplyProof = {
    ...nativeProof,
    platformExecutionNativeAppliedCount: Number(nativeReceiptTotals.native_applied || 0),
    platformExecutionRequestAcceptedCount: Number(nativeReceiptTotals.request_accepted || 0),
    platformExecutionNoEditsAppliedCount: Number(nativeReceiptTotals.no_edits_applied || 0),
    platformExecutionFailedCount: Number(nativeReceiptTotals.request_failed || nativeReceiptTotals.failed || 0),
    requestTelemetryStrongCount: Number(nativeTelemetry.strong_verified_count || 0),
  };
  const plan = memory?.compaction?.postCompactReinject
    || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan
    || {};
  const expose = (key: string, receipt: any, verification: any, extra: any = {}) => {
    if (!receipt) return;
    usage[key] = {
      schema: "ccm-memory-center-post-compact-projection-v1",
      status: verification.valid === true ? "applied" : "invalid_receipt",
      receiptValid: verification.valid === true,
      receiptIssues: verification.issues || [],
      groupId: exact.groupId,
      groupSessionId: exact.sessionId,
      receipt,
      ...extra,
    };
  };
  expose("postCompactFileRestoreDedup", plan.preservedFileDedup,
    verifyGroupPostCompactFileRestoreDedupReceipt(plan.preservedFileDedup, { groupId: exact.groupId, groupSessionId: exact.sessionId }));
  expose("postCompactInvokedSkillAttachment", plan.invokedSkillAttachmentReceipt,
    verifyGroupPostCompactInvokedSkillAttachmentReceipt(plan.invokedSkillAttachmentReceipt, {
      groupId: exact.groupId,
      groupSessionId: exact.sessionId,
      attachments: plan.invokedSkillAttachments || [],
    }), { attachmentCount: Array.isArray(plan.invokedSkillAttachments) ? plan.invokedSkillAttachments.length : 0 });
  expose("postCompactPlanAttachment", plan.planAttachmentReceipt,
    verifyGroupPostCompactPlanAttachmentReceipt(plan.planAttachmentReceipt, {
      groupId: exact.groupId,
      groupSessionId: exact.sessionId,
      attachment: plan.planAttachment || null,
    }), { attached: !!plan.planAttachment });
  expose("postCompactDynamicContextDelta", plan.dynamicContextDeltaReceipt,
    verifyGroupPostCompactDynamicContextDeltaReceipt(plan.dynamicContextDeltaReceipt, {
      groupId: exact.groupId,
      groupSessionId: exact.sessionId,
      attachment: plan.dynamicContextDeltaAttachment || null,
    }), { attached: !!plan.dynamicContextDeltaAttachment });
  const taskStatusReceipt = memory?.compaction?.postCompactTaskStatusProjection
    || memory?.compactBoundary?.post_compact_restore?.postCompactTaskStatusProjection
    || null;
  expose("postCompactTaskStatusProjection", taskStatusReceipt,
    verifyGroupPostCompactTaskStatusProjectionReceipt(taskStatusReceipt, {
      groupId: exact.groupId,
      groupSessionId: exact.sessionId,
      projectionChecksum: taskStatusReceipt?.projection_checksum || "",
    }), {
      itemCount: Number(taskStatusReceipt?.included_task_count || 0),
      tasks: (Array.isArray(plan.taskStatuses) ? plan.taskStatuses : []).map((row: any) => ({
        task_id: String(row?.task_id || row?.taskId || ""),
        status: String(row?.status || ""),
        value: String(row?.value || ""),
      })),
    });
  return usage;
}

function memoryCenterProviderContextCacheState(scope: MemoryScope, scopeId: string, memory: any) {
  let binding: any = null;
  if (scope === "global_session") {
    const sessionId = String(scopeId || "").replace(/^session:/, "");
    binding = { scope: "global", scopeId: sessionId, sessionId };
  } else if (scope === "project_session") {
    const separator = String(scopeId || "").indexOf("::");
    const project = separator >= 0 ? String(scopeId).slice(0, separator) : "";
    const sessionId = separator >= 0 ? String(scopeId).slice(separator + 2) : "";
    if (project && sessionId) binding = { scope: "project", scopeId: project, sessionId };
  } else if (scope === "group") {
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    if (exact.groupId && exact.sessionId.startsWith("gcs_")) binding = { scope: "group", scopeId: exact.groupId, sessionId: exact.sessionId };
  }
  if (!binding) return { applicable: false, status: "not_applicable" };
  const capability = readProviderCacheCapabilityState(loadOrchestratorConfig());
  const state = readLatestProviderNeutralContextCacheState(binding);
  if (!state) return { applicable: true, status: "not_recorded", ...binding, capability };
  return {
    applicable: true,
    status: "recorded",
    contextEngineSchema: String(state.schema || "ccm-provider-neutral-context-cache-state-v1"),
    contextEngineVersion: Number(state.version || 1),
    ...binding,
    provider: String(state.provider || ""),
    model: String(state.model || ""),
    executionMode: String(state.executionMode || ""),
    adapterKind: String(state.adapterKind || ""),
    capabilitySource: String(state.capabilitySource || ""),
    providerNative: ["native_api_context_management", "provider_prompt_cache", "provider_implicit_cache", "provider_explicit_cache"].includes(String(state.executionMode || "")),
    ccmControlledProjection: ["ccm_controlled_projection", "stable_prefix_cache"].includes(String(state.executionMode || "")),
    blockCount: Number(state.blockCount || 0),
    totalTokens: Number(state.totalTokens || 0),
    reusedBlockCount: Number(state.reusedBlockCount || 0),
    changedBlockCount: Number(state.changedBlockCount || 0),
    stablePrefixBlockCount: Number(state.stablePrefixBlockCount || 0),
    adaptiveStablePrefix: state.adaptiveStablePrefix || null,
    materializationCache: state.materializationCache || null,
    downgradeReason: String(state.downgradeReason || ""),
    projectedContentReplacementDetected: state.projectedContentReplacementDetected === true,
    lastRequestStatus: String(state.lastRequestStatus || "prepared"),
    providerInputTokens: Number(state.providerInputTokens || 0),
    cacheCreationInputTokens: Number(state.cacheCreationInputTokens || 0),
    cacheReadInputTokens: Number(state.cacheReadInputTokens || 0),
    cacheDeletedInputTokens: Number(state.cacheDeletedInputTokens || 0),
    cacheCreation5mInputTokens: Number(state.cacheCreation5mInputTokens || 0),
    cacheCreation1hInputTokens: Number(state.cacheCreation1hInputTokens || 0),
    cacheHitRate: Number(state.cacheHitRate || 0),
    projectionDurationMs: Number(state.projectionDurationMs || 0),
    providerLatencyMs: Number(state.providerLatencyMs || 0),
    reportedCostUsd: Number(state.reportedCostUsd || 0),
    estimatedInputCostUsd: Number(state.estimatedInputCostUsd || 0),
    costSource: String(state.costSource || "unavailable"),
    rollingMetrics: state.rollingMetrics || null,
    cacheRecommendation: state.cacheRecommendation || null,
    tokenGate: state.tokenGate || null,
    blockChanges: state.blockChanges || null,
    capability,
    adapterEvidence: state.adapterEvidence || null,
    lastError: String(state.lastError || ""),
    rawTranscriptPreserved: true,
    contentStored: false,
    planChecksum: String(state.contextPlanChecksum || state.planChecksum || ""),
    contextIdentityChecksum: String(state.contextIdentityChecksum || ""),
    updatedAt: String(state.updatedAt || ""),
  };
}


export function memorySummary(scope: MemoryScope, scopeId: string, memory: any, label: string, options: any = {}) {
  const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, memory) : null;
  const controls = scopeControls(scope, scopeId);
  const alerts = healthAlerts(scope, scopeId, memory);
  const compactionContainer = memory?.compaction || {};
  const compaction = compactionContainer?.v2 || compactionContainer;
  const exactGroupSessionMemoryId = groupScope?.sessionId && groupScope.sessionId !== "default"
    ? `${groupScope.groupId}--${groupScope.sessionId}`
    : groupScope?.groupId || scopeId;
  const sessionMemory = scope === "group"
    ? readGroupSessionMemorySnapshotForCenter(exactGroupSessionMemoryId)
    : compaction.sessionMemoryState || compaction.session_memory_state || null;
  const toolContinuity = scope === "group" ? readGroupToolContinuitySnapshotForCenter(exactGroupSessionMemoryId) : null;
  const microCompactState = memoryCenterMicroCompactState(scope, scopeId, memory);
  const canonicalGroupSessionMemory = scope === "group"
    && sessionMemory?.modelExtracted === true
    && sessionMemory?.hasSummary === true
    && sessionMemory?.markdownExists === true
    && sessionMemory?.markdownChecksumMatches === true;
  const tokenState = resolveMemoryCenterTokenState(scope, scopeId, memory);
  const storedModelVisiblePayload = compaction.modelVisiblePayload || compaction.model_visible_payload || compactionContainer.model_visible_payload || memory?.modelVisiblePayload || null;
  const groupAccounting = scope === "group" ? latestGroupContextAccounting(scopeId, memory) : null;
  const initialAccounting = selectMemoryCenterContextAccounting({
    scope,
    stored: storedModelVisiblePayload,
    provider: groupAccounting?.payload || null,
  });
  const rebuiltAccounting = options.rebuildCurrentPayload === true
    && !isCompleteMemoryCenterContextAccounting(initialAccounting.payload)
    ? scope === "group"
      ? rebuildCurrentGroupContextAccounting(scopeId, memory)
      : rebuildCurrentSessionContextAccounting(scope, scopeId, memory)
    : null;
  const selectedAccounting = selectMemoryCenterContextAccounting({
    scope,
    stored: storedModelVisiblePayload,
    provider: groupAccounting?.payload || null,
    rebuilt: rebuiltAccounting?.payload || null,
  });
  const modelVisiblePayload = selectedAccounting.payload;
  const completeAccounting = isCompleteMemoryCenterContextAccounting(modelVisiblePayload);
  const currentTokens = completeAccounting
    ? Number(modelVisiblePayload.totalTokens || modelVisiblePayload.total_tokens || 0)
    : tokenState.currentTokens;
  const tokenSource = selectedAccounting.source === "provider_payload_accounting"
    ? "provider_payload_accounting"
    : selectedAccounting.source === "current_model_visible_payload_projection"
      ? "model_visible_payload_projection"
      : completeAccounting ? "model_visible_payload" : tokenState.tokenSource;
  const tokenUpdatedAt = selectedAccounting.source.startsWith("provider_payload_accounting")
    ? String(groupAccounting?.updatedAt || tokenState.tokenUpdatedAt)
    : rebuiltAccounting?.updatedAt || tokenState.tokenUpdatedAt;
  const remainingTokens = Math.max(0, tokenState.effectiveContextWindow - currentTokens);
  const tokenPressure = tokenState.effectiveContextWindow > 0
    ? Math.min(100, Math.round((currentTokens / tokenState.effectiveContextWindow) * 1000) / 10)
    : tokenState.tokenPressure;
  const compactionActivity = currentCompactionActivity(scope, scopeId, memory);
  const engineScope = scope === "global_session" ? "global" : scope === "project_session" ? "project" : scope;
  const engineScopeId = scope === "group" ? String(groupScope?.groupId || scopeId) : scope === "project" || scope === "project_session" ? String(memory?.project || scopeId) : scopeId;
  const engineSessionId = scope === "group"
    ? String(groupScope?.sessionId || "")
    : String(compaction.sessionId || compaction.session_id || memory?.sessionId || memory?.session_id || scopeId);
  const contextEngineTrends = ["global", "group", "project", "music"].includes(engineScope) && engineSessionId
    ? readContextEngineTrends({ scope: engineScope, scopeId: engineScopeId, sessionId: engineSessionId, limit: 100 })
    : null;
  let recoveryPoints: any[] = [];
  if (["global", "group", "project", "music"].includes(engineScope) && engineSessionId) {
    try { recoveryPoints = listContextEngineRecoveryPoints({ scope: engineScope, scopeId: engineScopeId, sessionId: engineSessionId }); } catch {}
  }
  const unifiedState: any = ["global", "group", "project"].includes(engineScope)
    ? { receipt: memory?.unifiedSessionCompaction || null, stateV1: projectUnifiedSessionCompactionState(memory?.unifiedSessionCompaction || memory?.unified_session_compaction) }
    : null;
  const unifiedCompaction = projectUnifiedCompactionReceipt(
    unifiedState?.receipt || null,
    compaction.summaryQuality || compaction.summary_quality || compactionContainer.summary_quality || null,
  );
  return {
    scope, id: scopeId, label, health: alerts.some(item => item.severity === "critical") ? "critical" : alerts.length ? "warning" : "healthy",
    groupId: groupScope?.groupId || "",
    groupSessionId: groupScope?.sessionId || "",
    alerts: alerts.length,
    pinned: controls.filter((item: any) => item.pinned && !item.deprecated).length,
    edited: controls.filter((item: any) => item.editedText !== undefined && !item.deprecated).length,
    deprecated: controls.filter((item: any) => item.deprecated).length,
    tokenPressure,
    currentTokens,
    currentMessageCount: tokenState.currentMessageCount,
    tokenSource,
    tokenUpdatedAt,
    compacting: compactionActivity.active === true,
    compactionActivity,
    autoCompactThreshold: tokenState.autoCompactThreshold,
    remainingTokens,
    effectiveContextWindow: tokenState.effectiveContextWindow,
    preCompactPressure: Number(compaction.pressurePercent || 0),
    beforeTokens: Number(compaction.preCompactTokenCount ?? compactionContainer.before_tokens ?? 0),
    afterTokens: Number(compaction.postCompactTokenCount ?? compactionContainer.after_tokens ?? compaction.postCompactGate?.afterTokens ?? 0),
    summarySource: String(memory?.summarySource || compactionContainer?.summary_source || compactionContainer?.summarySource || (compaction.activeSummary ? "model" : canonicalGroupSessionMemory ? "session_memory" : "")),
    preservedRecentTokens: Number(
      compaction.preservedRecentTokens
      ?? compaction.preserved_recent_token_count
      ?? compaction.compactStrategyDecision?.preservedSegment?.preservedTokenEstimate
      ?? compaction.compact_strategy_decision?.preserved_segment?.preserved_token_estimate
      ?? 0
    ),
    preservedRecentMessages: Number(
      (compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length
      || compaction.compactStrategyDecision?.preservedSegment?.preservedMessageCount
      || compaction.compact_strategy_decision?.preserved_segment?.preserved_message_count
      || compaction.preservedRecentMessages
      || 0
    ),
    // circuitOpen 必须反映「真正阻断自动压缩的硬熔断台账」，而不是
    // compaction.consecutiveFailures（那是模型摘要回退确定性算法的软计数，
    // 压缩本身其实成功了）。两者分开上报，避免互相冒充。
    ...buildAutoCompactCircuitDisplayState({
      autoCompactCircuitBreaker: compaction.autoCompactCircuitBreaker
        || compaction.auto_compact_circuit_breaker
        || memory?.finalDispatchReactiveCompactCircuitBreaker
        || {},
      summaryFallbackFailures: Number(compaction.consecutiveFailures ?? compaction.consecutive_failures ?? 0),
      summaryFallbackLimit: 3,
    }),
    consecutiveFailures: Number(compaction.consecutiveFailures ?? compaction.consecutive_failures ?? memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures ?? 0),
    postCompactGate: compaction.postCompactGate || compaction.post_compact_gate || compactionContainer.post_compact_gate || null,
    tokenMeasurement: compaction.tokenMeasurement || compaction.token_measurement || compactionContainer.token_measurement || tokenState.fallbackTokenMeasurement || null,
    // Never expose the model-visible body through Memory Center. Keep only
    // token buckets, checksums and loaded-item metadata.
    modelVisiblePayload: modelVisiblePayloadAccounting(modelVisiblePayload as any),
    availableContextCatalog: buildAvailableContextCatalog(scope, scopeId, memory, modelVisiblePayload),
    resolvedModelCapacity: compaction.resolvedModelCapacity || compaction.resolved_model_capacity || compactionContainer.resolved_model_capacity || memory?.model?.modelContextCapacity || null,
    pendingRequestTokens: Number(compaction.pendingRequestTokens ?? compaction.pending_request_tokens ?? compactionContainer.pending_request_tokens ?? 0),
    recoveryContextTokens: Number(compaction.recoveryContextTokens ?? compaction.recovery_context_tokens ?? compactionContainer.recovery_context_tokens ?? 0),
    hookResultTokens: Number(compaction.hookResultTokens ?? compaction.hook_result_tokens ?? compactionContainer.hook_result_tokens ?? 0),
    ptlRecoveryAttempts: Number(compaction.ptlRecoveryAttempts ?? compaction.ptl_recovery_attempts ?? compactionContainer.ptl_recovery_attempts ?? 0),
    boundaryGeneration: Number(compaction.boundaryGeneration ?? compaction.boundary_generation ?? 0),
    microCompact: microCompactState,
    // Safe projection only: no summary body, recovery JSON, prompts, source or stdout.
    unifiedCompaction,
    unifiedCompactionState: unifiedState?.stateV1 || null,
    providerContextCache: memoryCenterProviderContextCacheState(scope, scopeId, memory),
    contextEngineTrends,
    contextEngineRecovery: {
      schema: "ccm-context-engine-recovery-summary-v1",
      count: recoveryPoints.length,
      latest: recoveryPoints[0] || null,
      points: recoveryPoints.slice(0, 10),
      contentStored: false,
    },
    summaryQuality: compaction.summaryQuality || compaction.summary_quality || compactionContainer.summary_quality || compaction.modelMetadata?.summaryQuality || null,
    secondaryReview: compaction.secondaryReview || compaction.secondary_review || compactionContainer.secondary_review || compaction.modelMetadata?.secondaryReview || null,
    postCompactUsage: memoryCenterPostCompactUsage(scope, scopeId, memory, microCompactState),
    longTermMemory: scope === "project" ? {
      schema: memory?.memoryPolicy?.schema || "legacy_project_memory",
      durableCount: Array.isArray(memory?.durableMemories) ? memory.durableMemories.length : 0,
      activeCount: (Array.isArray(memory?.durableMemories) ? memory.durableMemories : []).filter((item: any) => !["resolved", "superseded"].includes(String(item?.status || "active"))).length,
      taskHistoryCount: Array.isArray(memory?.taskHistory) ? memory.taskHistory.length : 0,
      legacyConclusionCount: (Array.isArray(memory?.conclusions) ? memory.conclusions.length : 0)
        + (Array.isArray(memory?.conclusionArchives) ? memory.conclusionArchives.reduce((sum: number, item: any) => sum + Number(item?.count || 0), 0) : 0),
      writePolicy: memory?.memoryPolicy?.durableMemoryRequiresAcceptedDoneReceipt === true ? "accepted_delivery_only" : "legacy",
      taskHistoryInjectedByDefault: memory?.memoryPolicy?.taskHistoryInjectedByDefault === true,
      lastAdmission: memory?.lastMemoryAdmission || null,
    } : null,
    updatedAt: memory?.updated_at || memory?.updatedAt || compaction.lastCompactedAt || "",
    sessionMemory: sessionMemory ? {
      status: scope === "group"
        ? (sessionMemory.modelExtracted === true
          && sessionMemory.hasSummary === true
          && sessionMemory.markdownExists === true
          && sessionMemory.markdownChecksumMatches === true
            ? "ready"
            : sessionMemory.modelExtracted === true
              ? "invalid"
              : sessionMemory.deterministicFallback === true
                ? "waiting_model"
                : sessionMemory.updateCadence?.status || sessionMemory.status || "waiting")
        : (sessionMemory.summary || sessionMemory.hasSummary ? "ready" : sessionMemory.status || "waiting"),
      source: sessionMemory.extractionSource || sessionMemory.sourceType || sessionMemory.source_type || "",
      updatedAt: sessionMemory.updatedAt || sessionMemory.updated_at || "",
      tokensAtLastExtraction: Number(sessionMemory.tokensAtLastExtraction || sessionMemory.tokens_at_last_extraction || 0),
      summaryFile: sessionMemory.summaryFile || sessionMemory.summary_file || "",
      snapshotFile: sessionMemory.snapshotFile || sessionMemory.snapshot_file || "",
      hasSummary: sessionMemory.hasSummary === true,
      canonical: scope === "group"
        ? sessionMemory.modelExtracted === true
          && sessionMemory.hasSummary === true
          && sessionMemory.markdownExists === true
          && sessionMemory.markdownChecksumMatches === true
        : !!(sessionMemory.summary || sessionMemory.hasSummary),
      modelExtracted: sessionMemory.modelExtracted === true,
      deterministicFallback: sessionMemory.deterministicFallback === true,
      markdownExists: sessionMemory.markdownExists === true,
      markdownChecksumMatches: sessionMemory.markdownChecksumMatches === true,
    } : null,
    toolContinuity: toolContinuity ? {
      summaryFile: toolContinuity.summaryFile || toolContinuity.summary_file || "",
      snapshotFile: toolContinuity.snapshotFile || toolContinuity.snapshot_file || "",
      status: toolContinuity.status || "empty",
      markdownExists: toolContinuity.markdownExists === true,
      markdownChecksumMatches: toolContinuity.markdownChecksumMatches === true,
      allowedCount: Number((toolContinuity.allowedTools?.mcp || []).length + (toolContinuity.allowedTools?.skill || []).length),
      missingCount: Number((toolContinuity.missing?.mcp || []).length + (toolContinuity.missing?.skill || []).length),
      invokedSkillCount: Number((toolContinuity.invokedSkills || []).length),
      shouldBypassAuthorization: toolContinuity.shouldBypassAuthorization === true,
    } : null,
  };
}

function readableGlobalSessionSummary(value: any) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const compactValue = (input: any, max = 1800) => {
    const text = String(input || "").trim().replace(/^#[a-zA-Z0-9._:-]+\s+/, "");
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };
  const list = (input: any, limit = 8) => (Array.isArray(input) ? input : [])
    .map(item => compactValue(item, 500))
    .filter(Boolean)
    .slice(-limit)
    .join("；");
  const sections = [
    ["主要目标", compactValue(value.primaryRequest)],
    ["近期要求", list(value.userRequests)],
    ["关键决策", list(value.decisions)],
    ["未完成事项", list(value.unresolved)],
    ["授权", list(value.authorization)],
    ["反馈", list(value.feedback)],
    ["文件与资源", list(value.filesAndResources)],
    ["最新结果", compactValue(value.latestOutcome)],
  ].filter(([, text]) => text);
  if (sections.length) return sections.map(([label, text]) => `${label}：${text}`).join("\n");
  try { return JSON.stringify(value, null, 2); } catch { return "结构化会话摘要"; }
}

function messageTextForMemoryCenter(message: any) {
  const value = message?.content ?? message?.text ?? message?.message ?? "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === "string") return item;
    return String(item?.text || item?.content || "");
  }).filter(Boolean).join("\n").trim();
  try { return JSON.stringify(value); } catch { return String(value || ""); }
}

function recentSessionMessagesForMemoryCenter(scope: MemoryScope, scopeId: string, memory: any) {
  let messages: any[] = [];
  try {
    if (scope === "group") {
      const exact = parseGroupMemoryScopeId(scopeId, memory);
      if (exact.sessionId !== "default") messages = require("../collaboration/storage").getGroupMessages(exact.groupId, exact.sessionId) || [];
    } else if (scope === "global_session") {
      messages = require("../../agents/global/memory").loadGlobalAgentTranscript(scopeId.replace(/^session:/, ""))?.messages || [];
    } else if (scope === "project_session") {
      messages = memory?.history || memory?.messages || [];
    } else if (scope === "task_agent") {
      messages = memory?.history || memory?.messages || memory?.transcript || [];
    }
  } catch {}
  if (!Array.isArray(messages) || !messages.length) return [];
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  const preservedIds = compaction.preservedRecentMessageIds
    || compaction.preserved_recent_message_ids
    || compaction.compactStrategyDecision?.preservedSegment?.preservedMessageIds
    || compaction.compact_strategy_decision?.preserved_segment?.preserved_message_ids
    || [];
  let visible = messages;
  if (Array.isArray(preservedIds) && preservedIds.length) {
    const ids = new Set(preservedIds.map((id: any) => String(id)));
    const selected = messages.filter(message => ids.has(String(message?.id || message?.messageId || message?.uuid || "")));
    if (selected.length) visible = selected;
  } else {
    const lastCompactedIndex = Number(compaction.lastCompactedIndex ?? memory?.lastCompactedIndex ?? -1);
    if (lastCompactedIndex >= 0) visible = messages.slice(lastCompactedIndex + 1);
  }
  return visible.filter(message => messageTextForMemoryCenter(message)).slice(-20);
}

function appendSessionContinuityItems(groups: any[], scope: MemoryScope, scopeId: string, memory: any) {
  const isExactGroupSession = scope === "group" && parseGroupMemoryScopeId(scopeId, memory).sessionId !== "default";
  if (!isExactGroupSession && !["global_session", "project_session", "task_agent"].includes(scope)) return;
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  let activeSummaryValue = memory?.unifiedSessionSummary || compaction.activeSummary || memory?.summary || memory?.conversationSummary || "";
  let summarySource = String(memory?.summarySource || memory?.summary_source || compaction.summarySource || compaction.summary_source || "").toLowerCase();
  if (isExactGroupSession && !activeSummaryValue) {
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    const sessionMemory = readGroupSessionMemorySnapshotForCenter(`${exact.groupId}--${exact.sessionId}`);
    const canonicalSessionMemory = sessionMemory.modelExtracted === true
      && sessionMemory.hasSummary === true
      && sessionMemory.markdownExists === true
      && sessionMemory.markdownChecksumMatches === true;
    if (canonicalSessionMemory) {
      activeSummaryValue = sessionMemory.markdownExcerpt || "";
      summarySource = "session_memory";
    }
  }
  // Session summaries are model-continuity material, not Memory Center
  // content. Expose only a safe receipt marker; the original transcript and
  // task ledger remain available to the authorized runtime.
  const activeSummary = activeSummaryValue ? "已保留会话压缩摘要（正文按需由运行时恢复）" : "";
  const canonicalSummary = ["model", "session_memory", "session-memory"].includes(summarySource);
  if (activeSummary) groups.push({
    type: canonicalSummary ? "sessionSummary" : "legacySessionSummary",
    items: [{
      itemId: `session-summary:${scopeId}`,
      type: canonicalSummary ? "sessionSummary" : "legacySessionSummary",
      text: activeSummary,
      originalText: "",
      pinned: false,
      deprecated: false,
      readOnly: true,
      evidence: {
        sessionId: scope === "global_session" ? scopeId.replace(/^session:/, "") : scopeId,
        messageId: compaction.lastCompactedMessageId || "",
        time: compaction.lastCompactedAt || memory?.lastCompactedAt || "",
      },
      raw: { checksum: compaction.activeSummaryChecksum || compaction.summaryChecksum || "", summarySource, canonical: canonicalSummary, contentStored: false },
    }],
  });
  const recent = recentSessionMessagesForMemoryCenter(scope, scopeId, memory);
  if (recent.length) groups.push({
    type: "recentMessages",
    items: recent.map((message: any, index: number) => {
      const role = String(message?.role || message?.type || "message").toLowerCase();
      const actor = role === "user" ? "用户" : role === "assistant" ? "Agent" : role === "system" ? "系统" : role;
      return {
        itemId: `recent-message:${message?.id || message?.messageId || message?.uuid || index}`,
        type: "recentMessages",
        text: `${actor}：${messageTextForMemoryCenter(message)}`,
        originalText: messageTextForMemoryCenter(message),
        pinned: false,
        deprecated: false,
        readOnly: true,
        evidence: {
          groupId: message?.groupId || "",
          sessionId: scopeId,
          messageId: message?.id || message?.messageId || message?.uuid || "",
          time: message?.timestamp || message?.createdAt || message?.created_at || "",
        },
        raw: message,
      };
    }),
  });
  if (scope === "global_session") groups.push({
    type: "sessionArchives",
    items: (memory?.archives || []).map((archive: any, index: number) => ({
      itemId: getMemoryItemId("sessionArchives", archive, index),
      type: "sessionArchives",
      archived: true,
      archiveId: archive.id,
      text: `会话 ${archive.sessionId}：${archive.summary?.primaryRequest || "历史压缩段"}（${archive.count || 0} 条）`,
      originalText: archive.summary?.latestOutcome || "",
      pinned: false,
      deprecated: false,
      readOnly: true,
      evidence: { sessionId: archive.sessionId, messageId: archive.summary?.sourceMessageIds?.[0] || "", time: archive.from || "" },
      raw: archive,
    })),
  });
}


export function collectItems(scope: MemoryScope, scopeId: string, memory: any) {
  const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, memory) : null;
  const controls = scopeControls(scope, scopeId);
  const groups: any[] = [];
  const exactSessionScope = ["global_session", "project_session", "task_agent"].includes(scope);
  const keys = exactSessionScope ? []
    : scope === "group" ? ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
    : scope === "project" ? ["durableMemories"]
    : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
  for (const key of keys) {
    const values = Array.isArray(memory?.[key]) ? memory[key] : [];
    groups.push({
      type: key,
      items: values.map((item: any, index: number) => {
        const itemId = getMemoryItemId(key, item, index);
        const control = controls.find((entry: any) => entry.itemType === key && entry.itemId === itemId);
        return {
          itemId, type: key, text: control?.editedText !== undefined ? control.editedText : itemText(key, item),
          originalText: itemText(key, item), pinned: !!control?.pinned, deprecated: !!control?.deprecated,
          reason: control?.reason || "", updatedAt: control?.updatedAt || "",
          evidence: {
            groupId: item?.groupId || groupScope?.groupId || "",
            messageId: item?.messageId || item?.source?.messageIds?.[0] || "",
            taskId: item?.taskId || item?.source?.taskId || "",
            sessionId: item?.source?.sessionId || groupScope?.sessionId || "",
            missionId: item?.source?.missionId || "",
            time: item?.updatedAt || item?.time || item?.timestamp || item?.source?.timestamp || "",
          },
          extraction_source: item?.extractionSource || item?.extraction_source || (scope === "global" ? "legacy_unverified" : ""),
          evidence_message_ids: item?.evidenceMessageIds || item?.evidence_message_ids || item?.source?.messageIds || [],
          semantic_status: item?.semanticStatus || item?.semantic_status || (scope === "global" ? "legacy_unverified" : "confirmed"),
          legacy_unverified: (item?.semanticStatus || item?.semantic_status || (scope === "global" ? "legacy_unverified" : "confirmed")) === "legacy_unverified",
          semantic_decision_receipt: item?.semanticDecisionReceipt || item?.semantic_decision_receipt || null,
          raw: item,
        };
      }),
    });
  }
  appendSessionContinuityItems(groups, scope, scopeId, memory);
  return groups;
}


export function getMemoryCenterScope(scope: MemoryScope, scopeId: string) {
  const file = scopeFile(scope, scopeId);
  let virtualGroupMemory: any = null;
  if (scope === "group" && file && !fs.existsSync(file)) {
    const exact = parseGroupMemoryScopeId(scopeId);
    try {
      const session = (require("../collaboration/storage").listGroupChatSessions(exact.groupId).sessions || [])
        .find((item: any) => String(item.id || "") === exact.sessionId);
      if (session) virtualGroupMemory = { groupId: exact.groupId, groupSessionId: exact.sessionId, compaction: {}, virtualSession: true };
    } catch {}
  }
  if ((!file || !fs.existsSync(file)) && !virtualGroupMemory) throw new Error("记忆不存在");
  let rawMemory: any;
  if (scope === "global") rawMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
  else if (scope === "global_session") {
    const globalMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
    const sessionId = scopeId.replace(/^session:/, "");
    const session = (globalMemory.sessions || []).find((item: any) => String(item.sessionId) === sessionId);
    if (!session) throw new Error("全局会话不存在");
    rawMemory = { ...session, archives: (globalMemory.archives || []).filter((item: any) => String(item.sessionId) === sessionId), updatedAt: session.transcriptUpdatedAt || session.lastCompactedAt || "" };
  } else if (scope === "task_agent") {
    const store = readMemoryFile(file);
    const session = (store?.sessions || []).find((item: any) => String(item.id) === scopeId);
    if (!session) throw new Error("任务 Agent 会话不存在");
    rawMemory = { ...session, compaction: session.compaction || { latestProviderUsage: session.providerContextUsageBaseline, consecutiveFailures: session.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0 } };
  } else rawMemory = virtualGroupMemory || readMemoryFile(file);
  if (!rawMemory) throw new Error("记忆文件无法读取");
  const policy = scope === "global" || scope === "global_session" ? require("../../agents/global/memory").getGlobalAgentMemoryPolicy() : null;
  const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, rawMemory) : null;
  const microCompactState = memoryCenterMicroCompactState(scope, scopeId, rawMemory);
  let contextSourceContinuity: any = { budget: {}, receipts: [], latestRestore: null };
  try {
    if (scope === "global_session") {
      const sessionId = scopeId.replace(/^session:/, "");
      contextSourceContinuity = readContextSourceContinuity({ agentKind: "global", scope: "global", scopeId: "global-agent", exactSessionId: sessionId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
    } else if (scope === "project_session") {
      const separator = scopeId.indexOf("::");
      const project = separator >= 0 ? scopeId.slice(0, separator) : "";
      const sessionId = separator >= 0 ? scopeId.slice(separator + 2) : "";
      if (project && sessionId) contextSourceContinuity = readContextSourceContinuity({ agentKind: "project", scope: "project", scopeId: project, exactSessionId: sessionId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
    } else if (scope === "group" && groupScope?.sessionId && groupScope.sessionId !== "default") {
      contextSourceContinuity = readContextSourceContinuity({ agentKind: "group", scope: "group", scopeId: groupScope.groupId, exactSessionId: groupScope.sessionId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
    } else if (scope === "task_agent" && rawMemory?.project) {
      contextSourceContinuity = readContextSourceContinuity({ agentKind: "project", scope: "project", scopeId: String(rawMemory.project), exactSessionId: scopeId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
    }
  } catch {}
  return {
    scope, id: scopeId, file, backupExists: fs.existsSync(`${file}.bak`),
    groupId: groupScope?.groupId || "",
    groupSessionId: groupScope?.sessionId || "",
    policy,
    summary: memorySummary(scope, scopeId, rawMemory, scopeId, { rebuildCurrentPayload: true }), alerts: healthAlerts(scope, scopeId, rawMemory),
    postCompactUsage: memoryCenterPostCompactUsage(scope, scopeId, rawMemory, microCompactState),
    providerContextCache: memoryCenterProviderContextCacheState(scope, scopeId, rawMemory),
    contextSourceContinuity,
    memory: applyMemoryControls(scope, scopeId, rawMemory), rawMemory,
    itemGroups: collectItems(scope, scopeId, rawMemory),
  };
}


export function listMemoryAudit(limit = 200, filters: any = {}) {
  let rows: any[] = [];
  try { rows = fs.readFileSync(AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); } catch {}
  if (filters.scope) rows = rows.filter(item => item.scope === filters.scope);
  if (filters.scopeId) rows = rows.filter(item => item.scopeId === filters.scopeId);
  return rows.slice(-Math.max(1, Math.min(1000, limit))).reverse();
}


export function findMemoryEvidence(input: { scope?: string; groupId?: string; messageId?: string; taskId?: string; sessionId?: string; missionId?: string }) {
  if (input.scope === "global" || input.missionId || (input.sessionId && !input.groupId)) {
    const { getGlobalMemoryEvidence } = require("../../agents/global/memory");
    return getGlobalMemoryEvidence(input);
  }
  const groupIds = input.groupId ? [input.groupId] : listJsonFiles(GROUP_MESSAGES_DIR).map(file => path.basename(file, ".json"));
  const matches: any[] = [];
  for (const groupId of groupIds) {
    let messages: any[] = [];
    if (input.sessionId) {
      try { messages = require("../collaboration/storage").getGroupMessages(groupId, input.sessionId); } catch {}
    } else {
      messages = readJson(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), []);
    }
    for (const message of Array.isArray(messages) ? messages : []) {
      if (input.messageId && String(message.id || message.uuid || "") !== input.messageId) continue;
      if (input.taskId && String(message.task_id || message.taskId || "") !== input.taskId) continue;
      matches.push({ groupId, sessionId: input.sessionId || message.group_session_id || message.groupSessionId || "default", messageId: message.id || message.uuid || "", role: message.role || "", agent: message.agent || message.target || "", content: message.content || message.delivery_summary?.headline || "", timestamp: message.timestamp || "", taskId: message.task_id || message.taskId || "", raw: message });
      if (matches.length >= 50) return matches;
    }
  }
  return matches;
}


export function rollbackMemory(scope: MemoryScope, scopeId: string, reason: string, actor = "local-user") {
  if (!String(reason || "").trim()) throw new Error("回滚前必须填写原因");
  const file = scopeFile(scope, scopeId);
  const backup = file ? `${file}.bak` : "";
  if (!file || !fs.existsSync(backup)) throw new Error("没有可用的记忆备份");
  const backupData = fs.readFileSync(backup, "utf-8");
  JSON.parse(backupData);
  const snapshotDir = path.join(CONTROL_DIR, "snapshots");
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapshot = path.join(snapshotDir, `${scope}-${cleanId(scopeId)}-pre-rollback-${Date.now()}.json`);
  if (fs.existsSync(file)) fs.copyFileSync(file, snapshot);
  const temp = `${file}.${process.pid}.${Date.now()}.rollback.tmp`;
  fs.writeFileSync(temp, backupData, "utf-8");
  fs.renameSync(temp, file);
  const audit = appendAudit({ type: "memory_rollback", action: "rollback", scope, scopeId, actor, reason, backup, snapshot, restoredHash: hash(backupData, 24) });
  return { restored: true, snapshot, audit, memory: readMemoryFile(file) };
}


export function recordMemoryOperation(input: any) {
  return appendAudit({ type: "memory_operation", ...input });
}


export function memoryCenterExactGroupSessionScope(scopeId: any) {
  const parsed = parseGroupMemoryScopeId(String(scopeId || ""));
  if (!parsed.groupId || !/^gcs_[a-zA-Z0-9._-]+$/.test(parsed.sessionId)) throw new Error("An exact group::gcs_* session scope is required");
  return { ...parsed, typedScopeId: `${parsed.groupId}--${parsed.sessionId}` };
}
