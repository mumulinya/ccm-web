"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGlobalRoutingDirectoryV2 = buildGlobalRoutingDirectoryV2;
exports.buildGlobalModelContextProjectionV2 = buildGlobalModelContextProjectionV2;
exports.buildGlobalAgentContextEnvelopeV2 = buildGlobalAgentContextEnvelopeV2;
exports.alignGlobalAgentContextEnvelopeTokens = alignGlobalAgentContextEnvelopeTokens;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function clean(value, max = 240) {
    return String(value ?? "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function tokens(value) {
    return Math.max(0, Math.floor((0, context_budget_1.estimateTextTokens)(typeof value === "string" ? value : JSON.stringify(value ?? null))));
}
function uniqueChecksums(values) {
    return Array.from(new Set(values.map(value => clean(value, 128)).filter(value => /^[a-f0-9]{16,128}$/i.test(value)))).slice(0, 80);
}
function buildGlobalRoutingDirectoryV2(context) {
    const projects = (Array.isArray(context?.projects) ? context.projects : [])
        .map((project) => ({
        id: clean(project?.id || project?.name, 160),
        name: clean(project?.name || project?.id, 160),
        ...(clean(project?.display_name || project?.displayName, 160) ? { displayName: clean(project?.display_name || project?.displayName, 160) } : {}),
    }))
        .filter((project) => project.id && project.name)
        .sort((left, right) => `${left.id}\0${left.name}`.localeCompare(`${right.id}\0${right.name}`));
    const groups = (Array.isArray(context?.groups) ? context.groups : [])
        .map((group) => ({ id: clean(group?.id, 160), name: clean(group?.name || group?.id, 160) }))
        .filter((group) => group.id && group.name)
        .sort((left, right) => `${left.id}\0${left.name}`.localeCompare(`${right.id}\0${right.name}`));
    const core = { projectCount: projects.length, groupCount: groups.length, projects, groups };
    return { schema: "ccm-global-routing-directory-v2", ...core, checksum: digest(core), contentStored: false };
}
function buildGlobalModelContextProjectionV2(context) {
    const routingDirectory = buildGlobalRoutingDirectoryV2(context);
    const continuity = context?.session_continuity || {};
    const instructionRows = Array.isArray(context?.scope_instruction_catalog) ? context.scope_instruction_catalog : [];
    const scopeInstructionCatalog = instructionRows.map((entry) => ({
        documentId: clean(entry?.documentId, 180),
        kind: clean(entry?.kind, 80),
        ...(clean(entry?.projectId, 160) ? { projectId: clean(entry.projectId, 160) } : {}),
        ...(clean(entry?.groupId, 160) ? { groupId: clean(entry.groupId, 160) } : {}),
        status: clean(entry?.status, 80),
        generation: Math.max(0, Math.floor(Number(entry?.generation || 0))),
        revision: Math.max(0, Math.floor(Number(entry?.revision || 0))),
        ...(clean(entry?.checksum, 128) ? { checksum: clean(entry.checksum, 128) } : {}),
        readTool: "read_scope_instruction",
        contentStored: false,
    })).filter((entry) => entry.documentId);
    const loadedContextChecksums = uniqueChecksums([
        context?.scope_instruction_loaded_checksum,
        ...(continuity?.summary ? [continuity?.checksum, continuity?.summary?.checksum] : []),
    ]);
    return {
        schema: "ccm-global-model-context-projection-v2",
        routingDirectory,
        requestedDispatchTargets: context?.requested_dispatch_targets || { targets: [], policy: "only_these_targets_may_receive_tasks" },
        sessionContext: {
            boundaryGeneration: Math.max(0, Number(continuity?.boundary?.generation || continuity?.boundary_generation || 0)),
            summaryAvailable: !!continuity?.summary,
            loadedScopeInstructionCount: Math.max(0, Number(context?.scope_instruction_loaded_count || (context?.scope_instruction_loaded_context ? 1 : 0))),
            loadedContextChecksums,
            loadedScopeInstructionContext: String(context?.scope_instruction_loaded_context || "").slice(0, 24_000),
        },
        scopeInstructionCatalog,
        availableDetailTools: [
            "list_projects", "inspect_project", "list_groups", "list_tasks", "inspect_mission", "inspect_supervision",
            "list_cron", "inspect_system", "query_global_memory", "query_knowledge", "read_global_shared_files", "read_scope_instruction",
        ],
        sourceInquiryTools: ["request_project_source_inquiry", "request_group_source_inquiry"],
        memoryContextBoundary: context?.memory_context_boundary || {
            group_session_context_included: false,
            group_memory_included: false,
            project_memory_included: false,
        },
        contentStored: false,
    };
}
function buildGlobalAgentContextEnvelopeV2(input) {
    const loadedContextChecksums = uniqueChecksums(input.loadedContextChecksums || []);
    const sessionContextChecksum = digest(input.sessionContext);
    return {
        schema: "ccm-global-agent-context-envelope-v2",
        identity: {
            scope: "global",
            scopeId: "global",
            exactSessionId: clean(input.exactSessionId, 180),
            generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        },
        stablePrefixChecksum: digest(input.stablePrefix),
        routingDirectoryChecksum: input.routingDirectory.checksum,
        sessionContextChecksum,
        loadedContextChecksums,
        turnContextChecksum: digest(input.turnContext),
        layerTokens: {
            stablePrefix: tokens(input.stablePrefix),
            routingDirectory: tokens(input.routingDirectory),
            sessionContext: tokens(input.sessionContext),
            turnContext: tokens(input.turnContext),
            toolResults: tokens(input.toolResults),
        },
        contentStored: false,
    };
}
function alignGlobalAgentContextEnvelopeTokens(envelope, totalTokensInput) {
    if (!envelope)
        return undefined;
    const totalTokens = Math.max(0, Math.floor(Number(totalTokensInput || 0)));
    const entries = Object.entries(envelope.layerTokens);
    const measured = entries.reduce((sum, [, value]) => sum + Math.max(0, Number(value || 0)), 0);
    const layerTokens = {};
    let used = 0;
    entries.forEach(([key, value], index) => {
        const next = index === entries.length - 1
            ? totalTokens - used
            : measured > 0 ? Math.floor((Math.max(0, Number(value || 0)) / measured) * totalTokens) : 0;
        layerTokens[key] = Math.max(0, next);
        used += layerTokens[key];
    });
    return { ...envelope, layerTokens };
}
//# sourceMappingURL=global-agent-context-envelope.js.map