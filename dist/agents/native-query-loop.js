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
exports.NATIVE_CONTROL_TOOL_NAMES = void 0;
exports.isNativeControlTool = isNativeControlTool;
exports.nativeControlToolDefinitions = nativeControlToolDefinitions;
exports.nativeDiscoveryToolDefinitions = nativeDiscoveryToolDefinitions;
exports.catalogToNativeTools = catalogToNativeTools;
exports.shouldUseNativeQueryLoop = shouldUseNativeQueryLoop;
exports.mapNativeTurnToParsed = mapNativeTurnToParsed;
exports.unstreamedTurnText = unstreamedTurnText;
exports.mergeNativeTurnParsed = mergeNativeTurnParsed;
exports.runNativeQueryLoop = runNativeQueryLoop;
exports.runNativeQueryLoopSelfTest = runNativeQueryLoopSelfTest;
const crypto = __importStar(require("crypto"));
const provider_cache_stable_tools_1 = require("../system/provider-cache-stable-tools");
const provider_cache_message_layout_1 = require("../system/provider-cache-message-layout");
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const provider_native_tool_capability_1 = require("../system/provider-native-tool-capability");
const agent_loop_budget_1 = require("../system/agent-loop-budget");
const readonly_tool_concurrency_1 = require("../system/readonly-tool-concurrency");
const conversation_plan_mode_gate_1 = require("../system/conversation-plan-mode-gate");
const main_agent_turn_1 = require("./main-agent-turn");
const native_query_messages_1 = require("./native-query-messages");
const presented_plan_quality_1 = require("./presented-plan-quality");
const tool_result_storage_1 = require("../tools/tool-result-storage");
const implementation_plan_1 = require("./implementation-plan");
const planning_orchestrator_1 = require("./planning-orchestrator");
const evidence_policy_1 = require("./evidence-policy");
const agent_cache_affinity_1 = require("../system/agent-cache-affinity");
const pre_request_tool_context_1 = require("../system/pre-request-tool-context");
const agent_cache_affinity_2 = require("../system/agent-cache-affinity");
exports.NATIVE_CONTROL_TOOL_NAMES = ["ccm_ask_user", "ccm_present_plan", "ccm_dispatch"];
const CONTROL_TOOL_SET = new Set(exports.NATIVE_CONTROL_TOOL_NAMES);
function isNativeControlTool(name) {
    return CONTROL_TOOL_SET.has(String(name || ""));
}
function nativeControlToolDefinitions() {
    return [
        {
            name: "ccm_ask_user",
            description: "Ask a business clarification that requires user confirmation. The UI renders selectable cards. Provide question and one to three structuredClarificationQuestions with labels and options; do not end with an unstructured question. Use only when the missing answer changes approach, scope, or acceptance; use read-only tools for facts that code or documents can establish.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["question"],
                properties: {
                    question: { type: "string", description: "Short user-facing introduction; do not replace the option card." },
                    structuredClarificationQuestions: {
                        type: "array",
                        minItems: 1,
                        maxItems: 3,
                        description: "Option-card questions. Each item needs a label; choice questions also need two to four options.",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["label"],
                            properties: {
                                id: { type: "string" },
                                label: { type: "string" },
                                type: { type: "string", description: "single | multiple | text" },
                                reason: { type: "string" },
                                options: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        additionalProperties: false,
                                        properties: {
                                            id: { type: "string" },
                                            label: { type: "string" },
                                            description: { type: "string" },
                                            recommended: { type: "boolean" },
                                            safeDefault: { type: "boolean" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    questions: { type: "array", items: { type: "object" }, description: "Alias for structuredClarificationQuestions." },
                    workflowDecision: { type: "object" },
                },
            },
        },
        {
            name: "ccm_present_plan",
            description: "Submit a read-only ccm-implementation-plan-v2 for user confirmation when the server-side hybrid planning gate requires it. Never dispatch or edit files while authoring. User-visible strings follow the conversation language; Chinese sessions use natural Simplified Chinese.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["plan"],
                properties: {
                    reply: { type: "string", description: "Short user-facing introduction; do not replace plan.steps." },
                    plan: {
                        type: "object",
                        additionalProperties: false,
                        required: ["title", "context", "goal", "approach", "scope", "files", "steps", "verification", "risks", "exclusions", "openQuestions"],
                        properties: {
                            schema: { type: "string", enum: ["ccm-implementation-plan-v2"] },
                            title: { type: "string", description: "Short user-visible plan title" },
                            context: { type: "string", description: "Why the change is needed, based on evidence" },
                            goal: { type: "string", description: "Desired user-visible outcome and operational boundary" },
                            approach: { type: "string", description: "One recommended implementation approach" },
                            overview: { type: "string", description: "Legacy alias for context/goal" },
                            files: { type: "array", items: { type: "object" }, description: "Real relative paths with project, reason, and sourceEvidenceIds" },
                            steps: {
                                type: "array",
                                minItems: 1,
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["id", "title", "objective", "dependsOn", "acceptance"],
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string", description: "One demonstrable slice; do not write a generic todo or outcome label." },
                                        objective: { type: "string", description: "Specific objective for this slice" },
                                        dependsOn: { type: "array", items: { type: "string" } },
                                        acceptance: { type: "array", items: { type: "string" } },
                                        description: { type: "string", description: "Legacy alias for objective" },
                                        outcome: { type: "string", description: "Legacy alias for acceptance" },
                                    },
                                },
                            },
                            verification: { type: "array", items: { type: "object" } },
                            risks: { type: "array", items: { type: "string" } },
                            openQuestions: { type: "array", items: { type: "string" } },
                            revision: { type: "integer", minimum: 1 },
                            checksum: { type: "string" },
                            promptVersion: { type: "string" },
                            outputLanguage: { type: "string" },
                            contentStored: { type: "boolean", enum: [false] },
                            expectedResults: { type: "array", items: { type: "string" } },
                            exclusions: { type: "array", items: { type: "string" } },
                            scope: { type: "array", items: { type: "string" } },
                        },
                    },
                    workflowDecision: { type: "object" },
                },
            },
        },
        {
            name: "ccm_dispatch",
            description: "Dispatch project Agents or create a development task. Provide self-contained work orders and do not call without execution authorization.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["targets"],
                properties: {
                    friendlyResponse: { type: "string" },
                    targets: {
                        type: "array",
                        items: { type: "object" },
                        description: "Self-contained work orders by project. Cover confirmed plan slices and identify each covered slice. Never put TestAgent in targets.",
                    },
                    workflowDecision: { type: "object" },
                    architecturePlan: {
                        type: "object",
                        description: "dependencySteps may schedule projects and dependencies; do not rewrite a confirmed plan as frontend/backend/test workstreams.",
                    },
                    coordinationPlan: { type: "object" },
                },
            },
        },
    ];
}
function nativeDiscoveryToolDefinitions() {
    return [
        {
            name: "read_scope_instruction",
            description: "Read one authorized scope cognition document. Use the documentId from the lightweight catalog; the Markdown body is loaded only after this call.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["documentId"],
                properties: {
                    documentId: { type: "string" },
                    expectedChecksum: { type: "string" },
                },
            },
        },
        {
            name: "tool_search",
            description: "Discover and load schemas for infrequent read-only tools on demand. Invoke a returned extension schema through invoke_mcp.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["query"],
                properties: {
                    query: { type: "string", description: "Tool name, capability description, or select:canonicalName." },
                    max_results: { type: "integer", minimum: 1, maximum: 24 },
                },
            },
        },
        {
            name: "invoke_mcp",
            description: "Invoke one MCP tool whose exact schema was loaded by tool_search in this Run. Pass the returned canonical tool name and its validated input object.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["name", "input"],
                properties: {
                    name: { type: "string", description: "Canonical tool name returned by tool_search." },
                    input: { type: "object", description: "Arguments matching the loaded tool schema." },
                },
            },
        },
        {
            name: "invoke_skill",
            description: "Load and invoke a Skill authorized for the current scope.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["name"],
                properties: {
                    name: { type: "string" },
                    input: { description: "Complete goal or necessary context for this turn." },
                },
            },
        },
    ];
}
function catalogLoadedTools(toolContext) {
    const stableServers = new Set(["ccm__workspace_readonly", "ccm-group-readonly", "ccm-project-readonly"]);
    const loaded = [...(toolContext?.catalog?.loadedMcp || [])]
        .filter((tool) => stableServers.has(String(tool?.server || "")));
    const names = new Set(loaded.map((tool) => String(tool?.canonicalName || tool?.name || "")));
    for (const tool of [...(toolContext?.catalog?.mcp || []), ...(toolContext?.catalog?.discoverableMcp || [])]) {
        const server = String(tool?.server || "");
        const name = String(tool?.canonicalName || tool?.name || "");
        if (!name || names.has(name))
            continue;
        if (stableServers.has(server)) {
            loaded.push({ ...tool, deferred: false });
            names.add(name);
        }
    }
    return loaded;
}
function catalogNativeToolName(tool) {
    return String(tool?.server || "") === "ccm__workspace_readonly"
        ? String(tool?.name || "")
        : String(tool?.canonicalName || tool?.name || "");
}
// Provider prompt caching compares the serialized tool surface.  Catalog
// responses are allowed to arrive in a different order, and JSON object key
// order is not semantically meaningful, so normalize both before encoding.
// This keeps the stable tool prefix identical across sessions and refreshes
// without changing the authorization boundary or exposing catalog contents.
function canonicalToolValue(value) {
    if (Array.isArray(value))
        return value.map(canonicalToolValue);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalToolValue(value[key])]));
    }
    return value;
}
const NATIVE_TOOL_SCHEMA_CACHE = new Map();
const NATIVE_TOOL_SCHEMA_CACHE_LIMIT = 128;
function memoizeNativeToolSchema(tools) {
    const canonical = tools.map(tool => ({
        name: String(tool?.name || ""),
        description: String(tool?.description || ""),
        inputSchema: canonicalToolValue(tool?.inputSchema || {}),
        ...(tool?.deferred === true ? { deferred: true } : {}),
    }));
    const key = crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
    const cached = NATIVE_TOOL_SCHEMA_CACHE.get(key);
    if (cached)
        return cached;
    const snapshot = tools.map(tool => ({
        ...tool,
        inputSchema: canonicalToolValue(tool?.inputSchema || {}),
    }));
    NATIVE_TOOL_SCHEMA_CACHE.set(key, snapshot);
    if (NATIVE_TOOL_SCHEMA_CACHE.size > NATIVE_TOOL_SCHEMA_CACHE_LIMIT) {
        const oldest = NATIVE_TOOL_SCHEMA_CACHE.keys().next().value;
        if (oldest)
            NATIVE_TOOL_SCHEMA_CACHE.delete(oldest);
    }
    return snapshot;
}
function catalogToNativeTools(toolContext) {
    const discovery = nativeDiscoveryToolDefinitions();
    const reserved = new Set(discovery.map(tool => tool.name));
    const loaded = catalogLoadedTools(toolContext).map((tool) => ({ ...tool, deferred: false }));
    const catalog = loaded.map((tool) => ({
        name: catalogNativeToolName(tool),
        description: String(tool.description || ""),
        inputSchema: canonicalToolValue(tool.inputSchema || { type: "object", properties: {} }),
        deferred: tool.deferred === true,
    })).filter((tool) => tool.name && !reserved.has(tool.name))
        .sort((left, right) => left.name.localeCompare(right.name));
    return memoizeNativeToolSchema([...discovery, ...catalog]);
}
function shouldUseNativeQueryLoop(config) {
    if (config?.forceNativeQueryLoop === true)
        return true;
    if (String(config?.providerNativeToolsMode || config?.provider_native_tools_mode || "auto").toLowerCase() === "json")
        return false;
    const family = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config) ? "anthropic" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini" : "openai";
    return (0, provider_native_tool_capability_1.readProviderNativeToolCapability)(config, family)[0]?.status !== "unsupported";
}
function mapNativeTurnToParsed(turn, controlCalls = []) {
    const text = String(turn?.text || "").trim();
    const ask = controlCalls.find(item => item.name === "ccm_ask_user");
    const plan = controlCalls.find(item => item.name === "ccm_present_plan");
    const dispatch = controlCalls.find(item => item.name === "ccm_dispatch");
    if (dispatch) {
        const args = dispatch.arguments || {};
        return {
            responseType: "dispatch",
            shouldDelegate: true,
            reply: String(args.friendlyResponse || args.reply || text || ""),
            friendlyResponse: String(args.friendlyResponse || args.reply || text || ""),
            targets: Array.isArray(args.targets) ? args.targets : [],
            workflowDecision: args.workflowDecision || args.workflow_decision || { reason: "主 Agent 已请求派发", actionRequired: true, requiresCodeChanges: true },
            architecturePlan: args.architecturePlan || args.architecture_plan || null,
            coordinationPlan: args.coordinationPlan || args.coordination_plan || null,
        };
    }
    if (plan) {
        const args = plan.arguments || {};
        const normalizedPlan = args.plan?.schema === "ccm-implementation-plan-v2"
            ? (0, implementation_plan_1.normalizeImplementationPlanV2)(args.plan, { planId: args.plan?.planId || args.plan?.plan_id })
            : null;
        return {
            responseType: "plan",
            shouldDelegate: false,
            reply: String(args.reply || text || ""),
            friendlyResponse: String(args.reply || text || ""),
            plan: normalizedPlan || args.plan || null,
            workflowDecision: args.workflowDecision || args.workflow_decision || { reason: "当前精确会话正在展示计划", actionRequired: false, requiresCodeChanges: false },
        };
    }
    if (ask) {
        const args = ask.arguments || {};
        const question = String(args.question || args.reply || text || "");
        const structuredQuestions = Array.isArray(args.structuredClarificationQuestions) && args.structuredClarificationQuestions.length
            ? args.structuredClarificationQuestions
            : Array.isArray(args.questions) ? args.questions : [];
        return {
            responseType: "clarify",
            shouldDelegate: false,
            reply: question,
            questionForUser: question,
            dispatchPolicy: {
                action: "ask_user",
                reason: question,
                structuredClarificationQuestions: structuredQuestions,
            },
            workflowDecision: {
                ...(args.workflowDecision || args.workflow_decision || { reason: "需要用户澄清", actionRequired: false, requiresCodeChanges: false }),
                structuredClarificationQuestions: structuredQuestions,
                clarificationQuestions: question ? [question] : [],
            },
        };
    }
    return {
        responseType: "reply",
        shouldDelegate: false,
        reply: text,
        friendlyResponse: text,
        directResponse: text,
        workflowDecision: { reason: "直接回复", actionRequired: false, requiresCodeChanges: false },
    };
}
function claimsUnsubmittedDispatch(text) {
    const value = String(text || "").trim();
    if (!value)
        return false;
    if (/(?:不会|不能|不应|无需|不要|未能|无法).{0,16}(?:派发|分派|dispatch)/i.test(value))
        return false;
    return /(?:我|主\s*Agent).{0,24}(?:将|会|立即|现在|准备|正在).{0,24}(?:派发|分派|dispatch)|(?:派发|分派|dispatch).{0,24}(?:子\s*Agent|项目\s*Agent|project\s+agent)/i.test(value);
}
function explicitlyRequestsDispatch(messages) {
    const userText = messages
        .filter(message => message?.role === "user")
        .map(message => typeof message.content === "string" ? message.content : JSON.stringify(message.content || ""))
        .join("\n")
        .trim();
    if (!userText)
        return false;
    if (/(?:不要|无需|不必|禁止|仅回答|只回答).{0,20}(?:派发|分派|dispatch)/i.test(userText))
        return false;
    return /(?:请|立即|直接|现在|务必)?.{0,8}(?:派发|分派).{0,32}(?:子\s*Agent|项目\s*Agent|Agent)|(?:please\s+)?dispatch.{0,40}(?:project\s+)?agent/i.test(userText);
}
function nativePromptTooLong(error) {
    const code = String(error?.code || error?.status || error?.statusCode || "").toLowerCase();
    const message = String(error?.message || error || "").toLowerCase();
    return code === "413" || code.includes("prompt_too_long") || code.includes("context_length")
        || /prompt.{0,20}too long|context.{0,20}(limit|length|window)|maximum context|too many tokens/.test(message);
}
function mergeUsage(current, next) {
    if (!next)
        return current;
    if (!current)
        return next;
    return {
        inputTokens: Number(current.inputTokens || 0) + Number(next.inputTokens || 0),
        outputTokens: Number(current.outputTokens || 0) + Number(next.outputTokens || 0),
        totalTokens: Number(current.totalTokens || 0) + Number(next.totalTokens || 0),
        reported: current.reported !== false && next.reported !== false,
    };
}
function fingerprintCall(call) {
    return JSON.stringify({ name: call.name, arguments: call.arguments || {} });
}
function unstreamedTurnText(turnText, emitted) {
    const text = String(turnText || "");
    const already = String(emitted || "");
    if (!text.trim())
        return "";
    if (!already)
        return text;
    if (text.startsWith(already))
        return text.slice(already.length);
    return "";
}
function parsedReply(parsed) {
    return String(parsed?.reply || parsed?.friendlyResponse || parsed?.directResponse || "").trim();
}
function parsedPlan(parsed) {
    const plan = parsed?.plan;
    return plan && typeof plan === "object" ? plan : null;
}
function mergeNativeTurnParsed(previous, next) {
    const prev = previous && typeof previous === "object" ? previous : {};
    const curr = next && typeof next === "object" ? next : {};
    const prevReply = parsedReply(prev);
    const currReply = parsedReply(curr);
    const prevPlan = parsedPlan(prev);
    const currPlan = parsedPlan(curr);
    const currHasPlanSteps = Array.isArray(currPlan?.steps) && currPlan.steps.length > 0;
    const prevHasPlanSteps = Array.isArray(prevPlan?.steps) && prevPlan.steps.length > 0;
    const reply = currReply || prevReply;
    const currType = String(curr.responseType || curr.response_type || "").trim();
    const prevType = String(prev.responseType || prev.response_type || "").trim();
    const keepClarify = prevType === "clarify" && !["dispatch", "plan"].includes(currType);
    const keepPreviousType = !currReply && !currHasPlanSteps && !["clarify", "dispatch", "plan"].includes(currType);
    const merged = {
        ...prev,
        ...curr,
        reply,
        friendlyResponse: String(curr.friendlyResponse || "").trim() || String(prev.friendlyResponse || "").trim() || reply,
        directResponse: String(curr.directResponse || "").trim() || String(prev.directResponse || "").trim() || reply,
        plan: currHasPlanSteps ? currPlan : (prevHasPlanSteps ? prevPlan : (currPlan || prevPlan)),
        responseType: keepClarify ? "clarify" : (keepPreviousType ? (prev.responseType || curr.responseType || "reply") : (curr.responseType || prev.responseType || "reply")),
    };
    if (keepClarify || currType === "clarify") {
        merged.questionForUser = String(curr.questionForUser || curr.question_for_user || prev.questionForUser || prev.question_for_user || "").trim();
        merged.dispatchPolicy = {
            ...(prev.dispatchPolicy || {}),
            ...(curr.dispatchPolicy || {}),
            action: "ask_user",
            structuredClarificationQuestions: curr.dispatchPolicy?.structuredClarificationQuestions?.length
                ? curr.dispatchPolicy.structuredClarificationQuestions
                : (prev.dispatchPolicy?.structuredClarificationQuestions || curr.workflowDecision?.structuredClarificationQuestions || prev.workflowDecision?.structuredClarificationQuestions || []),
        };
        merged.workflowDecision = {
            ...(prev.workflowDecision || {}),
            ...(curr.workflowDecision || {}),
            structuredClarificationQuestions: curr.workflowDecision?.structuredClarificationQuestions?.length
                ? curr.workflowDecision.structuredClarificationQuestions
                : (prev.workflowDecision?.structuredClarificationQuestions || []),
            clarificationQuestions: curr.workflowDecision?.clarificationQuestions?.length
                ? curr.workflowDecision.clarificationQuestions
                : (prev.workflowDecision?.clarificationQuestions || []),
        };
    }
    if (["dispatch", "plan"].includes(currType) && !keepClarify) {
        merged.questionForUser = "";
    }
    return merged;
}
function stampPresentedPlanQuality(parsed, repaired) {
    if (!parsed?.plan || typeof parsed.plan !== "object")
        return parsed;
    const attached = (0, presented_plan_quality_1.attachPresentedPlanQuality)(parsed.plan, { repaired });
    return { ...parsed, plan: attached.plan, planQuality: attached.quality };
}
function presentPlanControlCall(controlCalls) {
    return (controlCalls || []).find(item => item.name === "ccm_present_plan") || null;
}
function persistExecutedToolRows(rows, persistContext) {
    if (!persistContext?.scope || !persistContext?.sessionId)
        return rows;
    return (0, tool_result_storage_1.persistNativeToolResultRows)(rows, persistContext).rows;
}
function nativePlanningIntensityInput(plan, workflowDecision) {
    const projects = new Set();
    for (const file of Array.isArray(plan?.files) ? plan.files : [])
        if (String(file?.project || "").trim())
            projects.add(String(file.project).trim());
    const explicitIndependentModules = Math.max(0, Number(workflowDecision?.independentModuleCount
        || workflowDecision?.independent_module_count
        || 0));
    return {
        projectCount: Math.max(1, projects.size),
        independentModuleCount: workflowDecision?.needsEpicDecomposition === true || workflowDecision?.needs_epic_decomposition === true
            ? Math.max(2, Array.isArray(workflowDecision?.impactScope || workflowDecision?.impact_scope) ? (workflowDecision.impactScope || workflowDecision.impact_scope).length : 2)
            : Math.max(1, explicitIndependentModules),
        riskLevel: String(workflowDecision?.riskLevel || workflowDecision?.risk_level || "low"),
        hasArchitectureOrPublicContractChange: workflowDecision?.needsEpicDecomposition === true
            || workflowDecision?.needs_epic_decomposition === true
            || projects.size > 1,
        scopeUncertain: Array.isArray(plan?.openQuestions) && plan.openQuestions.length > 0,
    };
}
function nativeEvidencePolicy(plan, workflowDecision) {
    const projects = Array.from(new Set([
        ...(Array.isArray(plan?.businessRequirement?.targetProjects) ? plan.businessRequirement.targetProjects : []),
        ...(Array.isArray(plan?.files) ? plan.files.map((item) => item?.project) : []),
    ].map(value => String(value || "").trim()).filter(Boolean)));
    return (0, evidence_policy_1.resolveEvidencePolicy)({
        requiresCodeChanges: workflowDecision?.requiresCodeChanges !== false,
        targetProjects: projects,
        riskLevel: workflowDecision?.riskLevel || workflowDecision?.risk_level || "write",
        hasArchitectureOrPublicContractChange: workflowDecision?.hasArchitectureOrPublicContractChange === true
            || workflowDecision?.has_architecture_or_public_contract_change === true,
        hasPermissionOrSecurityChange: workflowDecision?.hasPermissionOrSecurityChange === true
            || workflowDecision?.has_permission_or_security_change === true,
        hasMigration: workflowDecision?.hasMigration === true || workflowDecision?.has_migration === true,
        hasReleaseOrDeployment: workflowDecision?.hasReleaseOrDeployment === true
            || workflowDecision?.has_release_or_deployment === true,
        destructive: workflowDecision?.destructive === true,
        scopeExpanded: workflowDecision?.scopeExpanded === true || workflowDecision?.scope_expanded === true,
        verificationModes: workflowDecision?.verificationModes || workflowDecision?.verification_modes,
        changeClass: workflowDecision?.changeClass || workflowDecision?.change_class,
        previousLevel: plan?.evidencePolicy?.level,
    });
}
async function independentNativePlanReview(config, plan, evidenceManifest, input) {
    const options = {
        messages: [
            { role: "system", content: (0, planning_orchestrator_1.planningReviewSystemPrompt)() },
            { role: "user", content: (0, planning_orchestrator_1.planningReviewInputPrompt)(plan, evidenceManifest) },
        ],
        maxTokens: Math.min(4096, Math.max(1200, Number(input.maxTokens || 4096))),
        retryProfile: "background_auxiliary",
        signal: input.signal,
        providerContextCache: {
            ...(input.providerContextCache || {
                scope: input.scope,
                scopeId: input.scopeId,
                sessionId: input.exactSessionId,
            }),
            source: `${input.scope}_plan_review`,
            cacheAffinity: (0, agent_cache_affinity_1.planReviewerCacheAffinity)({
                scope: input.scope,
                scopeId: input.scopeId,
                exactSessionId: input.exactSessionId,
                generation: input.providerContextCache?.generation,
            }),
        },
        onProviderContextCache: input.onProviderContextCache,
    };
    return (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, options)
        : (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, options);
}
async function runJsonQueryLoop(input) {
    const budget = input.loopBudget || (0, agent_loop_budget_1.resolveAgentLoopBudget)(input.config);
    const executeTools = async (calls, ctx) => (persistExecutedToolRows(await input.executeTools(calls, ctx), input.persistContext));
    let messages = input.messages.slice();
    const responseTypes = "reply|tool_calls|clarify|plan|dispatch";
    const jsonHint = { role: "system", content: "Fallback protocol: return one JSON object as the outer envelope, never a Markdown code fence. Use responseType=" + responseTypes + ". The reply string is user-visible and may use concise GitHub-Flavored Markdown when structure improves readability. A plan must contain a ccm-implementation-plan-v2 object; dispatch is allowed only after confirmed plan binding or a server-approved direct path. Format: {\"responseType\":\"reply\",\"reply\":\"\",\"toolRequests\":[{\"name\":\"\",\"arguments\":{}}],\"workflowDecision\":{}}" };
    if (!messages.some(item => String(item.content || "").includes("退化路径：只输出一个 JSON")))
        messages = [jsonHint, ...messages];
    let parsed = { responseType: "reply", reply: "" };
    const toolResults = [];
    let modelCallCount = 0;
    let toolRoundCount = 0;
    let toolCallCount = 0;
    let noProgressCount = 0;
    let usage = null;
    let stopReason = "model_completed";
    const executed = new Set();
    let ptlRecoveryAttempts = 0;
    let conversationPressureAttempts = 0;
    const ptlDroppedMessageIds = [];
    while (true) {
        modelCallCount += 1;
        const modelLifecycle = input.onModelCallStart?.({
            round: toolRoundCount,
            modelCallIndex: modelCallCount,
            modelCallStage: input.providerContextCache?.cacheAffinity
                ? (0, agent_cache_affinity_2.createModelCallStage)({ affinity: input.providerContextCache.cacheAffinity, modelCallIndex: modelCallCount })
                : undefined,
        }) || undefined;
        // JSON-tool providers still receive a real canonical request. Their tool
        // contract is already embedded in the message payload, so report the
        // exact messages and no native tool schemas before transport dispatch.
        // This keeps project/group/global accounting available without rebuilding
        // a synthetic payload when native tool calling is unavailable.
        const jsonOptions = {
            messages,
            maxTokens: input.maxTokens || 4096,
            retryProfile: input.retryProfile || "interactive_first_turn",
            signal: input.signal,
            onDelta: (delta) => {
                modelLifecycle?.onDelta(delta);
                input.onDelta?.(delta, { modelCallIndex: modelCallCount, round: toolRoundCount });
            },
            onUsage: (value) => { usage = mergeUsage(usage, value); input.onUsage?.(value); },
            onRetry: (notice) => {
                modelLifecycle?.onRetry(Math.max(1, Number(notice?.attempt || 1)), Math.max(1, Number(notice?.maxAttempts || 1) - 1), Math.max(0, Number(notice?.delayMs || 0)));
                input.onRetry?.(notice);
            },
            onProviderRequestActivity: (activity) => {
                modelLifecycle?.onProviderRequestActivity?.(activity);
            },
            onProviderStreamActivity: (activity) => {
                const projected = { ...activity, modelCallIndex: modelCallCount, round: toolRoundCount };
                if (projected.kind === "tool_call_declared")
                    modelLifecycle?.onToolDeclared?.(String(projected.toolName || ""));
                input.onProviderStreamActivity?.(projected);
            },
            providerContextCache: input.providerContextCache || {
                scope: input.scope,
                scopeId: input.scopeId,
                sessionId: input.exactSessionId,
                source: `${input.scope}_main_json_query`,
            },
            onProviderContextCache: input.onProviderContextCache,
        };
        let nextParsed = null;
        let preRequest = null;
        let preRequestBound = false;
        for (;;) {
            const canonicalPayload = input.onCanonicalPayload?.({
                messages,
                tools: [],
                modelCallIndex: modelCallCount,
                round: toolRoundCount,
            });
            jsonOptions.providerContextCache = {
                ...jsonOptions.providerContextCache,
                canonicalPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
            };
            preRequest = (0, pre_request_tool_context_1.stagePreRequestToolContext)({
                scope: input.scope,
                scopeId: input.scopeId,
                exactSessionId: input.exactSessionId,
                messages,
                providerPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                tokensBefore: Number(canonicalPayload?.totalTokens || 0),
                config: input.config,
                generation: Number(input.providerContextCache?.cacheAffinity?.generation || input.providerContextCache?.generation || 0),
                attempt: Number(input.providerContextCache?.cacheAffinity?.attempt || 1),
                currentToolCallIds: toolResults.map(row => row.callId),
            });
            if (preRequest.changed) {
                messages = preRequest.messages;
                continue;
            }
            if (Number(preRequest.evaluation.tokensAfter || 0) >= Number(preRequest.evaluation.thresholdTokens || Number.MAX_SAFE_INTEGER)
                && conversationPressureAttempts < 1
                && input.onConversationContextPressure) {
                const recovered = await input.onConversationContextPressure({
                    messages,
                    tools: [],
                    modelCallIndex: modelCallCount,
                    round: toolRoundCount,
                    forcePromptTooLong: false,
                    preRequestEvaluation: preRequest.evaluation,
                });
                if (Array.isArray(recovered) && JSON.stringify(recovered) !== JSON.stringify(messages)) {
                    conversationPressureAttempts += 1;
                    messages = recovered;
                    continue;
                }
            }
            if (Number(preRequest.evaluation.tokensAfter || 0) >= Number(preRequest.evaluation.thresholdTokens || Number.MAX_SAFE_INTEGER)) {
                const error = new Error(`请求前上下文压缩后仍超过容量线：${preRequest.evaluation.tokensAfter}/${preRequest.evaluation.thresholdTokens}`);
                error.code = "CCM_PRE_REQUEST_CONTEXT_CAPACITY_EXCEEDED";
                error.preRequestEvaluation = preRequest.evaluation;
                throw error;
            }
            (0, pre_request_tool_context_1.bindPreRequestToolContext)({
                scope: input.scope,
                scopeId: input.scopeId,
                exactSessionId: input.exactSessionId,
                requestId: preRequest.evaluation.requestId,
                providerPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                toolCallIds: preRequest.pendingToolCallIds,
                tokensAfter: Number(canonicalPayload?.totalTokens || 0),
            });
            preRequestBound = true;
            try {
                const attemptOptions = { ...jsonOptions, messages };
                nextParsed = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(input.config)
                    ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(input.config, attemptOptions)
                    : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(input.config, attemptOptions);
                if (preRequestBound && preRequest)
                    (0, pre_request_tool_context_1.commitPreRequestToolContext)(input.scope, input.scopeId, input.exactSessionId, preRequest.evaluation.requestId);
                modelLifecycle?.complete();
                break;
            }
            catch (error) {
                if (preRequestBound && preRequest)
                    (0, pre_request_tool_context_1.abortPreRequestToolContext)(input.scope, input.scopeId, input.exactSessionId, preRequest.evaluation.requestId);
                if (!nativePromptTooLong(error) || ptlRecoveryAttempts >= 1) {
                    modelLifecycle?.fail(error);
                    throw error;
                }
                ptlRecoveryAttempts += 1;
                const forced = (0, pre_request_tool_context_1.stagePreRequestToolContext)({
                    scope: input.scope,
                    scopeId: input.scopeId,
                    exactSessionId: input.exactSessionId,
                    messages,
                    providerPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                    tokensBefore: Number(canonicalPayload?.totalTokens || 0),
                    config: input.config,
                    generation: Number(input.providerContextCache?.cacheAffinity?.generation || input.providerContextCache?.generation || 0),
                    attempt: Number(input.providerContextCache?.cacheAffinity?.attempt || 1),
                    currentToolCallIds: toolResults.map(row => row.callId),
                    forcePromptTooLong: true,
                });
                if (!forced.changed) {
                    if (conversationPressureAttempts < 1 && input.onConversationContextPressure) {
                        const recovered = await input.onConversationContextPressure({
                            messages,
                            tools: [],
                            modelCallIndex: modelCallCount,
                            round: toolRoundCount,
                            forcePromptTooLong: true,
                            preRequestEvaluation: forced.evaluation,
                        });
                        if (Array.isArray(recovered) && JSON.stringify(recovered) !== JSON.stringify(messages)) {
                            conversationPressureAttempts += 1;
                            messages = recovered;
                            continue;
                        }
                    }
                    modelLifecycle?.fail(error);
                    throw error;
                }
                messages = forced.messages;
            }
        }
        parsed = mergeNativeTurnParsed(parsed, nextParsed);
        const requests = (Array.isArray(parsed?.toolRequests) ? parsed.toolRequests : Array.isArray(parsed?.tool_requests) ? parsed.tool_requests : [])
            .map((item, index) => ({
            id: `json_${toolRoundCount}_${index}`,
            name: String(item?.name || "").trim(),
            arguments: item?.arguments && typeof item.arguments === "object" ? item.arguments : {},
            argumentsChecksum: "",
        }))
            .filter((item) => item.name);
        if (!requests.length) {
            stopReason = "model_completed";
            break;
        }
        const fresh = requests.filter((item) => !executed.has(fingerprintCall(item)));
        if (!fresh.length) {
            noProgressCount += 1;
            messages.push({ role: "user", content: JSON.stringify({ error: "duplicate_tool_request" }) });
            if (noProgressCount >= budget.noProgressThreshold)
                throw new Error("JSON_QUERY_LOOP_NO_PROGRESS");
            toolRoundCount += 1;
            continue;
        }
        for (const item of fresh)
            executed.add(fingerprintCall(item));
        const rows = await executeTools(fresh, {
            round: toolRoundCount,
            turn: { text: String(parsed?.reply || ""), toolCalls: fresh, toolReferences: [], stopReason: "tool_calls", usage: usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } },
            signal: input.signal,
            startedCallIds: new Set(),
        });
        toolResults.push(...rows);
        toolCallCount += rows.length;
        messages.push({ role: "user", content: JSON.stringify({ toolResults: rows }) });
        toolRoundCount += 1;
        if (rows.some(row => row.ok === true))
            noProgressCount = 0;
        else
            noProgressCount += 1;
        if (noProgressCount >= budget.noProgressThreshold)
            throw new Error("JSON_QUERY_LOOP_NO_PROGRESS");
    }
    parsed = (0, conversation_plan_mode_gate_1.applyInteractiveConversationModePolicy)(input.scope, input.planModeEnabled === true, parsed);
    if (parsed?.responseType === "plan" && parsed?.plan && typeof parsed.plan === "object") {
        if (input.resolvePlanningEvidence) {
            const refreshed = await input.resolvePlanningEvidence(parsed.plan);
            if (Array.isArray(refreshed) && refreshed.length)
                toolResults.push(...refreshed);
        }
        const evidenceManifest = (0, planning_orchestrator_1.planningEvidenceManifestFromToolResults)(toolResults);
        let normalized = (0, implementation_plan_1.normalizeImplementationPlanV2)({ ...parsed.plan, sourceManifestChecksum: evidenceManifest.checksum }, { planId: parsed.plan.planId || parsed.plan.plan_id });
        if (!normalized) {
            const error = new Error("计划结构无效，无法进入复核");
            error.code = "CCM_PLAN_STRUCTURE_INVALID";
            throw error;
        }
        const evidencePolicy = nativeEvidencePolicy(normalized, parsed.workflowDecision);
        normalized = (0, planning_orchestrator_1.applyEvidencePolicyToPlan)({ ...normalized, evidencePolicy }, evidenceManifest, evidencePolicy);
        const planningSession = (0, planning_orchestrator_1.openPlanningSession)({
            scope: input.scope,
            scopeId: input.scopeId,
            exactSessionId: input.exactSessionId,
            planId: normalized.planId || `${input.scope}:${input.exactSessionId}`,
            sourceManifestChecksum: evidenceManifest.checksum,
            ...nativePlanningIntensityInput(normalized, parsed.workflowDecision),
        });
        const limits = (0, planning_orchestrator_1.planningAgentLimits)(planningSession.intensity);
        const localQuality = (0, presented_plan_quality_1.assessImplementationPlanQuality)(normalized, evidenceManifest, { allowedProjects: normalized.businessRequirement.targetProjects });
        const reviewer = limits.independentReview && !localQuality.issues.some(issue => issue.severity === "blocking")
            ? await independentNativePlanReview(input.config, normalized, evidenceManifest, input) : null;
        const receipt = (0, planning_orchestrator_1.buildPlanReviewReceipt)({ plan: normalized, evidenceManifest, reviewer, evidencePolicy, qualityReport: localQuality });
        if (receipt.qualityReport)
            normalized = { ...normalized, quality: { ...(normalized.quality || {}), report: receipt.qualityReport } };
        (0, planning_orchestrator_1.updatePlanningSession)(planningSession, {
            phase: (0, evidence_policy_1.isPlanReviewPassed)(receipt.verdict) ? "awaiting_user" : "invalidated",
            plan: normalized,
            planChecksum: normalized.checksum,
            sourceManifestChecksum: evidenceManifest.checksum,
            evidenceManifest,
            evidenceManifestChecksum: evidenceManifest.checksum,
            evidencePolicy,
            reviewReceipt: receipt,
            reviewReceiptChecksum: receipt.checksum,
        });
        if (!(0, evidence_policy_1.isPlanReviewPassed)(receipt.verdict)) {
            const error = new Error(`计划复核未通过：${receipt.issues.slice(0, 6).map(issue => issue.message).join("；")}`);
            error.code = "CCM_PLAN_REVIEW_BLOCKED";
            error.reviewReceipt = receipt;
            throw error;
        }
        parsed.plan = normalized;
    }
    parsed = stampPresentedPlanQuality(parsed, false);
    const decision = (0, main_agent_turn_1.normalizeMainAgentTurnDecision)({
        scope: input.scope,
        scopeId: input.scopeId,
        exactSessionId: input.exactSessionId,
        parsed,
        reply: parsed?.reply,
        planDraft: parsed?.plan,
        dispatchDraft: parsed?.targets,
        workflowDecision: parsed?.workflowDecision,
    });
    return {
        parsed,
        decision,
        text: String(parsed?.reply || ""),
        messages,
        toolResults,
        modelCallCount,
        toolRoundCount,
        toolCallCount,
        stopReason,
        usage,
        noProgressCount,
        continuationSegments: 0,
        family: (0, native_query_messages_1.nativeQueryFamily)(input.config),
        ptlRecoveryAttempts,
        ptlDroppedMessageIds,
    };
}
function fallBackToJsonQueryLoop(input, modelCallIndexOffset = 0) {
    if (input.jsonFallback)
        return input.jsonFallback();
    if (!modelCallIndexOffset || !input.onModelCallStart)
        return runJsonQueryLoop(input);
    // A provider can reject native tool calling only after the native lifecycle
    // has already started. Keep the JSON fallback on a new stable call identity
    // so its started/waiting/streaming states cannot overwrite that completed
    // native attempt in the direct SSE or authority repair stream.
    return runJsonQueryLoop({
        ...input,
        onModelCallStart: info => input.onModelCallStart?.({
            ...info,
            modelCallIndex: info.modelCallIndex + modelCallIndexOffset,
            modelCallStage: info.modelCallStage
                ? { ...info.modelCallStage, modelCallIndex: info.modelCallStage.modelCallIndex + modelCallIndexOffset }
                : undefined,
        }),
    });
}
async function runNativeQueryLoop(input) {
    if (!shouldUseNativeQueryLoop(input.config))
        return fallBackToJsonQueryLoop(input);
    const family = (0, native_query_messages_1.nativeQueryFamily)(input.config);
    const budget = input.loopBudget || (0, agent_loop_budget_1.resolveAgentLoopBudget)(input.config);
    const speculativeReadScheduler = (0, readonly_tool_concurrency_1.createReadonlyToolScheduler)(budget.readOnlyParallelism);
    const executeTools = async (calls, ctx) => (persistExecutedToolRows(await input.executeTools(calls, ctx), input.persistContext));
    const callTurn = input.callTurn || group_orchestrator_llm_client_1.callNativeAgentTurn;
    let messages = input.messages.slice();
    let planningSession = input.planModeEnabled === true
        ? (0, planning_orchestrator_1.openPlanningSession)({
            scope: input.scope,
            scopeId: input.scopeId,
            exactSessionId: input.exactSessionId,
            planId: `${input.scope}:${input.scopeId}:${input.exactSessionId}`,
            phase: "exploring",
        })
        : null;
    if (planningSession) {
        const cadence = (0, planning_orchestrator_1.planningPromptForTurn)(planningSession.promptTurn);
        messages = (0, provider_cache_message_layout_1.insertDynamicSystemAfterStableCore)(messages, cadence.prompt);
        input.onPlanningPhase?.({ phase: "exploring", intensity: planningSession.intensity });
    }
    let parsed = { responseType: "reply", reply: "" };
    let lastTurn = { text: "", toolCalls: [], toolReferences: [], stopReason: "", usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } };
    const toolResults = [];
    const executed = new Set();
    let modelCallCount = 0;
    let toolRoundCount = 0;
    let toolCallCount = 0;
    let noProgressCount = 0;
    let continuationSegments = 0;
    let segmentToolCalls = 0;
    let segmentModelTurns = 0;
    let segmentStartedAt = Date.now();
    let stopReason = "model_completed";
    let usage = null;
    let planRepairCount = 0;
    let ptlRecoveryAttempts = 0;
    let conversationPressureAttempts = 0;
    const ptlDroppedMessageIds = [];
    let controlToolRepairCount = 0;
    let incompleteAfterToolsRepairCount = 0;
    const isReadOnly = input.isReadOnly || ((call) => !isNativeControlTool(call.name)
        && call.name !== "invoke_skill"
        && call.name !== "tool_search"
        && call.name !== "invoke_mcp");
    const applyTranscript = (next) => input.compactTranscript ? input.compactTranscript(next) : next;
    const stableToolOrder = new Map();
    const availableTools = () => {
        const tools = input.getTools?.() || input.tools;
        // The planner is available in every scope. The model and the server-side
        // hybrid gate decide whether a plan is warranted; hiding it by UI mode
        // made complex work jump straight to dispatch.
        for (const tool of tools) {
            const name = String(tool?.name || "");
            if (name && !stableToolOrder.has(name))
                stableToolOrder.set(name, stableToolOrder.size);
        }
        return [...tools].sort((left, right) => {
            const leftOrder = stableToolOrder.get(String(left?.name || "")) ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = stableToolOrder.get(String(right?.name || "")) ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder || String(left?.name || "").localeCompare(String(right?.name || ""));
        });
    };
    const assessPresentedPlan = async (planCall) => {
        if (input.resolvePlanningEvidence) {
            const refreshed = await input.resolvePlanningEvidence(planCall.arguments?.plan);
            if (Array.isArray(refreshed) && refreshed.length)
                toolResults.push(...refreshed);
        }
        const evidenceManifest = (0, planning_orchestrator_1.planningEvidenceManifestFromToolResults)(toolResults);
        if (planningSession) {
            planningSession = (0, planning_orchestrator_1.openPlanningSession)({
                scope: input.scope,
                scopeId: input.scopeId,
                exactSessionId: input.exactSessionId,
                planId: planningSession.planId,
                sourceManifestChecksum: evidenceManifest.checksum,
                phase: "drafting",
                previousIntensity: planningSession.intensity,
            });
        }
        const rawPlan = planCall.arguments?.plan;
        let plan = (0, implementation_plan_1.normalizeImplementationPlanV2)({ ...rawPlan, sourceManifestChecksum: evidenceManifest.checksum }, {
            planId: rawPlan?.planId || rawPlan?.plan_id || planningSession?.planId,
            revision: planningSession?.revision || rawPlan?.revision || 1,
        });
        if (!plan) {
            const error = new Error("计划结构无效，无法进入复核");
            error.code = "CCM_PLAN_STRUCTURE_INVALID";
            throw error;
        }
        const evidencePolicy = nativeEvidencePolicy(plan, planCall.arguments?.workflowDecision || planCall.arguments?.workflow_decision);
        plan = (0, planning_orchestrator_1.applyEvidencePolicyToPlan)({ ...plan, evidencePolicy }, evidenceManifest, evidencePolicy);
        if (!planningSession) {
            planningSession = (0, planning_orchestrator_1.openPlanningSession)({
                scope: input.scope,
                scopeId: input.scopeId,
                exactSessionId: input.exactSessionId,
                planId: plan.planId,
                sourceManifestChecksum: evidenceManifest.checksum,
                ...nativePlanningIntensityInput(plan, planCall.arguments?.workflowDecision || planCall.arguments?.workflow_decision),
            });
        }
        planningSession = (0, planning_orchestrator_1.updatePlanningSession)(planningSession, {
            phase: "reviewing",
            plan,
            planChecksum: plan.checksum,
            sourceManifestChecksum: evidenceManifest.checksum,
            evidenceManifest,
            evidenceManifestChecksum: evidenceManifest.checksum,
            evidencePolicy,
        });
        input.onPlanningPhase?.({ phase: "drafting", intensity: planningSession.intensity, evidenceCount: evidenceManifest.entries.length });
        input.onPlanningPhase?.({ phase: "reviewing", intensity: planningSession.intensity, evidenceCount: evidenceManifest.entries.length });
        const limits = (0, planning_orchestrator_1.planningAgentLimits)(planningSession.intensity);
        const localQuality = (0, presented_plan_quality_1.assessImplementationPlanQuality)(plan, evidenceManifest, { allowedProjects: plan.businessRequirement.targetProjects });
        let reviewer = null;
        if (limits.independentReview && !localQuality.issues.some(issue => issue.severity === "blocking"))
            reviewer = await independentNativePlanReview(input.config, plan, evidenceManifest, input);
        const receipt = (0, planning_orchestrator_1.buildPlanReviewReceipt)({ plan, evidenceManifest, reviewer, evidencePolicy, qualityReport: localQuality });
        const qualityReport = receipt.qualityReport;
        if (qualityReport)
            plan = { ...plan, quality: { ...(plan.quality || {}), report: qualityReport } };
        const passed = (0, evidence_policy_1.isPlanReviewPassed)(receipt.verdict);
        planningSession = (0, planning_orchestrator_1.updatePlanningSession)(planningSession, {
            phase: passed ? "awaiting_user" : planRepairCount > 0 ? "invalidated" : "repairing",
            plan,
            planChecksum: plan.checksum,
            reviewReceipt: receipt,
            reviewReceiptChecksum: receipt.checksum,
        });
        input.onPlanningPhase?.({
            phase: passed ? "awaiting_user" : planRepairCount > 0 ? "invalidated" : "repairing",
            intensity: planningSession.intensity,
            evidenceCount: evidenceManifest.entries.length,
            issueCount: receipt.issues.length,
        });
        planCall.arguments = { ...(planCall.arguments || {}), plan };
        return { plan, receipt, passed };
    };
    try {
        queryLoop: while (true) {
            const round = toolRoundCount;
            modelCallCount += 1;
            segmentModelTurns += 1;
            const modelLifecycle = input.onModelCallStart?.({
                round,
                modelCallIndex: modelCallCount,
                modelCallStage: input.providerContextCache?.cacheAffinity
                    ? (0, agent_cache_affinity_2.createModelCallStage)({ affinity: input.providerContextCache.cacheAffinity, modelCallIndex: modelCallCount })
                    : undefined,
            }) || undefined;
            const started = new Map();
            const startedCallIds = new Set();
            const onNativeToolCallReady = (call) => {
                if (isNativeControlTool(call.name) || !isReadOnly(call) || started.has(call.id) || executed.has(fingerprintCall(call)))
                    return;
                startedCallIds.add(call.id);
                // Read-only tools may start speculatively while the Provider is still
                // finishing the current turn. Flush the already streamed narration
                // first so the persisted/user-visible order stays narration -> tool.
                input.onBeforeToolExecution?.({ round, modelCallIndex: modelCallCount, calls: [call] });
                started.set(call.id, speculativeReadScheduler.run(call, () => executeTools([call], {
                    round,
                    turn: lastTurn,
                    signal: input.signal,
                    startedCallIds,
                })).then(rows => rows[0] || { callId: call.id, name: call.name, ok: false, error: "empty_tool_result" }));
            };
            let turn;
            let turnEmitted = "";
            try {
                const requestTools = (0, provider_cache_stable_tools_1.stabilizeProviderCacheToolOrder)(availableTools(), {
                    scope: input.scope,
                    scopeId: input.scopeId,
                    sessionId: input.exactSessionId,
                    generation: input.providerContextCache?.generation,
                    boundaryGeneration: input.providerContextCache?.boundaryGeneration,
                    source: input.providerContextCache?.source,
                });
                const canonicalPayload = input.onCanonicalPayload?.({
                    messages,
                    tools: requestTools,
                    modelCallIndex: modelCallCount,
                    round,
                });
                let preRequest = (0, pre_request_tool_context_1.stagePreRequestToolContext)({
                    scope: input.scope,
                    scopeId: input.scopeId,
                    exactSessionId: input.exactSessionId,
                    messages,
                    providerPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                    tokensBefore: Number(canonicalPayload?.totalTokens || 0),
                    config: input.config,
                    generation: Number(input.providerContextCache?.cacheAffinity?.generation || input.providerContextCache?.generation || 0),
                    attempt: Number(input.providerContextCache?.cacheAffinity?.attempt || 1),
                    currentToolCallIds: toolResults.map(row => row.callId),
                });
                if (preRequest.changed) {
                    messages = preRequest.messages;
                    continue;
                }
                if (Number(preRequest.evaluation.tokensAfter || 0) >= Number(preRequest.evaluation.thresholdTokens || Number.MAX_SAFE_INTEGER)
                    && conversationPressureAttempts < 1
                    && input.onConversationContextPressure) {
                    const recovered = await input.onConversationContextPressure({
                        messages,
                        tools: requestTools,
                        modelCallIndex: modelCallCount,
                        round,
                        forcePromptTooLong: false,
                        preRequestEvaluation: preRequest.evaluation,
                    });
                    if (Array.isArray(recovered) && JSON.stringify(recovered) !== JSON.stringify(messages)) {
                        conversationPressureAttempts += 1;
                        messages = recovered;
                        continue queryLoop;
                    }
                }
                if (Number(preRequest.evaluation.tokensAfter || 0) >= Number(preRequest.evaluation.thresholdTokens || Number.MAX_SAFE_INTEGER)) {
                    const error = new Error(`请求前上下文压缩后仍超过容量线：${preRequest.evaluation.tokensAfter}/${preRequest.evaluation.thresholdTokens}`);
                    error.code = "CCM_PRE_REQUEST_CONTEXT_CAPACITY_EXCEEDED";
                    error.preRequestEvaluation = preRequest.evaluation;
                    throw error;
                }
                const serializedToolSchema = JSON.stringify(requestTools.map(tool => ({
                    name: String(tool?.name || ""),
                    description: String(tool?.description || ""),
                    inputSchema: tool?.inputSchema || null,
                })));
                const providerContextCache = {
                    ...(input.providerContextCache || {
                        scope: input.scope,
                        scopeId: input.scopeId,
                        sessionId: input.exactSessionId,
                        source: `${input.scope}_main_native_query`,
                    }),
                    canonicalPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                    toolSchemaChecksum: crypto.createHash("sha256").update(serializedToolSchema).digest("hex"),
                    toolSchemaTokens: Math.max(0, Math.ceil(serializedToolSchema.length / 4)),
                };
                (0, pre_request_tool_context_1.bindPreRequestToolContext)({
                    scope: input.scope,
                    scopeId: input.scopeId,
                    exactSessionId: input.exactSessionId,
                    requestId: preRequest.evaluation.requestId,
                    providerPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                    toolCallIds: preRequest.pendingToolCallIds,
                    tokensAfter: Number(canonicalPayload?.totalTokens || 0),
                });
                for (;;) {
                    try {
                        turn = await callTurn(input.config, {
                            messages,
                            nativeTools: requestTools,
                            nativeToolReference: input.nativeToolReference,
                            nativeToolsRequired: true,
                            maxTokens: input.maxTokens,
                            retryProfile: input.retryProfile || (round > 0 ? "agent_orchestration" : "interactive_first_turn"),
                            promptCacheTracking: input.promptCacheTracking,
                            providerContextCache,
                            onProviderContextCache: input.onProviderContextCache,
                            signal: input.signal,
                            stream: true,
                            onDelta: (delta) => {
                                if (!delta)
                                    return;
                                turnEmitted += delta;
                                modelLifecycle?.onDelta(delta);
                                input.onDelta?.(delta, { modelCallIndex: modelCallCount, round });
                            },
                            onUsage: (value) => {
                                usage = mergeUsage(usage, value);
                                input.onUsage?.(value);
                            },
                            onRetry: (notice) => {
                                modelLifecycle?.onRetry(Math.max(1, Number(notice?.attempt || 1)), Math.max(1, Number(notice?.maxAttempts || 1) - 1), Math.max(0, Number(notice?.delayMs || 0)));
                                input.onRetry?.(notice);
                            },
                            onProviderRequestActivity: (activity) => {
                                modelLifecycle?.onProviderRequestActivity?.(activity);
                            },
                            onProviderStreamActivity: (activity) => {
                                const projected = { ...activity, modelCallIndex: modelCallCount, round };
                                if (projected.kind === "tool_call_declared")
                                    modelLifecycle?.onToolDeclared?.(String(projected.toolName || ""));
                                input.onProviderStreamActivity?.(projected);
                            },
                            onNativeToolCallReady,
                        });
                        (0, pre_request_tool_context_1.commitPreRequestToolContext)(input.scope, input.scopeId, input.exactSessionId, preRequest.evaluation.requestId);
                        break;
                    }
                    catch (error) {
                        (0, pre_request_tool_context_1.abortPreRequestToolContext)(input.scope, input.scopeId, input.exactSessionId, preRequest.evaluation.requestId);
                        if (!nativePromptTooLong(error) || ptlRecoveryAttempts >= 1)
                            throw error;
                        ptlRecoveryAttempts += 1;
                        const forced = (0, pre_request_tool_context_1.stagePreRequestToolContext)({
                            scope: input.scope,
                            scopeId: input.scopeId,
                            exactSessionId: input.exactSessionId,
                            messages,
                            providerPayloadChecksum: String(canonicalPayload?.payloadChecksum || ""),
                            tokensBefore: Number(canonicalPayload?.totalTokens || 0),
                            config: input.config,
                            generation: Number(input.providerContextCache?.cacheAffinity?.generation || input.providerContextCache?.generation || 0),
                            attempt: Number(input.providerContextCache?.cacheAffinity?.attempt || 1),
                            currentToolCallIds: toolResults.map(row => row.callId),
                            forcePromptTooLong: true,
                        });
                        if (!forced.changed) {
                            if (conversationPressureAttempts < 1 && input.onConversationContextPressure) {
                                const recovered = await input.onConversationContextPressure({
                                    messages,
                                    tools: requestTools,
                                    modelCallIndex: modelCallCount,
                                    round,
                                    forcePromptTooLong: true,
                                    preRequestEvaluation: forced.evaluation,
                                });
                                if (Array.isArray(recovered) && JSON.stringify(recovered) !== JSON.stringify(messages)) {
                                    conversationPressureAttempts += 1;
                                    messages = recovered;
                                    continue queryLoop;
                                }
                            }
                            throw error;
                        }
                        messages = forced.messages;
                        preRequest = forced;
                        const retryCanonicalPayload = input.onCanonicalPayload?.({
                            messages,
                            tools: requestTools,
                            modelCallIndex: modelCallCount,
                            round,
                        });
                        providerContextCache.canonicalPayloadChecksum = String(retryCanonicalPayload?.payloadChecksum || "");
                        (0, pre_request_tool_context_1.bindPreRequestToolContext)({
                            scope: input.scope,
                            scopeId: input.scopeId,
                            exactSessionId: input.exactSessionId,
                            requestId: preRequest.evaluation.requestId,
                            providerPayloadChecksum: providerContextCache.canonicalPayloadChecksum,
                            toolCallIds: preRequest.pendingToolCallIds,
                            tokensAfter: Number(retryCanonicalPayload?.totalTokens || preRequest.evaluation.tokensAfter || 0),
                        });
                    }
                }
            }
            catch (error) {
                if (error?.code === "CCM_NATIVE_TOOLS_UNSUPPORTED") {
                    // Unsupported native tools are a transport capability fallback, not
                    // a user-visible model failure. Close this attempt monotonically and
                    // continue with a distinct JSON lifecycle identity.
                    modelLifecycle?.complete();
                    return fallBackToJsonQueryLoop(input, modelCallCount);
                }
                modelLifecycle?.fail(error);
                throw error;
            }
            lastTurn = turn;
            const unstreamed = unstreamedTurnText(turn.text, turnEmitted);
            if (unstreamed) {
                modelLifecycle?.onDelta(unstreamed);
                input.onDelta?.(unstreamed, { modelCallIndex: modelCallCount, round });
            }
            modelLifecycle?.complete();
            input.onTurn?.({ round, turn, modelCallIndex: modelCallCount });
            const controlCalls = (turn.toolCalls || []).filter(item => isNativeControlTool(item.name));
            const regularCalls = (turn.toolCalls || []).filter(item => !isNativeControlTool(item.name));
            if (!turn.toolCalls.length) {
                const canDispatch = availableTools().some(tool => tool.name === "ccm_dispatch");
                const requiresExplicitDispatch = canDispatch && explicitlyRequestsDispatch(messages);
                if (canDispatch && (claimsUnsubmittedDispatch(turn.text) || requiresExplicitDispatch) && controlToolRepairCount < 2) {
                    controlToolRepairCount += 1;
                    messages = applyTranscript([
                        ...messages,
                        { role: "assistant", content: String(turn.text || "") },
                        {
                            role: "system",
                            content: "The user explicitly requested project-Agent dispatch, or you stated that you would dispatch, but no ccm_dispatch tool call was submitted. Do not return another preamble, progress note, or generic summary. If the authorized implementation should proceed, call ccm_dispatch now with a self-contained target work order and workflowDecision. Use ccm_ask_user only for a concrete unresolved business decision. If dispatch is unsafe, explain the specific blocker truthfully.",
                        },
                    ]);
                    toolRoundCount += 1;
                    continue;
                }
                if (requiresExplicitDispatch && controlToolRepairCount >= 2) {
                    const error = new Error("The model did not submit the required ccm_dispatch control call after bounded repair.");
                    error.code = "CCM_DISPATCH_TOOL_REQUIRED";
                    throw error;
                }
                if (toolResults.length > 0 && !String(turn.text || "").trim() && incompleteAfterToolsRepairCount < 1) {
                    incompleteAfterToolsRepairCount += 1;
                    messages = applyTranscript([
                        ...messages,
                        {
                            role: "system",
                            content: "The requested read-only tool calls have completed, but this turn returned no final action or answer. Finish the turn now using the existing tool results. Call ccm_dispatch for an authorized implementation, ccm_present_plan only when the plan gate is required, ccm_ask_user only for an unresolved business decision, or provide a truthful final answer. Do not repeat a preamble and do not reread the same files.",
                        },
                    ]);
                    toolRoundCount += 1;
                    continue;
                }
                parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn));
                stopReason = "model_completed";
                break;
            }
            if (!regularCalls.length && controlCalls.length) {
                parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn, controlCalls));
                if (input.planModeEnabled) {
                    parsed = mergeNativeTurnParsed(parsed, (0, conversation_plan_mode_gate_1.applyConversationPlanModeToRound)({
                        enabled: true,
                        parsed,
                        requests: controlCalls.map(item => ({ name: item.name, arguments: item.arguments })),
                        isReadOnly: (request) => request.name === "ccm_ask_user" || request.name === "ccm_present_plan",
                    }).parsed);
                }
                const planCall = presentPlanControlCall(controlCalls);
                const planningReview = planCall ? await assessPresentedPlan(planCall) : null;
                parsed = planCall ? mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn, controlCalls)) : parsed;
                if (planCall && (!planningReview?.passed || (!planningReview && (0, presented_plan_quality_1.shouldRepairPresentedPlan)(parsed, planRepairCount > 0)))) {
                    if (planRepairCount > 0) {
                        const error = new Error(`计划复核仍未通过：${planningReview?.receipt.issues.slice(0, 6).map(issue => issue.message).join("；") || "质量门禁未通过"}`);
                        error.code = "CCM_PLAN_REVIEW_BLOCKED";
                        error.reviewReceipt = planningReview?.receipt;
                        throw error;
                    }
                    planRepairCount += 1;
                    const quality = (0, presented_plan_quality_1.evaluatePresentedPlanQuality)(parsed.plan);
                    const repairResult = planningReview && !planningReview.passed
                        ? { callId: planCall.id, name: planCall.name, ok: false, error: "CCM_PLAN_REVIEW_REPAIR_REQUIRED", output: planningReview.receipt }
                        : (0, presented_plan_quality_1.buildPresentedPlanQualityToolResult)(planCall.id, quality);
                    const controlResults = controlCalls.map(item => item.name === "ccm_present_plan"
                        ? repairResult
                        : { callId: item.id, name: item.name, ok: true, output: { recorded: true, responseType: parsed.responseType } });
                    toolResults.push(repairResult);
                    messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, controlResults, family));
                    if (planningSession)
                        messages = (0, provider_cache_message_layout_1.insertDynamicSystemAfterStableCore)(messages, (0, planning_orchestrator_1.planningPromptForTurn)(planningSession.promptTurn).prompt);
                    toolRoundCount += 1;
                    continue;
                }
                parsed = stampPresentedPlanQuality(parsed, planRepairCount > 0);
                messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, controlCalls.map(item => ({
                    callId: item.id,
                    name: item.name,
                    ok: true,
                    output: { recorded: true, responseType: parsed.responseType },
                })), family));
                stopReason = input.planModeEnabled && parsed.responseType === "plan" && controlCalls.some(item => item.name === "ccm_dispatch")
                    ? "plan_mode_held"
                    : "model_completed";
                break;
            }
            const fresh = regularCalls.filter(item => !executed.has(fingerprintCall(item)));
            if (!fresh.length) {
                noProgressCount += 1;
                const duplicate = {
                    callId: `loop_control_${round}`,
                    name: "loop_control",
                    ok: false,
                    error: "NATIVE_QUERY_LOOP_DUPLICATE_REQUEST",
                    reason: "相同工具和参数已经执行，请基于已有结果完成回答或改用控制工具。",
                };
                toolResults.push(duplicate);
                messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, [duplicate], family));
                if (noProgressCount >= budget.noProgressThreshold) {
                    stopReason = "no_progress";
                    throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_NO_PROGRESS`);
                }
                toolRoundCount += 1;
                continue;
            }
            const planModeRound = (0, conversation_plan_mode_gate_1.applyConversationPlanModeToRound)({
                enabled: input.planModeEnabled === true,
                parsed: mapNativeTurnToParsed(turn, controlCalls),
                requests: fresh.map(item => ({ name: item.name, arguments: item.arguments, id: item.id })),
                isReadOnly: (request) => {
                    const call = fresh.find(item => item.name === request.name && JSON.stringify(item.arguments || {}) === JSON.stringify(request.arguments || {}))
                        || { name: request.name, arguments: request.arguments, id: "", argumentsChecksum: "" };
                    return isReadOnly(call);
                },
            });
            parsed = mergeNativeTurnParsed(parsed, planModeRound.parsed);
            if (planModeRound.stopLoop) {
                messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, planModeRound.blockedResults.map((row, index) => ({
                    callId: fresh[index]?.id || `blocked_${index}`,
                    name: String(row.name || "unknown"),
                    ok: false,
                    error: row.error,
                    reason: row.reason,
                })), family));
                stopReason = "plan_mode_held";
                break;
            }
            const runnable = planModeRound.requests.map((request) => {
                return fresh.find(item => item.name === request.name && JSON.stringify(item.arguments || {}) === JSON.stringify(request.arguments || {}))
                    || { id: request.id || `call_${toolCallCount}`, name: request.name, arguments: request.arguments || {}, argumentsChecksum: "" };
            });
            const remaining = [...started.entries()].filter(([id]) => runnable.some(item => item.id === id));
            const pending = runnable.filter(item => !started.has(item.id));
            if (pending.length) {
                input.onBeforeToolExecution?.({ round, modelCallIndex: modelCallCount, calls: pending });
            }
            const blockedResults = (planModeRound.blockedResults || []).map((row, index) => ({
                callId: String(row.callId || `blocked_${index}`),
                name: String(row.name || "unknown"),
                ok: false,
                error: row.error,
                reason: row.reason,
            }));
            for (const request of [...runnable, ...(planModeRound.blockedRequests || [])]) {
                executed.add(fingerprintCall(request));
            }
            const executedRows = [
                ...(await Promise.all(remaining.map(row => row[1]))),
                ...(pending.length ? await executeTools(pending, { round, turn, signal: input.signal, startedCallIds }) : []),
                ...blockedResults,
            ];
            toolResults.push(...executedRows);
            toolCallCount += executedRows.filter(row => row.name !== "loop_control").length;
            segmentToolCalls += executedRows.filter(row => row.name !== "loop_control").length;
            const planCall = presentPlanControlCall(controlCalls);
            const planningReview = planCall ? await assessPresentedPlan(planCall) : null;
            const repairing = !!(planCall && (!planningReview?.passed || (!planningReview && (0, presented_plan_quality_1.shouldRepairPresentedPlan)({
                responseType: "plan",
                plan: planCall.arguments?.plan,
            }, planRepairCount > 0))));
            let controlResults = controlCalls.map(item => ({
                callId: item.id,
                name: item.name,
                ok: true,
                output: { deferred: "control_after_tools" },
            }));
            if (repairing && planCall) {
                if (planRepairCount > 0) {
                    const error = new Error(`计划复核仍未通过：${planningReview?.receipt.issues.slice(0, 6).map(issue => issue.message).join("；") || "质量门禁未通过"}`);
                    error.code = "CCM_PLAN_REVIEW_BLOCKED";
                    error.reviewReceipt = planningReview?.receipt;
                    throw error;
                }
                planRepairCount += 1;
                const quality = (0, presented_plan_quality_1.evaluatePresentedPlanQuality)(planCall.arguments?.plan);
                const repairResult = planningReview && !planningReview.passed
                    ? { callId: planCall.id, name: planCall.name, ok: false, error: "CCM_PLAN_REVIEW_REPAIR_REQUIRED", output: planningReview.receipt }
                    : (0, presented_plan_quality_1.buildPresentedPlanQualityToolResult)(planCall.id, quality);
                toolResults.push(repairResult);
                controlResults = controlCalls.map(item => item.name === "ccm_present_plan"
                    ? repairResult
                    : { callId: item.id, name: item.name, ok: true, output: { deferred: "control_after_tools" } });
            }
            messages = applyTranscript((0, native_query_messages_1.appendNativeTurnTranscript)(messages, turn, [...executedRows, ...controlResults], family));
            if (repairing && planningSession)
                messages = (0, provider_cache_message_layout_1.insertDynamicSystemAfterStableCore)(messages, (0, planning_orchestrator_1.planningPromptForTurn)(planningSession.promptTurn).prompt);
            if (executedRows.some(row => row.ok === true))
                noProgressCount = 0;
            else
                noProgressCount += 1;
            if (noProgressCount >= budget.noProgressThreshold) {
                stopReason = "no_progress";
                throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_NO_PROGRESS`);
            }
            if (repairing) {
                toolRoundCount += 1;
                continue;
            }
            if (controlCalls.length || input.shouldStopAfterTools?.(runnable, executedRows)) {
                parsed = mergeNativeTurnParsed(parsed, mapNativeTurnToParsed(turn, controlCalls));
                if (input.planModeEnabled)
                    parsed = (0, conversation_plan_mode_gate_1.holdConversationPlanModeParsed)(parsed);
                parsed = stampPresentedPlanQuality(parsed, planRepairCount > 0);
                stopReason = "model_completed";
                break;
            }
            toolRoundCount += 1;
            const continuation = (0, agent_loop_budget_1.shouldContinueAgentLoop)({
                budget,
                round: toolRoundCount,
                modelTurns: segmentModelTurns,
                toolCalls: segmentToolCalls,
                elapsedMs: Date.now() - segmentStartedAt,
                unresolvedCriteria: 1,
                noProgressCount,
                cancelled: input.signal?.aborted === true,
            });
            if (!continuation.continue) {
                stopReason = continuation.reason;
                throw new Error(`${String(input.scope || "agent").toUpperCase()}_MAIN_TOOL_LOOP_${continuation.reason.toUpperCase()}`);
            }
            if (continuation.resetSegment) {
                continuationSegments += 1;
                segmentToolCalls = 0;
                segmentModelTurns = 0;
                segmentStartedAt = Date.now();
            }
        }
    }
    catch (error) {
        const observedToolCalls = toolResults.filter(row => row.name
            && row.name !== "loop_control"
            && !["CONVERSATION_PLAN_MODE_BLOCKED", "CCM_NATIVE_TOOL_RESULT_MISSING", "NATIVE_QUERY_LOOP_DUPLICATE_REQUEST"].includes(String(row.error || ""))).length;
        if (!Number(error.observationCount))
            error.observationCount = observedToolCalls;
        error.toolCallCount = Math.max(0, Number(error.toolCallCount || 0), observedToolCalls);
        error.requestedToolCallCount = Math.max(0, Number(error.requestedToolCallCount || 0), toolCallCount);
        error.modelCallCount = Math.max(0, Number(error.modelCallCount || 0), modelCallCount);
        error.toolRoundCount = Math.max(0, Number(error.toolRoundCount || 0), toolRoundCount);
        error.noProgressCount = Math.max(0, Number(error.noProgressCount || 0), noProgressCount);
        if (!error.usage && usage)
            error.usage = usage;
        throw error;
    }
    parsed = (0, conversation_plan_mode_gate_1.applyInteractiveConversationModePolicy)(input.scope, input.planModeEnabled === true, parsed);
    parsed = stampPresentedPlanQuality(parsed, planRepairCount > 0);
    const decision = (0, main_agent_turn_1.normalizeMainAgentTurnDecision)({
        scope: input.scope,
        scopeId: input.scopeId,
        exactSessionId: input.exactSessionId,
        parsed,
        reply: parsed?.reply,
        toolRequests: [],
        planDraft: parsed?.plan,
        dispatchDraft: parsed?.targets,
        workflowDecision: parsed?.workflowDecision,
    });
    return {
        parsed,
        decision,
        text: String(parsed?.reply || lastTurn.text || ""),
        messages,
        toolResults,
        modelCallCount,
        toolRoundCount,
        toolCallCount,
        stopReason,
        usage,
        noProgressCount,
        continuationSegments,
        family,
        ptlRecoveryAttempts,
        ptlDroppedMessageIds,
    };
}
async function runNativeQueryLoopSelfTest() {
    const calls = [];
    const turns = [
        {
            text: "",
            toolCalls: [{ id: "call_1", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "a" }],
            toolReferences: [],
            stopReason: "tool_calls",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, reported: true },
        },
        {
            text: "已根据 README 回答。",
            toolCalls: [],
            toolReferences: [],
            stopReason: "end_turn",
            usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20, reported: true },
        },
    ];
    let turnIndex = 0;
    const result = await runNativeQueryLoop({
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "system", content: "You are the main Agent. Answer in the user's conversation language and use tools only when needed." }, { role: "user", content: "What does the README say?" }],
        tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
        scope: "group",
        scopeId: "g1",
        exactSessionId: "gcs_1",
        callTurn: async (_config, options) => {
            calls.push(options.messages);
            return turns[Math.min(turnIndex++, turns.length - 1)];
        },
        executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } })),
    });
    const control = mapNativeTurnToParsed({
        text: "",
        toolCalls: [{ id: "c1", name: "ccm_ask_user", arguments: { question: "目标项目是哪个？" }, argumentsChecksum: "b" }],
        toolReferences: [],
        stopReason: "tool_calls",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false },
    }, [{ id: "c1", name: "ccm_ask_user", arguments: { question: "目标项目是哪个？" }, argumentsChecksum: "b" }]);
    const controlAlias = mapNativeTurnToParsed({
        text: "先确认业务点",
        toolCalls: [{
                id: "c2",
                name: "ccm_ask_user",
                arguments: {
                    question: "先确认 3 个业务点",
                    questions: [{ label: "核销方式", type: "single", options: [{ label: "到店核销" }, { label: "线上核销" }] }],
                },
                argumentsChecksum: "c",
            }],
        toolReferences: [],
        stopReason: "tool_calls",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false },
    }, [{
            id: "c2",
            name: "ccm_ask_user",
            arguments: {
                question: "先确认 3 个业务点",
                questions: [{ label: "核销方式", type: "single", options: [{ label: "到店核销" }, { label: "线上核销" }] }],
            },
            argumentsChecksum: "c",
        }]);
    const jsonModeUsesFallback = shouldUseNativeQueryLoop({ providerNativeToolsMode: "json" }) === false;
    const secondMessages = calls[1] || [];
    const flushed = [];
    const flushedContexts = [];
    await runNativeQueryLoop({
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "user", content: "看一下 README" }],
        tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
        scope: "group",
        scopeId: "g1",
        exactSessionId: "gcs_flush",
        onDelta: (delta, context) => { flushed.push(delta); flushedContexts.push(context); },
        callTurn: async () => ({
            text: "我先看 README。",
            toolCalls: [{ id: "call_flush", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "f" }],
            toolReferences: [],
            stopReason: "tool_calls",
            usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, reported: true },
        }),
        executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } })),
        shouldStopAfterTools: () => true,
    });
    const speculativeOrder = [];
    const speculativeCall = {
        id: "call_speculative",
        name: "read_file",
        arguments: { path: "README.md" },
        argumentsChecksum: "speculative",
    };
    await runNativeQueryLoop({
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "user", content: "先说明，再读取 README" }],
        tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
        scope: "project",
        scopeId: "demo",
        exactSessionId: "project_speculative_order",
        onBeforeToolExecution: ({ modelCallIndex }) => speculativeOrder.push(`preamble:${modelCallIndex}`),
        onTurn: () => speculativeOrder.push("turn"),
        callTurn: async (_config, options) => {
            options.onDelta?.("我先读取 README。");
            options.onNativeToolCallReady?.(speculativeCall);
            await Promise.resolve();
            return {
                text: "我先读取 README。",
                toolCalls: [speculativeCall],
                toolReferences: [],
                stopReason: "tool_calls",
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, reported: true },
            };
        },
        executeTools: async (toolCalls) => {
            speculativeOrder.push(`tool:${toolCalls[0]?.id || ""}`);
            return toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } }));
        },
        shouldStopAfterTools: () => true,
    });
    let dispatchRepairTurn = 0;
    const dispatchRepair = await runNativeQueryLoop({
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "user", content: "Create the requested project file now." }],
        tools: [{ name: "ccm_dispatch", description: "Dispatch a project Agent", inputSchema: { type: "object", properties: { targets: { type: "array" } }, required: ["targets"] } }],
        scope: "project",
        scopeId: "demo",
        exactSessionId: "project_dispatch_repair",
        callTurn: async () => {
            dispatchRepairTurn += 1;
            if (dispatchRepairTurn === 1)
                return {
                    text: "我将立即派发给当前项目子 Agent。",
                    toolCalls: [],
                    toolReferences: [],
                    stopReason: "end_turn",
                    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, reported: true },
                };
            return {
                text: "",
                toolCalls: [{ id: "dispatch_repair", name: "ccm_dispatch", arguments: { targets: [{ project: "demo", task: "Create the requested project file." }] }, argumentsChecksum: "dispatch-repair" }],
                toolReferences: [],
                stopReason: "tool_calls",
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, reported: true },
            };
        },
        executeTools: async () => [],
    });
    let emptyPostToolRepairTurn = 0;
    const emptyPostToolRepair = await runNativeQueryLoop({
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "user", content: "Inspect the project and create the requested proof file." }],
        tools: [
            { name: "read_file", description: "Read a project file", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
            { name: "ccm_dispatch", description: "Dispatch a project Agent", inputSchema: { type: "object", properties: { targets: { type: "array" } }, required: ["targets"] } },
        ],
        scope: "project",
        scopeId: "demo",
        exactSessionId: "project_empty_post_tool_repair",
        callTurn: async () => {
            emptyPostToolRepairTurn += 1;
            if (emptyPostToolRepairTurn === 1)
                return {
                    text: "I will inspect the requested files first.",
                    toolCalls: [{ id: "read_before_dispatch", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "read-before-dispatch" }],
                    toolReferences: [],
                    stopReason: "tool_calls",
                    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, reported: true },
                };
            if (emptyPostToolRepairTurn === 2)
                return {
                    text: "",
                    toolCalls: [],
                    toolReferences: [],
                    stopReason: "end_turn",
                    usage: { inputTokens: 1, outputTokens: 0, totalTokens: 1, reported: true },
                };
            return {
                text: "",
                toolCalls: [{ id: "dispatch_after_empty", name: "ccm_dispatch", arguments: { targets: [{ project: "demo", task: "Create the requested proof file." }] }, argumentsChecksum: "dispatch-after-empty" }],
                toolReferences: [],
                stopReason: "tool_calls",
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, reported: true },
            };
        },
        executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Project" } })),
    });
    const checks = {
        firstTurnReturnsWithoutJsonExtract: result.modelCallCount === 2 && result.toolCallCount === 1,
        secondTurnHasAssistantToolCalls: secondMessages.some((item) => item?.role === "assistant" && Array.isArray(item.tool_calls) && item.tool_calls[0]?.id === "call_1"),
        secondTurnHasToolResult: secondMessages.some((item) => item?.role === "tool" && item.tool_call_id === "call_1"),
        loopEndsOnText: result.stopReason === "model_completed" && result.parsed?.responseType === "reply" && String(result.text).includes("README"),
        controlToolMapsClarify: control.responseType === "clarify" && control.questionForUser === "目标项目是哪个？" && control.dispatchPolicy?.action === "ask_user",
        controlToolMapsQuestionAlias: controlAlias.workflowDecision?.structuredClarificationQuestions?.[0]?.label === "核销方式" && controlAlias.dispatchPolicy?.action === "ask_user",
        jsonModeFallsBack: jsonModeUsesFallback,
        unstreamedPrefix: unstreamedTurnText("我先看 README。", "") === "我先看 README。",
        unstreamedRemainder: unstreamedTurnText("我先看 README。", "我先") === "看 README。",
        unstreamedNoDup: unstreamedTurnText("我先看 README。", "我先看 README。") === "",
        flushedUnstreamedTurnText: flushed.join("") === "我先看 README。",
        deltaCarriesModelCallIdentity: flushedContexts.length === 1
            && flushedContexts[0].modelCallIndex === 1
            && flushedContexts[0].round === 0,
        speculativeNarrationPrecedesTool: speculativeOrder.indexOf("preamble:1") >= 0
            && speculativeOrder.indexOf("preamble:1") < speculativeOrder.indexOf("tool:call_speculative"),
        dispatchPromiseRepairsToControlTool: dispatchRepairTurn === 2 && dispatchRepair.parsed?.responseType === "dispatch",
        emptyPostToolTurnRepairsToControlTool: emptyPostToolRepairTurn === 3
            && emptyPostToolRepair.parsed?.responseType === "dispatch"
            && emptyPostToolRepair.toolCallCount === 1
            && emptyPostToolRepair.toolResults.some(item => item.name === "read_file" && item.ok),
        emptyFollowupKeepsFirstTurnText: true,
        keepClarifyAcrossTextFollowup: true,
        planQualityRepairsOnce: true,
        planQualityAcceptsDegradedAfterRepair: true,
        planQualityPassesFirstShot: true,
        catalogEmitsDiscoveryTools: true,
        catalogUsesWorkspaceShortNames: true,
        catalogIncludesGroupBuiltin: true,
    };
    const keptTurns = [
        {
            text: "我会沿用前文范围再展开步骤。",
            toolCalls: [{ id: "call_keep", name: "read_file", arguments: { path: "README.md" }, argumentsChecksum: "k" }],
            toolReferences: [],
            stopReason: "tool_calls",
            usage: { inputTokens: 4, outputTokens: 6, totalTokens: 10, reported: true },
        },
        {
            text: "",
            toolCalls: [],
            toolReferences: [],
            stopReason: "end_turn",
            usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5, reported: true },
        },
    ];
    let keepIndex = 0;
    const kept = await runNativeQueryLoop({
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "user", content: "把刚才的计划展开" }],
        tools: [{ name: "read_file", description: "读取文件", inputSchema: { type: "object", properties: { path: { type: "string" } } } }],
        scope: "group",
        scopeId: "g1",
        exactSessionId: "gcs_keep",
        callTurn: async () => keptTurns[Math.min(keepIndex++, keptTurns.length - 1)],
        executeTools: async (toolCalls) => toolCalls.map(item => ({ callId: item.id, name: item.name, ok: true, output: { text: "# Hello" } })),
    });
    checks.emptyFollowupKeepsFirstTurnText = String(kept.parsed?.reply || "").includes("沿用前文")
        && mergeNativeTurnParsed({ reply: "引言", responseType: "reply" }, { reply: "", responseType: "reply" }).reply === "引言";
    const keptClarify = mergeNativeTurnParsed({ responseType: "clarify", questionForUser: "核销方式？", dispatchPolicy: { action: "ask_user" }, workflowDecision: { structuredClarificationQuestions: [{ label: "核销方式" }] }, reply: "核销方式？" }, { responseType: "reply", reply: "我先确认 3 个关键范围" });
    checks.keepClarifyAcrossTextFollowup = keptClarify.responseType === "clarify" && keptClarify.dispatchPolicy?.action === "ask_user";
    const badPlan = { title: "短", goal: "太短", steps: [{ title: "占住资源" }] };
    const goodPlan = {
        schema: "ccm-implementation-plan-v2",
        title: "预约履约",
        context: "现有预约流程缺少资源占用、核销和超时释放的一致边界，需要在不改变线下库存操作的前提下补齐履约状态转换。",
        goal: "到店履约时先占住资源，核销后改状态，超时从下单时钟释放并挂到现有预约单；没有现成域就按 greenfield 新建履约对象，验收以可演示切片为准。",
        approach: "复用现有预约单作为履约聚合入口，依次实现占用、核销状态转换和按下单时钟释放，使用可观察状态与现有验证入口验收。",
        targetProjects: ["booking-service"],
        scope: ["预约履约"],
        files: [],
        steps: [
            { id: "hold", title: "占住资源", objective: "预约创建后占用对应资源", dependsOn: [], acceptance: ["预约创建后资源显示为已占用"] },
            { id: "redeem", title: "核销改状态", objective: "到店核销后更新履约状态", changeSummary: "核销成功后将预约状态从已占用改为已履约，并保留履约时间", dependsOn: ["hold"], acceptance: ["核销后预约显示为已履约"] },
            { id: "timeout", title: "超时释放", objective: "按下单时钟释放超时占用", dependsOn: ["hold"], acceptance: ["超过约定时间后资源恢复可用"] },
        ],
        verification: [
            { expected: "预约创建后资源显示为已占用", acceptanceCriteria: ["预约创建后资源显示为已占用"] },
            { expected: "核销后预约显示为已履约", acceptanceCriteria: ["核销后预约显示为已履约"] },
            { expected: "超过约定时间后资源恢复可用", acceptanceCriteria: ["超过约定时间后资源恢复可用"] },
        ],
        risks: ["现有预约状态需要保持兼容"],
        exclusions: ["线下手工改库存"],
        openQuestions: [],
    };
    const presentTurn = (id, plan) => ({
        text: "计划已经整理完成。",
        toolCalls: [{ id, name: "ccm_present_plan", arguments: { reply: "请看计划", plan }, argumentsChecksum: id }],
        toolReferences: [],
        stopReason: "tool_calls",
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, reported: true },
    });
    const loopInput = {
        config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
        messages: [{ role: "user", content: "做计划" }],
        tools: [],
        scope: "group",
        scopeId: "g1",
        exactSessionId: "gcs_plan_quality",
        executeTools: async () => [],
    };
    let repairIndex = 0;
    const repaired = await runNativeQueryLoop({
        ...loopInput,
        callTurn: async () => [presentTurn("p1", badPlan), presentTurn("p2", goodPlan)][Math.min(repairIndex++, 1)],
    });
    checks.planQualityRepairsOnce = repaired.modelCallCount === 2
        && repaired.toolResults.some(row => row.error === "CCM_PLAN_REVIEW_REPAIR_REQUIRED")
        && repaired.parsed?.plan?.steps?.length === 3
        && repaired.parsed?.planQuality?.ok === true
        && repaired.parsed?.planQuality?.repaired === true;
    let degradeIndex = 0;
    let degradedBlocked = false;
    try {
        await runNativeQueryLoop({
            ...loopInput,
            exactSessionId: "gcs_plan_degraded",
            callTurn: async () => presentTurn(degradeIndex++ === 0 ? "d1" : "d2", badPlan),
        });
    }
    catch (error) {
        degradedBlocked = error?.code === "CCM_PLAN_REVIEW_BLOCKED";
    }
    checks.planQualityAcceptsDegradedAfterRepair = degradedBlocked;
    const passed = await runNativeQueryLoop({
        ...loopInput,
        exactSessionId: "gcs_plan_ok",
        callTurn: async () => presentTurn("ok1", goodPlan),
    });
    checks.planQualityPassesFirstShot = passed.modelCallCount === 1
        && passed.parsed?.planQuality?.ok === true
        && passed.parsed?.planQuality?.repaired !== true
        && !passed.toolResults.some(row => row.error === "PRESENTED_PLAN_QUALITY");
    const nativeCatalog = catalogToNativeTools({
        catalog: {
            loadedMcp: [
                { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read", inputSchema: { type: "object" } },
            ],
            mcp: [
                { name: "query_knowledge", canonicalName: "query_knowledge", server: "ccm-group-readonly", description: "kb", inputSchema: { type: "object" } },
            ],
            discoverableMcp: [
                { name: "read_git_status", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_git_status", server: "ccm__workspace_readonly", description: "git", inputSchema: { type: "object", properties: { a: { type: "string" }, z: { type: "string" } } } },
            ],
        },
    });
    checks.catalogEmitsDiscoveryTools = nativeCatalog.some(tool => tool.name === "tool_search")
        && nativeCatalog.some(tool => tool.name === "invoke_skill")
        && nativeCatalog.some(tool => tool.name === "invoke_mcp");
    checks.catalogUsesWorkspaceShortNames = nativeCatalog.some(tool => tool.name === "read_file" && tool.deferred !== true)
        && nativeCatalog.some(tool => tool.name === "read_git_status" && tool.deferred !== true)
        && nativeCatalog.every(tool => !String(tool.name).includes("ccm_workspace_readonly"));
    checks.catalogIncludesGroupBuiltin = nativeCatalog.some(tool => tool.name === "query_knowledge" && tool.deferred !== true);
    const reorderedCatalog = catalogToNativeTools({
        catalog: {
            loadedMcp: [
                { name: "read_git_status", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_git_status", server: "ccm__workspace_readonly", description: "git", inputSchema: { properties: { z: { type: "string" }, a: { type: "string" } }, type: "object" } },
                { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read", inputSchema: { type: "object" } },
            ],
            mcp: [
                { name: "query_knowledge", canonicalName: "query_knowledge", server: "ccm-group-readonly", description: "kb", inputSchema: { type: "object" } },
            ],
        },
    });
    checks.catalogOrderAndSchemaAreCanonical = JSON.stringify(nativeCatalog) === JSON.stringify(reorderedCatalog)
        && nativeCatalog.slice(nativeDiscoveryToolDefinitions().length).every((tool, index, rows) => !index || rows[index - 1].name.localeCompare(tool.name) <= 0);
    checks.catalogSchemaSnapshotIsMemoized = nativeCatalog === catalogToNativeTools({
        catalog: {
            loadedMcp: [
                { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read", inputSchema: { type: "object" } },
                { name: "read_git_status", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_git_status", server: "ccm__workspace_readonly", description: "git", inputSchema: { type: "object", properties: { z: { type: "string" }, a: { type: "string" } } } },
            ],
            mcp: [
                { name: "query_knowledge", canonicalName: "query_knowledge", server: "ccm-group-readonly", description: "kb", inputSchema: { type: "object" } },
            ],
        },
    });
    return { pass: Object.values(checks).every(Boolean), checks, result };
}
//# sourceMappingURL=native-query-loop.js.map