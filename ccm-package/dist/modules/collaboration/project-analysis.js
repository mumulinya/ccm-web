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
exports.buildProjectCodeReadOnlyEvidence = buildProjectCodeReadOnlyEvidence;
exports.buildGroupMainPlanningSourceContext = buildGroupMainPlanningSourceContext;
exports.buildModelDrivenGroupPlanningSourceContext = buildModelDrivenGroupPlanningSourceContext;
exports.buildProjectCodeReadOnlySnapshot = buildProjectCodeReadOnlySnapshot;
exports.buildGroupProjectAnalysisContext = buildGroupProjectAnalysisContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const group_orchestrator_config_1 = require("./group-orchestrator-config");
const group_orchestrator_llm_client_1 = require("./group-orchestrator-llm-client");
const group_orchestrator_1 = require("./group-orchestrator");
const PROJECT_ANALYSIS_IGNORED_DIRS = new Set([
    ".git",
    ".next",
    ".nuxt",
    ".output",
    ".turbo",
    ".vite",
    ".cache",
    ".parcel-cache",
    ".ccm-worktrees",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "out",
    "target",
    "vendor",
]);
const PROJECT_ANALYSIS_SAFE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".vue",
    ".svelte",
    ".json",
    ".md",
    ".mdx",
    ".css",
    ".scss",
    ".less",
    ".html",
    ".yml",
    ".yaml",
    ".toml",
    ".prisma",
    ".sql",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".cs",
    ".php",
    ".rb",
]);
const PROJECT_ANALYSIS_SAFE_FILENAMES = new Set([
    "README",
    "README.md",
    "package.json",
    "pnpm-workspace.yaml",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "nuxt.config.ts",
    "tsconfig.json",
    "tailwind.config.js",
    "tailwind.config.ts",
    "docker-compose.yml",
    "Dockerfile",
]);
function isSensitiveProjectAnalysisFile(relativePath) {
    const normalized = relativePath.replace(/\\/g, "/");
    const base = path.basename(normalized).toLowerCase();
    return /(^|\/)\.env($|[.\-/])|secret|credential|token|private[-_]?key|id_rsa|\.pem$|\.p12$|\.pfx$|\.sqlite$|\.db$/i.test(normalized)
        || ["npmrc", ".npmrc", ".yarnrc", ".pypirc"].includes(base);
}
function isProjectAnalysisCandidate(filePath, root) {
    const relativePath = path.relative(root, filePath);
    if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath))
        return false;
    if (isSensitiveProjectAnalysisFile(relativePath))
        return false;
    const ext = path.extname(filePath);
    const base = path.basename(filePath);
    return PROJECT_ANALYSIS_SAFE_EXTENSIONS.has(ext) || PROJECT_ANALYSIS_SAFE_FILENAMES.has(base);
}
function collectProjectAnalysisFiles(root, maxEntries = 1200, maxDepth = 5) {
    const files = [];
    let visited = 0;
    const walk = (dir, depth = 0) => {
        if (visited >= maxEntries || depth > maxDepth)
            return;
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true })
                .filter(entry => !PROJECT_ANALYSIS_IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".ccm-"))
                .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (visited >= maxEntries)
                break;
            visited += 1;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full, depth + 1);
                continue;
            }
            if (isProjectAnalysisCandidate(full, root))
                files.push(full);
        }
    };
    walk(root);
    return files;
}
function truncateProjectSourceToTokens(value, maxTokens) {
    const text = String(value || "");
    if ((0, context_budget_1.estimateTextTokens)(text) <= maxTokens)
        return text;
    let low = 0;
    let high = text.length;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if ((0, context_budget_1.estimateTextTokens)(text.slice(0, middle)) <= maxTokens)
            low = middle;
        else
            high = middle - 1;
    }
    return `${text.slice(0, low)}\n…（按模型 Token 容量停止投影，原文件未修改）`;
}
function buildProjectAnalysisQueryTerms(message) {
    return String(message || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_\-./\u4e00-\u9fa5]+/gu, " ")
        .split(/\s+/)
        .map(item => item.trim())
        .filter(item => item.length >= 2)
        .slice(0, 18);
}
function scoreProjectAnalysisFile(filePath, root, queryTerms) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    const lower = relativePath.toLowerCase();
    let score = 0;
    if (/^readme/i.test(path.basename(relativePath)))
        score += 90;
    if (["package.json", "vite.config.ts", "vite.config.js", "next.config.js", "tsconfig.json"].includes(path.basename(relativePath)))
        score += 70;
    if (/(^|\/)(src|app|pages|routes|router|components|server|backend|frontend|api|lib|utils)\//i.test(relativePath))
        score += 45;
    if (/(main|index|app|server|route|router|api|schema|model|store|config)\./i.test(path.basename(relativePath)))
        score += 25;
    for (const term of queryTerms) {
        if (lower.includes(term))
            score += 35;
    }
    const depthPenalty = relativePath.split("/").length * 2;
    return score - depthPenalty;
}
function readProjectAnalysisFileSnippet(filePath, maxChars = 2600) {
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size > 240_000)
            return "";
        const buffer = fs.readFileSync(filePath);
        const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
        if (sample.includes(0))
            return "";
        const content = buffer.toString("utf-8").replace(/\r\n/g, "\n").trim();
        if (!content)
            return "";
        return content.length > maxChars ? `${content.slice(0, maxChars)}\n…（已截断，仅用于只读分析）` : content;
    }
    catch {
        return "";
    }
}
function buildProjectCodeReadOnlyEvidence(project, workDir, message, options = {}) {
    const maxFiles = Math.max(1, Math.min(12, Number(options.maxFiles || 8)));
    const maxChars = Math.max(4_000, Math.min(48_000, Number(options.maxChars || 20_000)));
    if (!workDir) {
        return {
            project,
            workDir: "",
            status: "unavailable",
            selectedPaths: [],
            files: [],
            manifestChecksum: "",
            truncated: false,
            issue: "项目工作目录未配置",
        };
    }
    try {
        const realRoot = fs.realpathSync(workDir);
        if (!fs.existsSync(realRoot) || !fs.statSync(realRoot).isDirectory()) {
            return {
                project,
                workDir,
                status: "unavailable",
                selectedPaths: [],
                files: [],
                manifestChecksum: "",
                truncated: false,
                issue: "项目工作目录不可读",
            };
        }
        const queryTerms = buildProjectAnalysisQueryTerms(message);
        const candidates = collectProjectAnalysisFiles(realRoot);
        const ranked = candidates
            .map(file => ({ file, score: scoreProjectAnalysisFile(file, realRoot, queryTerms) }))
            .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
        const manifest = ranked.map(item => path.relative(realRoot, item.file).replace(/\\/g, "/"));
        const files = [];
        let totalChars = 0;
        let truncated = false;
        for (const item of ranked.slice(0, maxFiles)) {
            const relativePath = path.relative(realRoot, item.file).replace(/\\/g, "/");
            const remaining = maxChars - totalChars;
            if (remaining <= 0) {
                truncated = true;
                break;
            }
            const content = readProjectAnalysisFileSnippet(item.file, Math.min(4_800, remaining));
            if (!content)
                continue;
            totalChars += content.length;
            files.push({
                path: relativePath,
                checksum: crypto.createHash("sha256").update(fs.readFileSync(item.file)).digest("hex"),
                chars: content.length,
                content,
            });
        }
        if (ranked.length > files.length || totalChars >= maxChars)
            truncated = true;
        return {
            project,
            workDir: realRoot,
            status: files.length ? "ready" : "empty",
            selectedPaths: files.map(file => file.path),
            files,
            manifestChecksum: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
            truncated,
            issue: files.length || candidates.length === 0 ? "" : "候选源码文件不可读",
        };
    }
    catch (error) {
        return {
            project,
            workDir,
            status: "unavailable",
            selectedPaths: [],
            files: [],
            manifestChecksum: "",
            truncated: false,
            issue: String(error?.message || error || "源码读取失败").slice(0, 240),
        };
    }
}
function buildGroupMainPlanningSourceContext(group, message, configs, options = {}) {
    const normalized = (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
    const members = (0, group_orchestrator_1.getRoutableMembers)(normalized);
    const allowed = new Map(members.map((member) => [String(member.project || ""), member]));
    const requested = Array.from(new Set((options.targetProjects || []).map(value => String(value || "").trim()).filter(value => allowed.has(value))));
    const selectedNames = (requested.length ? requested : Array.from(allowed.keys()))
        .slice(0, Math.max(1, Math.min(8, Number(options.maxProjects || 8))));
    const projects = selectedNames.map(project => {
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(project, normalized, configs);
        return buildProjectCodeReadOnlyEvidence(project, runtime?.workDir || "", message, {
            maxFiles: 8,
            maxChars: 20_000,
        });
    });
    const issues = projects
        .filter(project => project.status === "unavailable")
        .map(project => `${project.project}：${project.issue || "源码不可用"}`);
    const totalChars = projects.reduce((sum, project) => sum + project.files.reduce((fileSum, file) => fileSum + file.chars, 0), 0);
    const checksum = crypto.createHash("sha256").update(JSON.stringify(projects.map(project => ({
        project: project.project,
        manifestChecksum: project.manifestChecksum,
        selectedPaths: project.selectedPaths,
        files: project.files.map(file => ({ path: file.path, checksum: file.checksum })),
    })))).digest("hex");
    const renderedProjects = projects.map(project => {
        const header = [
            `## 项目 ${project.project}`,
            `source_status=${project.status}`,
            `manifest_checksum=${project.manifestChecksum || "<none>"}`,
            `selected_paths=${project.selectedPaths.join(", ") || "<none>"}`,
            project.issue ? `issue=${project.issue}` : "",
        ].filter(Boolean);
        const files = project.files.map(file => [
            `### FILE ${project.project}/${file.path} sha256=${file.checksum}`,
            "```",
            file.content,
            "```",
        ].join("\n"));
        return [...header, ...files].join("\n");
    });
    const rendered = [
        "【群聊主 Agent 任务前只读源码证据】",
        "用途：主 Agent 必须先依据这些当前源码片段生成目标、边界、数据关系、依赖顺序和验收计划，再派发开发 Agent。",
        "边界：这是只读证据。主 Agent不得修改文件；开发 Agent执行时必须重新读取当前文件，不得把快照当成已完成实现。",
        `snapshot_checksum=${checksum}`,
        `requested_projects=${requested.join(", ") || "<model scope unresolved; conservatively hydrated bound projects>"}`,
        ...renderedProjects,
    ].join("\n\n");
    return {
        schema: "ccm-group-main-source-planning-v1",
        projects,
        requestedProjects: requested,
        hydratedProjects: projects.filter(project => project.status !== "unavailable").map(project => project.project),
        checksum,
        totalChars,
        truncated: projects.some(project => project.truncated),
        ready: projects.length > 0 && issues.length === 0,
        issues,
        rendered,
    };
}
function sourcePlannerList(value, max) {
    return Array.isArray(value) ? value.slice(0, max) : [];
}
function safeSourcePlannerRelativePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}
function readSourcePlannerFile(root, relativePath, maxTokens) {
    const safeRelative = safeSourcePlannerRelativePath(relativePath);
    const absolute = path.resolve(root, safeRelative);
    const relative = path.relative(root, absolute);
    if (!safeRelative || relative.startsWith("..") || path.isAbsolute(relative) || !isProjectAnalysisCandidate(absolute, root))
        return null;
    try {
        const realAbsolute = fs.realpathSync(absolute);
        const realRelative = path.relative(root, realAbsolute);
        if (realRelative.startsWith("..") || path.isAbsolute(realRelative) || !isProjectAnalysisCandidate(realAbsolute, root))
            return null;
        const stat = fs.statSync(realAbsolute);
        if (!stat.isFile() || stat.size > 512_000)
            return null;
        const buffer = fs.readFileSync(realAbsolute);
        if (buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0))
            return null;
        const content = truncateProjectSourceToTokens(buffer.toString("utf-8").replace(/\r\n/g, "\n"), maxTokens);
        return {
            path: safeRelative,
            checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
            chars: content.length,
            content,
        };
    }
    catch {
        return null;
    }
}
async function callSourcePlanningModel(config, payload) {
    const messages = [
        {
            role: "system",
            content: `你是群聊主 Agent 的只读源码规划器。必须根据用户目标、项目文件清单和已读取源码选择下一批证据，不能按关键词机械决定最终范围。\n只返回 JSON：{"sufficient":false,"reason":"判断依据","selected_files":[{"project":"项目ID","path":"相对路径","reason":"读取原因"}],"search_queries":[{"project":"项目ID","query":"应在源码中搜索的文字或标识符"}],"plan_steps":[],"impact_scope":[],"clarification_questions":[]}\n规则：只能选择清单中的项目和路径；search_queries 必须来自对业务语义的理解；已有证据不足时 sufficient=false；最多选择24个文件和8个查询；不得声称修改或执行过源码。`,
        },
        { role: "user", content: JSON.stringify(payload) },
    ];
    return (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, { messages, maxTokens: 1400, defaultTimeoutMs: config.timeoutMs || 120_000, httpErrorPrefix: "源码规划模型调用失败" })
        : (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, { messages, defaultTimeoutMs: config.timeoutMs || 120_000, httpErrorPrefix: "源码规划模型调用失败" });
}
async function buildModelDrivenGroupPlanningSourceContext(group, message, configs, options = {}) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!config.enabled || !String(config.apiUrl || "").trim() || !String(config.apiKey || "").trim() || !String(config.model || "").trim()) {
        throw new Error("统一大模型尚未配置，无法基于真实源码形成可靠计划");
    }
    const normalized = (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
    const allowedMembers = (0, group_orchestrator_1.getRoutableMembers)(normalized);
    const allowedNames = new Set(allowedMembers.map((member) => String(member.project || "")).filter(Boolean));
    const requested = Array.from(new Set((options.targetProjects || []).map(value => String(value || "").trim()).filter(value => allowedNames.has(value))));
    const projectNames = (requested.length ? requested : Array.from(allowedNames)).slice(0, 8);
    const projectState = projectNames.map(project => {
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(project, normalized, configs);
        const rawRoot = String(runtime?.workDir || "");
        try {
            const root = fs.realpathSync(rawRoot);
            if (!fs.statSync(root).isDirectory())
                throw new Error("not_directory");
            const candidates = collectProjectAnalysisFiles(root, 6_000, 12);
            return {
                project,
                root,
                candidates,
                paths: candidates.map(file => path.relative(root, file).replace(/\\/g, "/")),
                files: new Map(),
                issue: "",
            };
        }
        catch (error) {
            return { project, root: rawRoot, candidates: [], paths: [], files: new Map(), issue: `项目工作目录不可读：${String(error?.message || error)}` };
        }
    });
    const contextWindow = Math.max(32_000, Number(config.modelContextWindow || 128_000));
    const tokenBudget = Math.max(8_000, Math.min(32_000, Math.floor(contextWindow * 0.25)));
    const maxRounds = Math.max(1, Math.min(3, Number(options.maxRounds || 3)));
    const requestedFiles = [];
    const searchQueries = [];
    let finalDecision = null;
    let projectedTokens = 0;
    let roundsUsed = 0;
    for (let round = 1; round <= maxRounds; round += 1) {
        roundsUsed = round;
        const evidenceRows = projectState.flatMap(state => Array.from(state.files.values()).map(file => ({ project: state.project, path: file.path, checksum: file.checksum, content: file.content })));
        const manifestPayload = projectState.map(state => ({
            project: state.project,
            issue: state.issue,
            paths: state.paths.slice(0, 2_000),
            manifest_truncated: state.paths.length > 2_000,
            total_paths: state.paths.length,
        }));
        const payload = {
            schema: "ccm-source-planning-round-v1",
            round,
            max_rounds: maxRounds,
            user_goal: message,
            project_manifests: manifestPayload,
            evidence: evidenceRows,
            remaining_token_budget: Math.max(0, tokenBudget - (0, context_budget_1.estimateTextTokens)(JSON.stringify(evidenceRows))),
        };
        if ((0, context_budget_1.estimateTextTokens)(JSON.stringify(payload)) > tokenBudget) {
            payload.evidence = evidenceRows.map(row => ({ ...row, content: truncateProjectSourceToTokens(row.content, 1_200) }));
        }
        finalDecision = await callSourcePlanningModel(config, payload);
        const selections = sourcePlannerList(finalDecision?.selected_files || finalDecision?.selectedFiles, 24);
        const queries = sourcePlannerList(finalDecision?.search_queries || finalDecision?.searchQueries, 8);
        for (const selection of selections) {
            const state = projectState.find(item => item.project === String(selection?.project || ""));
            const relativePath = safeSourcePlannerRelativePath(selection?.path);
            if (!state || !state.paths.includes(relativePath) || state.files.has(relativePath))
                continue;
            const remaining = Math.max(400, tokenBudget - projectState.reduce((sum, item) => sum + Array.from(item.files.values()).reduce((fileSum, file) => fileSum + (0, context_budget_1.estimateTextTokens)(file.content), 0), 0));
            const file = readSourcePlannerFile(state.root, relativePath, Math.min(4_000, remaining));
            if (!file)
                continue;
            state.files.set(relativePath, file);
            requestedFiles.push({ project: state.project, path: relativePath, reason: String(selection?.reason || "模型选择读取").slice(0, 300) });
        }
        for (const queryRow of queries) {
            const state = projectState.find(item => item.project === String(queryRow?.project || ""));
            const query = String(queryRow?.query || "").trim();
            if (!state || query.length < 2)
                continue;
            searchQueries.push({ project: state.project, query: query.slice(0, 160) });
            const lowerQuery = query.toLowerCase();
            for (const candidate of state.candidates) {
                if (state.files.size >= 16)
                    break;
                let matched = false;
                try {
                    const stat = fs.statSync(candidate);
                    if (stat.size <= 512_000)
                        matched = fs.readFileSync(candidate, "utf-8").toLowerCase().includes(lowerQuery);
                }
                catch { }
                if (!matched)
                    continue;
                const relativePath = path.relative(state.root, candidate).replace(/\\/g, "/");
                if (state.files.has(relativePath))
                    continue;
                const consumed = projectState.reduce((sum, item) => sum + Array.from(item.files.values()).reduce((fileSum, file) => fileSum + (0, context_budget_1.estimateTextTokens)(file.content), 0), 0);
                const remaining = tokenBudget - consumed;
                if (remaining < 400)
                    break;
                const file = readSourcePlannerFile(state.root, relativePath, Math.min(3_000, remaining));
                if (file)
                    state.files.set(relativePath, file);
            }
        }
        projectedTokens = projectState.reduce((sum, item) => sum + Array.from(item.files.values()).reduce((fileSum, file) => fileSum + (0, context_budget_1.estimateTextTokens)(file.content), 0), 0);
        if (finalDecision?.sufficient === true && projectedTokens > 0)
            break;
    }
    const sufficient = finalDecision?.sufficient === true && projectedTokens > 0;
    const projects = projectState.map(state => {
        const files = Array.from(state.files.values());
        return {
            project: state.project,
            workDir: state.root,
            status: state.issue ? "unavailable" : files.length ? "ready" : "empty",
            selectedPaths: files.map(file => file.path),
            files,
            manifestChecksum: crypto.createHash("sha256").update(JSON.stringify(state.paths)).digest("hex"),
            truncated: state.paths.length > 2_000 || projectedTokens >= tokenBudget,
            issue: state.issue || (!files.length ? "模型未取得足够源码证据" : ""),
        };
    });
    const checksum = crypto.createHash("sha256").update(JSON.stringify(projects.map(project => ({ project: project.project, manifestChecksum: project.manifestChecksum, files: project.files.map(file => ({ path: file.path, checksum: file.checksum })) })))).digest("hex");
    const receiptBase = {
        schema: "ccm-model-driven-source-planning-receipt-v1",
        rounds: roundsUsed,
        sufficient,
        reason: String(finalDecision?.reason || (sufficient ? "源码证据已满足规划" : "三轮后源码证据仍不足")).slice(0, 1200),
        planSteps: sourcePlannerList(finalDecision?.plan_steps || finalDecision?.planSteps, 16).map(String),
        impactScope: sourcePlannerList(finalDecision?.impact_scope || finalDecision?.impactScope, 16).map(String),
        clarificationQuestions: sourcePlannerList(finalDecision?.clarification_questions || finalDecision?.clarificationQuestions, 6).map(String),
        requestedFiles,
        searchQueries,
        tokenBudget,
        projectedTokens,
    };
    const modelPlanning = { ...receiptBase, checksum: crypto.createHash("sha256").update(JSON.stringify(receiptBase)).digest("hex") };
    const issues = [
        ...projects.filter(project => project.status === "unavailable").map(project => `${project.project}：${project.issue}`),
        ...(!sufficient ? [modelPlanning.reason || "源码证据不足"] : []),
    ];
    const rendered = [
        "【群聊主 Agent 模型驱动源码证据】",
        `snapshot_checksum=${checksum}`,
        `model_receipt_checksum=${modelPlanning.checksum}`,
        `rounds=${modelPlanning.rounds}; sufficient=${modelPlanning.sufficient}; tokens=${projectedTokens}/${tokenBudget}`,
        ...projects.map(project => `- ${project.project}: ${project.status}; files=${project.selectedPaths.join(", ") || "<none>"}; manifest=${project.manifestChecksum}`),
        `结论：${modelPlanning.reason}`,
    ].join("\n");
    return {
        schema: "ccm-group-main-source-planning-v1",
        projects,
        requestedProjects: requested,
        hydratedProjects: projects.filter(project => project.status === "ready").map(project => project.project),
        checksum,
        totalChars: projects.reduce((sum, project) => sum + project.files.reduce((fileSum, file) => fileSum + file.chars, 0), 0),
        truncated: projects.some(project => project.truncated),
        ready: sufficient && projects.length > 0 && projects.every(project => project.status === "ready"),
        issues,
        rendered,
        modelPlanning,
    };
}
function fallbackCompactMemoryText(value, max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function buildProjectCodeReadOnlySnapshot(project, workDir, message, deps = { compactMemoryText: fallbackCompactMemoryText }) {
    const evidence = buildProjectCodeReadOnlyEvidence(project, workDir, message, { maxFiles: 8, maxChars: 16_000 });
    if (evidence.status === "unavailable")
        return `- 代码快照：读取失败，${deps.compactMemoryText(evidence.issue, 180)}。`;
    if (!evidence.files.length)
        return "- 代码快照：未找到适合只读分析的源码/配置文件。";
    return [
        "### 只读代码快照",
        "说明：以下为群聊主 Agent 为回答项目分析问题读取的有限源码片段；它不能修改文件，完整实现仍以子 Agent 执行时读取的真实仓库为准。",
        ...evidence.files.map(file => `\n#### ${project}/${file.path}\n\`\`\`\n${file.content}\n\`\`\``),
    ].join("\n");
}
function buildGroupProjectAnalysisContext(group, message, ctx, configs, deps) {
    const normalized = (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
    const members = (0, group_orchestrator_1.getRoutableMembers)(normalized);
    const lines = [
        "【只读项目分析上下文】",
        "用途：帮助群聊主 Agent 回答用户关于项目、架构、代码、知识库和协作状态的询问。",
        "边界：这是只读分析；不得创建任务、不得派发子 Agent、不得声明已修改文件或运行命令。",
    ];
    if (!members.length) {
        lines.push("- 当前群聊还没有绑定可分析的项目 Agent。");
    }
    for (const member of members.slice(0, 8)) {
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(member.project, normalized, configs);
        const workDir = runtime?.workDir || "";
        const resources = deps.getProjectExtraConfig(member.project);
        lines.push("");
        lines.push(`## 项目 ${member.project}`);
        lines.push(`- 执行器：${runtime?.agentType || member.agent || "未配置"}`);
        lines.push(`- 工作目录：${workDir || "未配置"}`);
        if (workDir) {
            try {
                const entries = fs.existsSync(workDir)
                    ? fs.readdirSync(workDir).filter(name => !["node_modules", ".git", "dist", "build"].includes(name)).slice(0, 16)
                    : [];
                lines.push(`- 顶层目录：${entries.length ? entries.join("、") : "目录为空或不可读"}`);
            }
            catch (error) {
                lines.push(`- 顶层目录：读取失败，${deps.compactMemoryText(error?.message || error, 160)}`);
            }
        }
        lines.push(deps.compactMemoryText(deps.buildProjectMemoryPacket(member.project, { workDir, resources, query: message }), 2200));
        if (workDir)
            lines.push(deps.compactPreserveLines(buildProjectCodeReadOnlySnapshot(member.project, workDir, message, deps), 18_000));
    }
    // Knowledge is retrieved asynchronously by runGroupOrchestratorCore through
    // searchAgentKnowledge. Keeping retrieval out of this synchronous source
    // snapshot prevents tag-only queries from bypassing scope and visibility.
    return lines.filter(Boolean).join("\n");
}
//# sourceMappingURL=project-analysis.js.map