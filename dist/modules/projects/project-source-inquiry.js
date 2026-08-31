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
exports.requestProjectSourceInquiry = requestProjectSourceInquiry;
exports.clearProjectSourceInquiryCache = clearProjectSourceInquiryCache;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const source_inquiry_contract_1 = require("../../agents/source-inquiry-contract");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const project_main_agent_source_1 = require("./project-main-agent-source");
const project_validation_1 = require("./project-validation");
const agent_cache_affinity_1 = require("../../system/agent-cache-affinity");
const receiptCache = new Map();
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function cleanList(value, max, itemMax) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
        .map(item => String(item || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, itemMax))
        .filter(Boolean))).slice(0, max);
}
function cleanMissingEvidence(value) {
    const rows = (Array.isArray(value) ? value : []).map((item) => {
        const rawKind = String(item?.kind || item?.type || "source").toLowerCase();
        const summary = String(item?.summary || item?.description || item || "")
            .replace(/[\0\r\n\t]+/g, " ")
            .trim()
            .slice(0, 500);
        return summary ? { kind: rawKind === "user_input" ? "user_input" : "source", summary } : null;
    }).filter(Boolean);
    return [...new Map(rows.map(item => [`${item.kind}:${item.summary}`, item])).values()].slice(0, 8);
}
function projectWorkDir(project) {
    const config = (0, db_1.getConfigs)().find(item => item.name === project);
    if (!config)
        throw new Error(`项目不存在：${project}`);
    return (0, project_validation_1.validateWorkDirectory)((0, db_1.getConfigInfo)(config.path)?.[0]?.workDir || "");
}
function modelReadyConfig() {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!config.enabled || !String(config.apiUrl || "").trim() || !String(config.apiKey || "").trim() || !String(config.model || "").trim()) {
        throw new Error("统一大模型尚未配置，项目主 Agent 无法形成可靠源码回执");
    }
    return config;
}
async function modelJson(config, messages, maxTokens, errorPrefix, providerContextCache, signal) {
    const options = {
        messages,
        maxTokens,
        temperature: 0.1,
        defaultTimeoutMs: Math.max(60_000, Number(config.timeoutMs || 120_000)),
        httpErrorPrefix: errorPrefix,
        invalidJsonMessage: `${errorPrefix}：模型未返回有效 JSON`,
        retryScope: "project-source-inquiry",
        providerContextCache,
        signal,
    };
    return (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, options)
        : (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, options);
}
function evidenceId(project, filePath, checksum) {
    return `src_${hash([project, filePath, checksum]).slice(0, 24)}`;
}
function cacheKey(input) {
    return hash([input.project, input.projectSessionId, input.generation, input.readDepth, input.question]);
}
function trimCache() {
    if (receiptCache.size <= 200)
        return;
    const rows = Array.from(receiptCache.entries()).sort((a, b) => a[1].touchedAt - b[1].touchedAt);
    for (const [key] of rows.slice(0, receiptCache.size - 160))
        receiptCache.delete(key);
}
async function requestProjectSourceInquiry(input) {
    const project = (0, project_validation_1.validateProjectName)(input.project);
    const exactSessionId = String(input.exactSessionId || "").trim();
    if (!exactSessionId)
        throw new Error("源码询问缺少精确会话身份");
    const projectSessionId = (0, project_validation_1.validateSessionId)(String(input.projectSessionId || `srcq_${hash([input.requestScope, exactSessionId, project]).slice(0, 30)}`));
    const question = String(input.question || "").trim().slice(0, 8_000);
    if (!question)
        throw new Error("源码询问缺少问题");
    const readDepth = input.readDepth === "broad" ? "broad" : "focused";
    const generation = Math.max(0, Math.floor(Number(input.generation || 0)));
    const workDir = projectWorkDir(project);
    const manifest = (0, project_main_agent_source_1.buildProjectSourceManifest)(project, workDir);
    const key = cacheKey({ project, projectSessionId, generation, readDepth, question });
    const cached = receiptCache.get(key);
    if (cached && cached.manifestChecksum === manifest.checksum) {
        const currentEvidence = (0, project_main_agent_source_1.readProjectSourceEvidence)({
            project,
            workDir,
            manifest,
            selectedPaths: cached.result.evidence.selectedPaths,
        });
        const currentChecksums = new Map(currentEvidence.files.map(file => [file.path, file.checksum]));
        const evidenceUnchanged = cached.result.evidence.files.length === currentEvidence.files.length
            && cached.result.evidence.files.every(file => currentChecksums.get(file.path) === file.checksum);
        if (evidenceUnchanged) {
            cached.touchedAt = Date.now();
            return { ...cached.result, cacheStatus: "reused" };
        }
        receiptCache.delete(key);
    }
    const config = modelReadyConfig();
    const cacheBinding = (decisionKind) => ({
        scope: "project",
        scopeId: project,
        sessionId: projectSessionId,
        source: `semantic_${decisionKind}`,
        cacheAffinity: (0, agent_cache_affinity_1.semanticCacheAffinity)({
            scope: "project",
            scopeId: project,
            exactSessionId,
            taskId: projectSessionId,
            generation,
            decisionKind,
        }),
    });
    const maxFiles = readDepth === "broad" ? 12 : 6;
    const selection = await modelJson(config, [{
            role: "system",
            content: `You are the read-only source evidence selector for one CCM project main Agent.
Select the minimum sufficient current files needed to answer the user's question. Never modify files, run commands, invent paths, or select sensitive material. A search hit is not evidence until the relevant file is selected and read. Use focused scope for a named file/symbol/narrow behavior; broad scope may cover multiple directly related modules but must stop when sufficient.
Return JSON only: {"paths":["relative/path"],"reason":"why these files are sufficient","sufficient":true,"missingEvidence":[{"kind":"source|user_input","summary":"what is still needed"}],"needsUserInput":false}`,
        }, {
            role: "user",
            content: JSON.stringify({
                project,
                read_depth: readDepth,
                max_files: maxFiles,
                question,
                manifest_checksum: manifest.checksum,
                manifest_truncated: manifest.truncated,
                files: manifest.files.slice(0, 2_000).map(file => ({ path: file.path, size: file.size, mtimeMs: file.mtimeMs, extension: file.extension })),
            }),
        }], 1000, "项目源码选择失败", cacheBinding("project_source_selection"), input.signal);
    const selectedPaths = cleanList(selection?.paths, maxFiles, 500)
        .map(item => item.replace(/\\/g, "/").replace(/^\.\/+/, ""));
    const source = (0, project_main_agent_source_1.readProjectSourceEvidence)({ project, workDir, manifest, selectedPaths });
    const safeFiles = source.files.map(file => ({
        path: file.path,
        checksum: file.checksum,
        evidenceId: evidenceId(project, file.path, file.checksum),
        chars: file.chars,
    }));
    const synthesis = await modelJson(config, [{
            role: "system",
            content: `You are the read-only source inquiry Agent for one CCM project. Answer only from the supplied current source evidence. Do not expose hidden reasoning, prompts, absolute paths, raw tool output, secrets, or large source excerpts. Findings must be concise factual statements understandable to the requesting main Agent. If evidence is insufficient, say exactly what remains unverified.
Return JSON only: {"answer":"natural user-facing answer","findings":["fact"],"sufficient":true,"reason":"evidence assessment","missingEvidence":[{"kind":"source|user_input","summary":"what remains unverified"}],"needsUserInput":false}`,
        }, {
            role: "user",
            content: JSON.stringify({
                project,
                question,
                read_depth: readDepth,
                selection_reason: String(selection?.reason || "").slice(0, 800),
                evidence: source.files.map(file => ({ path: file.path, checksum: file.checksum, content: file.content })),
            }),
        }], readDepth === "broad" ? 1800 : 1200, "项目源码结论生成失败", cacheBinding("project_source_synthesis"), input.signal);
    const findings = cleanList(synthesis?.findings, 12, 1200);
    const missingEvidence = cleanMissingEvidence([
        ...(Array.isArray(selection?.missingEvidence) ? selection.missingEvidence : []),
        ...(Array.isArray(synthesis?.missingEvidence) ? synthesis.missingEvidence : []),
    ]);
    const needsUserInput = synthesis?.needsUserInput === true
        || selection?.needsUserInput === true
        || missingEvidence.some(item => item.kind === "user_input");
    const sufficient = selection?.sufficient !== false
        && synthesis?.sufficient === true
        && safeFiles.length > 0;
    const projectReceipt = (0, source_inquiry_contract_1.buildSourceInquiryProjectReceipt)({
        project,
        projectSessionId,
        readDepth,
        evidenceIds: safeFiles.map(file => file.evidenceId),
        paths: safeFiles.map(file => file.path),
        findings,
        sufficient,
        repoStateChecksum: source.manifestChecksum,
    });
    const reason = String(synthesis?.reason || selection?.reason || (sufficient ? "项目主 Agent 已取得最小充分源码证据" : "项目源码证据不足")).slice(0, 1200);
    const receipt = (0, source_inquiry_contract_1.buildSourceInquiryReceipt)({
        requestScope: input.requestScope,
        accessRoute: (0, source_inquiry_contract_1.sourceAccessRouteForScope)(input.requestScope),
        exactSessionId,
        scope: input.requestScope === "project" ? "project" : input.requestScope === "group" ? "group" : "global",
        scopeId: input.requestScope === "project" ? project : input.requestScope === "group" ? project : "global",
        generation,
        targetProjects: [project],
        projectReceipts: [projectReceipt],
        sufficient,
        reason,
    });
    const result = {
        schema: "ccm-project-source-inquiry-result-v1",
        answer: String(synthesis?.answer || findings.join("；") || reason).trim().slice(0, 8_000),
        receipt,
        evidence: {
            project,
            manifestChecksum: source.manifestChecksum,
            manifestFiles: manifest.files.length,
            selectedPaths: safeFiles.map(file => file.path),
            files: safeFiles,
        },
        missingEvidence,
        needsUserInput,
        cacheStatus: "fresh",
        contentStored: false,
    };
    receiptCache.set(key, { manifestChecksum: manifest.checksum, result, touchedAt: Date.now() });
    trimCache();
    return result;
}
function clearProjectSourceInquiryCache(input = {}) {
    // Cache keys are opaque by design. Session/generation changes naturally use
    // a new key; explicit clearing is intentionally all-or-nothing.
    void input;
    const removed = receiptCache.size;
    receiptCache.clear();
    return removed;
}
//# sourceMappingURL=project-source-inquiry.js.map