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
exports.scanProjectFileStructure = scanProjectFileStructure;
exports.loadProjectMemory = loadProjectMemory;
exports.updateProjectMemoryFromReceipt = updateProjectMemoryFromReceipt;
exports.recordAcceptedProjectDeliveryMemory = recordAcceptedProjectDeliveryMemory;
exports.buildProjectMemoryPacket = buildProjectMemoryPacket;
exports.buildProjectExecutionBrief = buildProjectExecutionBrief;
exports.buildProjectConversationBrief = buildProjectConversationBrief;
exports.runProjectMemorySelfTest = runProjectMemorySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const context_budget_1 = require("../system/context-budget");
const utils_1 = require("../core/utils");
const memory_control_center_1 = require("../modules/knowledge/memory-control-center");
const PROJECT_MEMORY_DIR = path.join(utils_1.CCM_DIR, "project-memory");
const PROJECT_MEMORY_VERSION = 4;
const CONCLUSION_COMPACT_THRESHOLD = 20;
const CONCLUSION_RECENT_KEEP = 10;
const DECISION_COMPACT_THRESHOLD = 80;
const DECISION_RECENT_KEEP = 40;
const TASK_HISTORY_RECENT_KEEP = 80;
const IGNORED_DIRS = new Set([".git", ".idea", ".vscode", "node_modules", "dist", "build", "target", ".next", ".nuxt", "coverage", ".gradle", ".cache"]);
function compact(value, max = 1200) {
    const text = String(value || "").replace(/\r/g, "").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function compactPreserveEdges(value, max = 1200) {
    const text = String(value || "").replace(/\r/g, "").trim();
    if (text.length <= max)
        return text;
    const head = Math.max(1, Math.floor(max * 0.58));
    const tail = Math.max(1, max - head - 34);
    return `${text.slice(0, head)}\n…[中间历史已折叠，原始归档仍保留]…\n${text.slice(-tail)}`;
}
function uniqueStrings(...values) {
    const result = [];
    const seen = new Set();
    for (const value of values.flat(Infinity)) {
        const text = String(value || "").trim();
        if (!text || seen.has(text))
            continue;
        seen.add(text);
        result.push(text);
    }
    return result;
}
function normalizeComparableText(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function contentId(prefix, value) {
    return `${prefix}_${crypto.createHash("sha256").update(normalizeComparableText(value)).digest("hex").slice(0, 16)}`;
}
function isLowValueDurableMemory(value) {
    const text = normalizeComparableText(value).replace(/[。.!！]+$/g, "");
    if (!text || text.length < 4)
        return true;
    return /^(?:已)?(?:完成|处理|修改|修复|优化)(?:了)?(?:本次)?(?:任务|工作|需求)?$|^(?:本次)?(?:任务|工作|需求)(?:已经|已)?(?:完成|处理|修改|修复|优化)$|^(?:测试|构建|编译|验证)(?:已经|已)?(?:通过|完成|成功)$|^(?:无|没有|暂无|none|n\/a|null)$/i.test(text);
}
const DURABLE_MEMORY_TYPES = new Set(["constraint", "decision", "fact", "lesson", "risk", "open_item", "contract"]);
function normalizeDurableMemoryType(value, fallback = "fact") {
    const raw = String(value || fallback).trim().toLowerCase().replace(/[\s-]+/g, "_");
    const aliases = {
        constraints: "constraint", user_constraint: "constraint", rule: "constraint",
        decisions: "decision", architecture_decision: "decision",
        facts: "fact", stable_fact: "fact",
        lessons: "lesson", pitfall: "lesson",
        risks: "risk", warning: "risk",
        open_items: "open_item", openitem: "open_item", todo: "open_item", follow_up: "open_item",
        contracts: "contract", contract_change: "contract",
    };
    const normalized = aliases[raw] || raw;
    return DURABLE_MEMORY_TYPES.has(normalized) ? normalized : fallback;
}
function normalizeDurableMemoryCandidate(value, fallbackType, meta) {
    const object = value && typeof value === "object" ? value : {};
    const content = compact(typeof value === "string"
        ? value
        : object.content || object.value || object.text || object.decision || object.title || object.summary || "", 1000);
    if (!content || isLowValueDurableMemory(content))
        return null;
    const type = normalizeDurableMemoryType(object.type || object.kind, fallbackType);
    const status = ["active", "resolved", "superseded"].includes(String(object.status || "").toLowerCase())
        ? String(object.status).toLowerCase()
        : "active";
    const now = meta.time || new Date().toISOString();
    return {
        id: contentId(type, content),
        type,
        content,
        reason: compact(object.reason || object.rationale || "", 600),
        evidence: uniqueStrings(object.evidence || object.sources || []).slice(0, 12),
        relatedFiles: uniqueStrings(object.relatedFiles || object.related_files || meta.filesModified || []).slice(0, 24),
        status,
        confidence: meta.accepted === true ? "accepted" : "unverified",
        createdAt: now,
        updatedAt: now,
        lastVerifiedAt: meta.accepted === true ? now : "",
        occurrences: 1,
        source: {
            kind: String(meta.sourceKind || "agent_receipt"),
            taskId: String(meta.taskId || ""),
            groupId: String(meta.groupId || ""),
            agent: String(meta.agent || ""),
        },
        sourceTaskIds: uniqueStrings(meta.taskId || []).slice(-20),
    };
}
function extractDurableMemoryCandidates(receipt, meta) {
    if (String(receipt?.status || "").toLowerCase() !== "done" || meta.accepted !== true)
        return [];
    const block = receipt.projectMemory || receipt.project_memory || receipt.durableMemory || receipt.durable_memory || {};
    const candidates = [];
    const addMany = (values, type) => {
        const rows = Array.isArray(values) ? values : values ? [values] : [];
        for (const row of rows) {
            const candidate = normalizeDurableMemoryCandidate(row, type, meta);
            if (candidate)
                candidates.push(candidate);
        }
    };
    addMany(block.constraints || block.userConstraints || block.user_constraints, "constraint");
    addMany(block.decisions, "decision");
    addMany(block.facts || block.stableFacts || block.stable_facts, "fact");
    addMany(block.lessons || block.pitfalls, "lesson");
    addMany(block.risks, "risk");
    addMany(block.openItems || block.open_items || block.followUps || block.follow_ups, "open_item");
    addMany(block.contracts || block.contractChanges || block.contract_changes, "contract");
    addMany(receipt.newDecisions || receipt.new_decisions, "decision");
    for (const change of Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes) : []) {
        const content = [
            change?.type ? `${change.type}` : "契约变更",
            change?.endpoint || change?.path || "",
            Array.isArray(change?.fields) && change.fields.length ? `字段 ${change.fields.join("、")}` : "",
            change?.note || "",
        ].filter(Boolean).join("：");
        const candidate = normalizeDurableMemoryCandidate({ type: "contract", content, reason: change?.note || "" }, "contract", meta);
        if (candidate)
            candidates.push(candidate);
    }
    return candidates;
}
function mergeDurableMemories(existing, candidates) {
    const result = Array.isArray(existing) ? [...existing] : [];
    for (const candidate of candidates) {
        const index = result.findIndex(item => item?.id === candidate.id
            || (item?.type === candidate.type && normalizeComparableText(item?.content) === normalizeComparableText(candidate.content)));
        if (index < 0) {
            result.push(candidate);
            continue;
        }
        const previous = result[index] || {};
        result[index] = {
            ...previous,
            ...candidate,
            createdAt: previous.createdAt || candidate.createdAt,
            reason: candidate.reason || previous.reason || "",
            evidence: uniqueStrings(previous.evidence || [], candidate.evidence || []).slice(-12),
            relatedFiles: uniqueStrings(previous.relatedFiles || [], candidate.relatedFiles || []).slice(-24),
            occurrences: Number(previous.occurrences || 1) + 1,
            sourceTaskIds: uniqueStrings(previous.sourceTaskIds || [], candidate.sourceTaskIds || []).slice(-20),
        };
    }
    return result;
}
function buildTaskHistoryRecord(receipt, meta) {
    const summary = compact(receipt.summary || "", 1000);
    const filesModified = uniqueStrings(meta.filesModified || [], receipt.filesChanged || receipt.files_changed || []).slice(-120);
    const actions = uniqueStrings(receipt.actions || []).slice(0, 30);
    const verification = uniqueStrings(receipt.verification || []).slice(0, 20);
    const blockers = uniqueStrings(receipt.blockers || []).slice(0, 20);
    const needs = uniqueStrings(receipt.needs || []).slice(0, 20);
    if (!summary && !filesModified.length && !actions.length && !verification.length && !blockers.length && !needs.length)
        return null;
    const identity = [meta.taskId || "", meta.agent || "", summary, filesModified.join("|")].join("::");
    return {
        id: meta.taskId ? `task_${contentId("history", `${meta.taskId}:${meta.agent || ""}`).slice(8)}` : contentId("history", identity),
        time: meta.time,
        updatedAt: meta.time,
        taskId: String(meta.taskId || ""),
        groupId: String(meta.groupId || ""),
        agent: String(meta.agent || ""),
        sourceKind: String(meta.sourceKind || "agent_receipt"),
        status: String(receipt.status || "partial"),
        summary,
        actions,
        filesModified,
        verification,
        blockers,
        needs,
        memoryUsed: uniqueStrings(receipt.memoryUsed || receipt.memory_used || []).slice(0, 20),
        memoryIgnored: uniqueStrings(receipt.memoryIgnored || receipt.memory_ignored || []).slice(0, 20),
        invokedSkills: uniqueStrings((receipt.invokedSkills || receipt.invoked_skills || []).map((item) => typeof item === "string" ? item : `Skill:${item.name || ""}${item.contentHash ? `#${item.contentHash}` : ""}`), (receipt.memoryUsed || receipt.memory_used || []).filter((item) => /Skill\s*[:：]/i.test(String(item || "")))).slice(0, 20),
    };
}
function upsertTaskHistory(existing, record) {
    if (!record)
        return Array.isArray(existing) ? existing : [];
    const result = Array.isArray(existing) ? [...existing] : [];
    const index = result.findIndex(item => item?.id === record.id || (record.taskId && item?.taskId === record.taskId && String(item?.agent || "") === record.agent));
    if (index >= 0)
        result[index] = { ...result[index], ...record, time: result[index]?.time || record.time };
    else
        result.push(record);
    return result.slice(-TASK_HISTORY_RECENT_KEEP);
}
function searchTokens(value) {
    const text = String(value || "").toLowerCase();
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        tokens.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        tokens.add(chinese.slice(index, index + 2));
    return [...tokens].slice(0, 100);
}
function buildRelevantArchiveEvidence(memory, query, maxRecords = 6) {
    const tokens = searchTokens(query);
    if (!tokens.length)
        return "";
    const candidates = [];
    const scoreRecord = (text) => {
        const lower = text.toLowerCase();
        let score = 0;
        for (const token of tokens)
            if (lower.includes(token))
                score += token.length >= 4 ? 3 : 1;
        return score;
    };
    for (const record of memory.taskHistory || []) {
        const text = `${record.summary || ""} ${(record.actions || []).join(" ")} ${(record.filesModified || []).join(" ")} ${(record.verification || []).join(" ")}`;
        const score = scoreRecord(text);
        if (score >= 2)
            candidates.push({ score, time: record.updatedAt || record.time || "", type: "task_history", text: compactPreserveEdges(text, 1200), archiveId: record.id || "" });
    }
    for (const record of memory.conclusions || []) {
        const text = `${record.summary || ""} ${(record.filesModified || []).join(" ")} ${(record.verification || []).join(" ")}`;
        const score = scoreRecord(text);
        if (score >= 2)
            candidates.push({ score, time: record.time || "", type: "legacy_conclusion", text: compactPreserveEdges(text, 1200), archiveId: record.taskId || "" });
    }
    for (const archive of [...(memory.conclusionArchives || []), ...(memory.decisionArchives || [])]) {
        for (const record of archive?.records || []) {
            const text = archive.kind === "decisions"
                ? `${record.decision || ""} ${record.reason || ""}`
                : `${record.summary || ""} ${(record.filesModified || []).join(" ")} ${(record.verification || []).join(" ")}`;
            const score = scoreRecord(text);
            if (score >= 2)
                candidates.push({ score, time: record.time || "", type: archive.kind, text: compactPreserveEdges(text, 1200), archiveId: archive.id || "" });
        }
    }
    const selected = candidates.sort((a, b) => b.score - a.score || String(b.time).localeCompare(String(a.time))).slice(0, maxRecords);
    if (!selected.length)
        return "";
    return [
        "- 按本次任务召回的历史执行证据（仅供参考，使用前核验当前代码）：",
        ...selected.map(item => `  - [${item.type}/${item.archiveId}] ${item.time || ""} ${item.text}`),
    ].join("\n");
}
function scoreDurableMemory(item, queryTokens) {
    const text = `${item?.content || ""} ${item?.reason || ""} ${(item?.relatedFiles || []).join(" ")}`.toLowerCase();
    let score = 0;
    for (const token of queryTokens)
        if (text.includes(token))
            score += token.length >= 4 ? 3 : 1;
    if (item?.type === "constraint")
        score += 30;
    if (["risk", "open_item"].includes(item?.type))
        score += 20;
    if (["decision", "contract"].includes(item?.type))
        score += 10;
    if (item?.confidence === "accepted")
        score += 4;
    return score;
}
function buildDurableMemoryContext(memory, query, maxRecords = 24) {
    const queryTokens = searchTokens(query);
    const active = (Array.isArray(memory.durableMemories) ? memory.durableMemories : [])
        .filter((item) => item?.status !== "resolved" && item?.status !== "superseded" && item?.content)
        .map((item) => ({ item, score: scoreDurableMemory(item, queryTokens) }))
        .filter((row) => row.score > 0 || row.item.type === "constraint")
        .sort((a, b) => b.score - a.score || String(b.item.updatedAt || "").localeCompare(String(a.item.updatedAt || "")))
        .slice(0, maxRecords)
        .map((row) => row.item);
    if (!active.length)
        return "- 核心长期记忆：当前没有通过验收门禁的相关记录。";
    const labels = {
        constraint: "长期约束", decision: "关键决策", fact: "稳定事实", lesson: "历史经验",
        risk: "已知风险", open_item: "未完成事项", contract: "稳定契约",
    };
    return [
        "- 核心长期记忆（已通过任务验收；与当前源码冲突时以当前源码为准）：",
        ...active.map((item) => `  - [${labels[item.type] || item.type}] ${item.content}${item.reason ? `（${item.reason}）` : ""}`),
    ].join("\n");
}
function memoryFile(project) {
    const slug = String(project || "project").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) || "project";
    const suffix = crypto.createHash("sha1").update(String(project || "project")).digest("hex").slice(0, 8);
    return path.join(PROJECT_MEMORY_DIR, `${slug}-${suffix}.json`);
}
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        try {
            return { ...JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8")), storageRecovery: { recoveredFromBackup: true, recoveredAt: new Date().toISOString(), corruptedFile: file } };
        }
        catch {
            return null;
        }
    }
}
function writeJsonAtomic(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    const backup = `${file}.bak`;
    try {
        if (fs.existsSync(file)) {
            JSON.parse(fs.readFileSync(file, "utf-8"));
            fs.copyFileSync(file, backup);
        }
    }
    catch { }
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, file);
}
function detectTechStack(workDir) {
    const stack = [];
    if (!workDir || !fs.existsSync(workDir))
        return stack;
    const has = (name) => fs.existsSync(path.join(workDir, name));
    if (has("package.json")) {
        stack.push("Node.js");
        const pkg = readJson(path.join(workDir, "package.json")) || {};
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (has("tsconfig.json") || deps.typescript)
            stack.push("TypeScript");
        const mappings = [
            ["vue", "Vue"], ["react", "React"], ["next", "Next.js"], ["@nestjs/core", "NestJS"],
            ["express", "Express"], ["vite", "Vite"], ["electron", "Electron"], ["prisma", "Prisma"],
        ];
        for (const [dependency, label] of mappings)
            if (deps[dependency])
                stack.push(label);
    }
    if (has("pom.xml"))
        stack.push("Java", "Maven");
    if (has("build.gradle") || has("build.gradle.kts"))
        stack.push("Java/Kotlin", "Gradle");
    if (has("go.mod"))
        stack.push("Go");
    if (has("Cargo.toml"))
        stack.push("Rust");
    if (has("pyproject.toml") || has("requirements.txt"))
        stack.push("Python");
    if (has("composer.json"))
        stack.push("PHP", "Composer");
    return uniqueStrings(stack);
}
function scanProjectFileStructure(workDir, maxDepth = 3, maxEntries = 220) {
    const root = String(workDir || "").trim();
    if (!root || !fs.existsSync(root))
        return "工作目录不可用，尚未生成目录结构。";
    const lines = [path.basename(root) + "/"];
    let count = 0;
    const walk = (dir, depth, prefix) => {
        if (depth > maxDepth || count >= maxEntries)
            return;
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true })
                .filter(entry => !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".ccm-"))
                .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (count >= maxEntries)
                break;
            count++;
            lines.push(`${prefix}${entry.isDirectory() ? "├─ " : "├─ "}${entry.name}${entry.isDirectory() ? "/" : ""}`);
            if (entry.isDirectory())
                walk(path.join(dir, entry.name), depth + 1, `${prefix}│  `);
        }
    };
    walk(root, 1, "");
    if (count >= maxEntries)
        lines.push(`… 已达到 ${maxEntries} 项上限，执行时可在项目目录读取完整结构。`);
    return lines.join("\n");
}
function inferArchitecture(workDir, techStack, fileStructure) {
    const topDirs = fileStructure.split(/\r?\n/).slice(1, 18).filter(line => line.endsWith("/")).map(line => line.replace(/[├─│\s/]/g, "")).filter(Boolean);
    return compact([
        techStack.length ? `基于 ${techStack.join("、")}。` : "技术栈尚待项目 Agent确认。",
        topDirs.length ? `主要模块目录包括 ${topDirs.slice(0, 8).join("、")}。` : "模块边界尚待项目 Agent确认。",
        workDir ? `工作目录：${workDir}` : "",
    ].filter(Boolean).join(" "), 1200);
}
function createEmptyProjectMemory(project, workDir = "") {
    const fileStructure = scanProjectFileStructure(workDir);
    const techStack = detectTechStack(workDir);
    return {
        version: PROJECT_MEMORY_VERSION,
        project,
        workDir,
        architecture: inferArchitecture(workDir, techStack, fileStructure),
        techStack,
        fileStructure,
        compressedConclusions: "",
        legacyCompressedConclusions: "",
        conclusions: [],
        conclusionArchives: [],
        taskHistory: [],
        durableMemories: [],
        memoryPolicy: {
            schema: "ccm-project-memory-policy-v4",
            taskHistoryInjectedByDefault: false,
            durableMemoryRequiresAcceptedDoneReceipt: true,
            legacyConclusionsInjectedByDefault: false,
        },
        decisions: [],
        decisionArchives: [],
        filesModified: [],
        resources: { mcp: [], skill: [], sharedDocuments: [] },
        compression: {
            threshold: CONCLUSION_COMPACT_THRESHOLD,
            totalConclusions: 0,
            compressedConclusions: 0,
            recentConclusions: 0,
            lastCompactedAt: "",
        },
        compactBoundary: null,
        updatedAt: new Date().toISOString(),
    };
}
function applyResourceConfig(memory, resources = {}) {
    memory.resources = {
        mcp: uniqueStrings(resources.mcp || memory.resources?.mcp || []),
        skill: uniqueStrings(resources.skill || memory.resources?.skill || []),
        sharedDocuments: uniqueStrings(resources.sharedDocuments || memory.resources?.sharedDocuments || []),
    };
    return memory;
}
function loadProjectMemory(project, options = {}) {
    const file = memoryFile(project);
    const stored = fs.existsSync(file) ? readJson(file) : null;
    const memory = {
        ...createEmptyProjectMemory(project, options.workDir || stored?.workDir || ""),
        ...(stored || {}),
        project,
        workDir: options.workDir || stored?.workDir || "",
    };
    if (stored?.storageRecovery?.recoveredFromBackup) {
        (0, memory_control_center_1.recordMemoryMetric)("recovery_success", { scope: "project", scopeId: project, source: "automatic_backup" });
    }
    if (Number(stored?.version || 1) < PROJECT_MEMORY_VERSION && stored?.compressedConclusions && !stored?.legacyCompressedConclusions) {
        memory.legacyCompressedConclusions = String(stored.compressedConclusions);
    }
    memory.version = PROJECT_MEMORY_VERSION;
    memory.conclusionArchives = Array.isArray(memory.conclusionArchives) ? memory.conclusionArchives : [];
    memory.decisionArchives = Array.isArray(memory.decisionArchives) ? memory.decisionArchives : [];
    memory.taskHistory = Array.isArray(memory.taskHistory) ? memory.taskHistory.slice(-TASK_HISTORY_RECENT_KEEP) : [];
    memory.durableMemories = Array.isArray(memory.durableMemories) ? memory.durableMemories : [];
    memory.memoryPolicy = {
        schema: "ccm-project-memory-policy-v4",
        taskHistoryInjectedByDefault: false,
        durableMemoryRequiresAcceptedDoneReceipt: true,
        legacyConclusionsInjectedByDefault: false,
        ...(memory.memoryPolicy || {}),
    };
    memory.integrity = {
        conclusions: validateArchiveIntegrity(memory.conclusionArchives),
        decisions: validateArchiveIntegrity(memory.decisionArchives),
    };
    if (options.refreshStructure && memory.workDir) {
        memory.fileStructure = scanProjectFileStructure(memory.workDir);
        const detected = detectTechStack(memory.workDir);
        memory.techStack = uniqueStrings(memory.techStack || [], detected);
        if (!memory.architecture)
            memory.architecture = inferArchitecture(memory.workDir, memory.techStack, memory.fileStructure);
    }
    applyResourceConfig(memory, options.resources);
    memory.updatedAt = new Date().toISOString();
    writeJsonAtomic(file, memory);
    return memory;
}
function createArchive(kind, records) {
    const serialized = JSON.stringify(records);
    const checksum = crypto.createHash("sha256").update(serialized).digest("hex");
    const summary = kind === "conclusions"
        ? records.map((item) => `- ${item.time || ""} ${item.taskId ? `[${item.taskId}] ` : ""}${item.summary || ""}${item.filesModified?.length ? `；文件：${item.filesModified.slice(0, 6).join("、")}` : ""}`).join("\n")
        : records.map((item) => `- ${item.time || ""} ${item.taskId ? `[${item.taskId}] ` : ""}${item.decision || ""}${item.reason ? `（${item.reason}）` : ""}`).join("\n");
    return {
        id: `${kind}-${Date.now().toString(36)}-${checksum.slice(0, 8)}`,
        kind,
        count: records.length,
        from: records[0]?.time || "",
        to: records.at(-1)?.time || "",
        checksum,
        summary: compactPreserveEdges(summary, 5000),
        records,
        createdAt: new Date().toISOString(),
    };
}
function appendArchive(existing, archive) {
    const archives = Array.isArray(existing) ? existing : [];
    if (!archive?.records?.length || archives.some(item => item?.checksum === archive.checksum))
        return archives;
    return [...archives, archive];
}
function renderArchiveIndex(archives, legacy = "", max = 14_000) {
    const rows = (Array.isArray(archives) ? archives : []).map(item => `[归档 ${item.id}｜${item.count || 0} 条｜${item.from || "?"} → ${item.to || "?"}｜校验 ${String(item.checksum || "").slice(0, 12)}]\n${item.summary || ""}`);
    const text = [legacy ? `历史版本摘要：\n${legacy}` : "", ...rows].filter(Boolean).join("\n\n");
    return compactPreserveEdges(text, max);
}
function validateArchiveIntegrity(archives) {
    const corrupted = [];
    for (const archive of Array.isArray(archives) ? archives : []) {
        const checksum = crypto.createHash("sha256").update(JSON.stringify(archive?.records || [])).digest("hex");
        if (!archive?.checksum || checksum !== archive.checksum)
            corrupted.push(String(archive?.id || "unknown"));
    }
    return { pass: corrupted.length === 0, corrupted, checkedAt: new Date().toISOString() };
}
function compactConclusions(memory) {
    const conclusions = Array.isArray(memory.conclusions) ? memory.conclusions : [];
    const totalBefore = Number(memory.compression?.totalConclusions || 0);
    if (conclusions.length <= CONCLUSION_COMPACT_THRESHOLD) {
        memory.compression = {
            ...(memory.compression || {}),
            threshold: CONCLUSION_COMPACT_THRESHOLD,
            totalConclusions: Math.max(totalBefore, conclusions.length + Number(memory.compression?.compressedConclusions || 0)),
            recentConclusions: conclusions.length,
        };
        return memory;
    }
    const preCompactTokenCount = (0, context_budget_1.estimateTextTokens)(JSON.stringify({ compressedConclusions: memory.compressedConclusions || "", conclusions }));
    const older = conclusions.slice(0, -CONCLUSION_RECENT_KEEP);
    const archive = createArchive("conclusions", older);
    memory.conclusions = conclusions.slice(-CONCLUSION_RECENT_KEEP);
    memory.conclusionArchives = appendArchive(memory.conclusionArchives, archive);
    memory.compressedConclusions = renderArchiveIndex(memory.conclusionArchives, memory.legacyCompressedConclusions, 14_000);
    const postCompactTokenCount = (0, context_budget_1.estimateTextTokens)(JSON.stringify({ compressedConclusions: memory.compressedConclusions || "", conclusions: memory.conclusions || [] }));
    const contextBudget = (0, context_budget_1.buildContextBudget)({ context: { compressedConclusions: memory.compressedConclusions, recentConclusions: memory.conclusions }, maxChars: 30_000, maxTokens: 90_000 });
    memory.compactBoundary = {
        type: "project_memory_boundary",
        archiveId: archive.id,
        kind: "conclusions",
        preCompactTokenCount,
        postCompactTokenCount,
        preservedRecentItems: memory.conclusions.length,
        post_compact_restore: {
            strategy: "project_memory_brief_reinject",
            recentConclusionTaskIds: memory.conclusions.map((item) => item.taskId).filter(Boolean).slice(-8),
            filesModified: (memory.filesModified || []).slice(-12),
            archiveIds: (memory.conclusionArchives || []).slice(-5).map((item) => item.id).filter(Boolean),
        },
        context_budget: contextBudget,
        createdAt: new Date().toISOString(),
    };
    memory.compression = {
        ...(memory.compression || {}),
        threshold: CONCLUSION_COMPACT_THRESHOLD,
        totalConclusions: Math.max(totalBefore, Number(memory.compression?.compressedConclusions || 0) + conclusions.length),
        compressedConclusions: Number(memory.compression?.compressedConclusions || 0) + older.length,
        recentConclusions: memory.conclusions.length,
        archivedChunks: memory.conclusionArchives.length,
        preCompactTokenCount,
        postCompactTokenCount,
        context_budget: contextBudget,
        lastCompactedAt: new Date().toISOString(),
    };
    return memory;
}
function compactDecisions(memory) {
    const decisions = Array.isArray(memory.decisions) ? memory.decisions : [];
    if (decisions.length <= DECISION_COMPACT_THRESHOLD)
        return memory;
    const preCompactTokenCount = (0, context_budget_1.estimateTextTokens)(JSON.stringify({ decisions, decisionArchives: memory.decisionArchives || [] }));
    const older = decisions.slice(0, -DECISION_RECENT_KEEP);
    const archive = createArchive("decisions", older);
    memory.decisions = decisions.slice(-DECISION_RECENT_KEEP);
    memory.decisionArchives = appendArchive(memory.decisionArchives, archive);
    const postCompactTokenCount = (0, context_budget_1.estimateTextTokens)(JSON.stringify({ decisions: memory.decisions, decisionArchives: memory.decisionArchives || [] }));
    const contextBudget = (0, context_budget_1.buildContextBudget)({ context: { decisions: memory.decisions, decisionArchives: memory.decisionArchives }, maxChars: 30_000, maxTokens: 90_000 });
    memory.decisionCompactBoundary = {
        type: "project_memory_boundary",
        archiveId: archive.id,
        kind: "decisions",
        preCompactTokenCount,
        postCompactTokenCount,
        preservedRecentItems: memory.decisions.length,
        post_compact_restore: {
            strategy: "project_decision_reinject",
            recentDecisionIds: memory.decisions.map((item) => item.id).filter(Boolean).slice(-8),
            archiveIds: (memory.decisionArchives || []).slice(-5).map((item) => item.id).filter(Boolean),
        },
        context_budget: contextBudget,
        createdAt: new Date().toISOString(),
    };
    return memory;
}
function updateProjectMemoryFromReceipt(input) {
    const memory = loadProjectMemory(input.project, { workDir: input.workDir, resources: input.resources });
    const receipt = input.receipt || {};
    const now = new Date().toISOString();
    const actualPaths = (input.actualFiles || []).map((item) => item?.path || item).filter(Boolean);
    const filesModified = uniqueStrings(actualPaths, receipt.filesChanged || receipt.files_changed || []).slice(-120);
    const meta = {
        time: now,
        taskId: input.taskId || "",
        groupId: input.groupId || "",
        agent: input.agent || input.project,
        sourceKind: input.sourceKind || "agent_receipt",
        accepted: input.accepted === true,
        filesModified,
    };
    const historyRecord = buildTaskHistoryRecord(receipt, meta);
    memory.taskHistory = upsertTaskHistory(memory.taskHistory, historyRecord);
    const durableCandidates = extractDurableMemoryCandidates(receipt, meta);
    memory.durableMemories = mergeDurableMemories(memory.durableMemories, durableCandidates);
    memory.filesModified = uniqueStrings(memory.filesModified || [], filesModified).slice(-240);
    const projectMemory = receipt.projectMemory || receipt.project_memory || {};
    if (meta.accepted && projectMemory.architectureVerified === true && receipt.architecture)
        memory.architecture = compact(receipt.architecture, 3000);
    if (meta.accepted && projectMemory.techStackVerified === true && Array.isArray(receipt.techStack || receipt.tech_stack)) {
        memory.techStack = uniqueStrings(memory.techStack || [], receipt.techStack || receipt.tech_stack).slice(0, 40);
    }
    const scannedStructure = scanProjectFileStructure(memory.workDir);
    memory.fileStructure = scannedStructure.startsWith("工作目录不可用") && (receipt.fileStructure || receipt.file_structure)
        ? compact(receipt.fileStructure || receipt.file_structure, 20_000)
        : scannedStructure;
    applyResourceConfig(memory, input.resources);
    compactConclusions(memory);
    compactDecisions(memory);
    const audit = {
        id: contentId("admission", `${input.taskId || ""}:${input.agent || input.project}:${historyRecord?.id || "empty"}`),
        at: now,
        taskId: String(input.taskId || ""),
        groupId: String(input.groupId || ""),
        agent: String(input.agent || input.project),
        sourceKind: String(input.sourceKind || "agent_receipt"),
        receiptStatus: String(receipt.status || "partial"),
        acceptedDelivery: meta.accepted,
        taskHistoryRecorded: !!historyRecord,
        durableCandidateCount: durableCandidates.length,
        decision: durableCandidates.length ? "durable_memory_committed" : meta.accepted ? "history_only_no_explicit_durable_memory" : "history_only_not_accepted",
    };
    memory.lastMemoryAdmission = audit;
    memory.integrity = {
        conclusions: validateArchiveIntegrity(memory.conclusionArchives),
        decisions: validateArchiveIntegrity(memory.decisionArchives),
    };
    memory.updatedAt = now;
    writeJsonAtomic(memoryFile(input.project), memory);
    return memory;
}
function recordAcceptedProjectDeliveryMemory(input) {
    const task = input.task || {};
    const delivery = input.deliverySummary || {};
    if (delivery.acceptance_gate_passed !== true) {
        return { committed: false, reason: "acceptance_gate_not_passed", projects: [], durableCandidateCount: 0 };
    }
    const receipts = Array.isArray(delivery.receipts) ? delivery.receipts : [];
    const profiles = Array.isArray(delivery.project_agent_profiles) ? delivery.project_agent_profiles : [];
    const results = [];
    for (const receipt of receipts) {
        const role = String(receipt?.role || "").toLowerCase();
        const project = String(receipt?.agent || task.target_project || task.targetProject || "").trim();
        if (!project || role === "independent_verifier" || /(?:^|[-_\s])test[-_\s]?agent(?:$|[-_\s])|coordinator/i.test(project))
            continue;
        if (String(receipt?.status || "").toLowerCase() !== "done")
            continue;
        const profile = profiles.find((item) => String(item?.project || item?.name || item?.agent || "") === project) || {};
        try {
            const memory = updateProjectMemoryFromReceipt({
                project,
                workDir: profile.workDir || profile.work_dir || profile.workingDirectory || profile.working_directory || "",
                groupId: task.group_id || task.groupId || "",
                taskId: task.id || "",
                agent: project,
                accepted: true,
                sourceKind: "accepted_project_delivery",
                receipt,
                actualFiles: receipt.filesChanged || receipt.files_changed || [],
                resources: input.resources,
            });
            results.push({
                project,
                taskHistoryRecorded: memory.lastMemoryAdmission?.taskHistoryRecorded === true,
                durableCandidateCount: Number(memory.lastMemoryAdmission?.durableCandidateCount || 0),
            });
        }
        catch (error) {
            results.push({ project, error: String(error?.message || error), taskHistoryRecorded: false, durableCandidateCount: 0 });
        }
    }
    return {
        committed: results.some(item => !item.error && (item.taskHistoryRecorded || item.durableCandidateCount > 0)),
        reason: results.length ? "accepted_delivery_processed" : "no_implementation_receipts",
        projects: results,
        durableCandidateCount: results.reduce((sum, item) => sum + Number(item.durableCandidateCount || 0), 0),
    };
}
function buildProjectMemoryPacket(project, options = {}) {
    const memory = (0, memory_control_center_1.applyMemoryControls)("project", project, loadProjectMemory(project, { workDir: options.workDir, resources: options.resources, refreshStructure: false }));
    const lines = [
        "第二层：独立项目长期记忆（跨群聊、跨临时会话持续保存）：",
        `- 项目：${memory.project}`,
        `- 工作目录：${memory.workDir || "未配置"}`,
        `- 架构描述：${memory.architecture || "尚未记录"}（仅作定位提示，执行前核验当前源码）`,
        `- 技术栈：${memory.techStack?.length ? memory.techStack.join("、") : "尚未识别"}`,
        `- 记忆策略：只注入通过最终验收的长期约束、决策、事实、经验、风险、未完成事项和稳定契约；普通任务回执不默认进入上下文。`,
    ];
    if (memory.storageRecovery?.recoveredFromBackup)
        lines.push("- 存储恢复：主文件损坏，本次已从最近有效备份恢复。");
    if (memory.integrity?.conclusions?.pass === false || memory.integrity?.decisions?.pass === false) {
        lines.push(`- ⚠ 项目记忆归档校验异常：${[...(memory.integrity?.conclusions?.corrupted || []), ...(memory.integrity?.decisions?.corrupted || [])].join("、")}`);
    }
    lines.push(buildDurableMemoryContext(memory, String(options.query || "")));
    const archiveEvidence = buildRelevantArchiveEvidence(memory, String(options.query || ""));
    if (archiveEvidence)
        lines.push(archiveEvidence);
    lines.push(`- MCP：${memory.resources?.mcp?.join("、") || "无"}`);
    lines.push(`- Skills：${memory.resources?.skill?.join("、") || "无"}`);
    lines.push(`- 共享文档：${memory.resources?.sharedDocuments?.join("、") || "无"}`);
    lines.push("- 当前目录和文件状态：不从长期记忆注入缓存快照；执行时直接读取工作目录。", "- 普通任务历史：仅在与本轮任务关键词相关时召回，不能替代当前源码与命令结果。");
    return lines.join("\n");
}
function buildProjectGitStatusSummary(workDir = "") {
    if (!workDir)
        return "- 当前 Git 状态：工作目录未配置。";
    try {
        const entries = (0, utils_1.parseGitStatus)(workDir).slice(0, 24);
        if (!entries.length)
            return "- 当前 Git 状态：无未提交变更。";
        return [
            `- 当前 Git 状态：${entries.length} 个未提交文件（最多展示 24 个）。`,
            ...entries.map((entry) => `  - ${entry.statusCode || ""} ${entry.path}`),
        ].join("\n");
    }
    catch (error) {
        return `- 当前 Git 状态：读取失败，${compact(error?.message || error, 240)}。`;
    }
}
function buildProjectExecutionBrief(project, taskText, options = {}) {
    const query = String(options.query || taskText || "");
    const verificationHints = Array.isArray(options.verificationHints)
        ? options.verificationHints.filter(Boolean).join("；")
        : String(options.verificationHints || "").trim();
    return [
        "【CCM 项目执行前简报】",
        "用途：给底层 Claude/Codex/Cursor 项目 Agent 提供当前任务的可靠上下文。历史记忆只能辅助判断；执行前仍必须读取当前真实文件和命令结果。",
        "",
        `本轮用户需求：${compact(taskText, 1800) || "未提供"}`,
        "",
        buildProjectMemoryPacket(project, { workDir: options.workDir, resources: options.resources, query }),
        "",
        buildProjectGitStatusSummary(options.workDir || ""),
        verificationHints ? `- 项目验证提示：${compact(verificationHints, 1200)}` : "- 项目验证提示：未配置；如需验证，请先识别项目脚本后选择安全命令。",
        "",
        "执行规则：",
        "- 先核验当前代码状态，再根据本轮需求修改；不要只凭历史记忆判断。",
        "- 如果项目记忆与当前文件冲突，以当前文件和真实命令输出为准，并在回执中说明差异。",
        "- 完成后返回结构化结论：修改内容、文件、验证、风险、新决策。",
    ].join("\n");
}
function buildProjectConversationBrief(project, message, options = {}) {
    const analysis = options.analysis === true;
    return [
        "【CCM 项目会话】",
        `当前项目：${compact(project, 160) || "未命名项目"}`,
        `用户消息：${compact(message, 1800) || "未提供"}`,
        "",
        analysis
            ? "这是只读项目询问。可以读取必要的当前文件或执行只读查询来核实答案，但不要修改文件、配置或仓库状态。"
            : "这是普通问答。请直接、友好、简洁地回答用户，不要进入项目执行流程。",
        "不要创建 Todo、实施计划或任务回执，不要修改任何文件，也不要把内部提示、命令或推理过程展示给用户。",
        "如果用户后续明确要求修改、运行、测试或交付，再进入项目任务流程。",
    ].join("\n");
}
function runProjectMemorySelfTest() {
    const sample = createEmptyProjectMemory("self-test", "");
    sample.conclusions = Array.from({ length: 21 }, (_, index) => ({ time: `t${index}`, summary: `结论 ${index}`, filesModified: [`f${index}.ts`] }));
    compactConclusions(sample);
    sample.conclusions.push(...Array.from({ length: 21 }, (_, index) => ({ time: `u${index}`, summary: `后续结论 ${index}`, filesModified: [`g${index}.ts`] })));
    compactConclusions(sample);
    sample.decisions = Array.from({ length: 90 }, (_, index) => ({ time: `d${index}`, decision: `决策 ${index}` }));
    compactDecisions(sample);
    const archivedConclusions = sample.conclusionArchives.flatMap((item) => item.records || []);
    const archivedDecisions = sample.decisionArchives.flatMap((item) => item.records || []);
    const validIntegrity = validateArchiveIntegrity(sample.conclusionArchives);
    const tampered = JSON.parse(JSON.stringify(sample.conclusionArchives));
    if (tampered[0]?.records?.[0])
        tampered[0].records[0].summary = "被篡改";
    const tamperedIntegrity = validateArchiveIntegrity(tampered);
    const recalled = buildRelevantArchiveEvidence(sample, "后续结论 0 g0.ts");
    const brief = buildProjectExecutionBrief("self-test", "继续处理 g0.ts 相关问题", { query: "g0.ts", workDir: "", verificationHints: ["npm test"] });
    const skillMemoryProject = `skill-memory-self-test-${process.pid}`;
    let taskHistoryIsIdempotent = false;
    let lowValueHistoryIsNotInjected = false;
    let durableMemoryAdmissionWorks = false;
    let failedReceiptCannotCommitDurableMemory = false;
    let finalAcceptanceControlsCommit = false;
    try {
        updateProjectMemoryFromReceipt({
            project: skillMemoryProject,
            taskId: "task-history-only",
            receipt: {
                status: "done",
                summary: "使用 Skill 生成发布说明",
                invokedSkills: [{ name: "release-notes", contentHash: "abc123" }],
                memoryUsed: ["Skill:release-notes"],
            },
        });
        updateProjectMemoryFromReceipt({
            project: skillMemoryProject,
            taskId: "task-history-only",
            receipt: { status: "done", summary: "使用 Skill 生成发布说明（更新）" },
        });
        const accepted = updateProjectMemoryFromReceipt({
            project: skillMemoryProject,
            taskId: "task-durable",
            accepted: true,
            sourceKind: "accepted_project_delivery",
            receipt: {
                status: "done",
                summary: "完成支付接口改造",
                filesChanged: ["src/payments/api.ts"],
                projectMemory: {
                    constraints: ["支付接口必须保持幂等"],
                    decisions: [{ content: "支付请求使用 idempotency-key 去重", reason: "避免重复扣款" }],
                    facts: ["任务已完成"],
                },
            },
        });
        updateProjectMemoryFromReceipt({
            project: skillMemoryProject,
            taskId: "task-durable-repeat",
            accepted: true,
            sourceKind: "accepted_project_delivery",
            receipt: { status: "done", projectMemory: { constraints: ["支付接口必须保持幂等"] } },
        });
        const beforeFailed = accepted.durableMemories.length;
        const afterFailed = updateProjectMemoryFromReceipt({
            project: skillMemoryProject,
            taskId: "task-failed",
            accepted: true,
            receipt: { status: "failed", projectMemory: { decisions: ["失败任务不应成为正式决策"] } },
        });
        const stored = loadProjectMemory(skillMemoryProject);
        const defaultPacket = buildProjectMemoryPacket(skillMemoryProject, { query: "完全无关查询" });
        const relevantPacket = buildProjectMemoryPacket(skillMemoryProject, { query: "支付 idempotency-key" });
        taskHistoryIsIdempotent = stored.taskHistory.filter((item) => item.taskId === "task-history-only").length === 1;
        lowValueHistoryIsNotInjected = !defaultPacket.includes("使用 Skill 生成发布说明");
        durableMemoryAdmissionWorks = stored.durableMemories.filter((item) => item.content === "支付接口必须保持幂等").length === 1
            && stored.durableMemories.find((item) => item.content === "支付接口必须保持幂等")?.occurrences === 2
            && !stored.durableMemories.some((item) => item.content === "任务已完成")
            && relevantPacket.includes("支付接口必须保持幂等")
            && relevantPacket.includes("idempotency-key");
        failedReceiptCannotCommitDurableMemory = afterFailed.durableMemories.length === beforeFailed + 0
            && !afterFailed.durableMemories.some((item) => item.content.includes("失败任务不应"));
        const rejectedDelivery = recordAcceptedProjectDeliveryMemory({
            task: { id: "task-rejected-delivery", target_project: skillMemoryProject },
            deliverySummary: { acceptance_gate_passed: false, receipts: [{ agent: skillMemoryProject, status: "done", projectMemory: { facts: ["不应提交"] } }] },
        });
        const acceptedDelivery = recordAcceptedProjectDeliveryMemory({
            task: { id: "task-accepted-delivery", target_project: skillMemoryProject },
            deliverySummary: { acceptance_gate_passed: true, receipts: [{ agent: skillMemoryProject, status: "done", projectMemory: { facts: ["正式验收后提交"] } }] },
        });
        const afterDelivery = loadProjectMemory(skillMemoryProject);
        finalAcceptanceControlsCommit = rejectedDelivery.committed === false
            && acceptedDelivery.committed === true
            && afterDelivery.durableMemories.some((item) => item.content === "正式验收后提交")
            && !afterDelivery.durableMemories.some((item) => item.content === "不应提交");
    }
    finally {
        try {
            if (fs.existsSync(memoryFile(skillMemoryProject)))
                fs.unlinkSync(memoryFile(skillMemoryProject));
        }
        catch { }
        try {
            if (fs.existsSync(`${memoryFile(skillMemoryProject)}.bak`))
                fs.unlinkSync(`${memoryFile(skillMemoryProject)}.bak`);
        }
        catch { }
    }
    const recoveryFile = memoryFile(`storage-self-test-${process.pid}`);
    let backupRecoveryWorks = false;
    try {
        writeJsonAtomic(recoveryFile, { version: 2, project: "first-valid-project-memory" });
        writeJsonAtomic(recoveryFile, { version: 2, project: "second-valid-project-memory" });
        fs.writeFileSync(recoveryFile, "{corrupted", "utf-8");
        const recovered = readJson(recoveryFile);
        backupRecoveryWorks = recovered?.project === "first-valid-project-memory" && recovered?.storageRecovery?.recoveredFromBackup === true;
    }
    finally {
        try {
            if (fs.existsSync(recoveryFile))
                fs.unlinkSync(recoveryFile);
        }
        catch { }
        try {
            if (fs.existsSync(`${recoveryFile}.bak`))
                fs.unlinkSync(`${recoveryFile}.bak`);
        }
        catch { }
    }
    const checks = {
        compactsAfterThreshold: sample.conclusions.length === CONCLUSION_RECENT_KEEP,
        retainsOlderDigest: sample.compressedConclusions.includes("结论 0") || archivedConclusions.some((item) => item.summary === "结论 0"),
        retainsNewestConclusion: sample.conclusions.at(-1)?.summary === "后续结论 20",
        archivesAreLosslessAcrossRollovers: archivedConclusions.some((item) => item.summary === "结论 0") && archivedConclusions.some((item) => item.summary === "后续结论 0"),
        archivesHaveIntegrityChecksums: sample.conclusionArchives.every((item) => item.checksum?.length === 64),
        decisionsRollIntoLosslessArchives: sample.decisions.length === DECISION_RECENT_KEEP && archivedDecisions.some((item) => item.decision === "决策 0"),
        integrityValidationDetectsTampering: validIntegrity.pass && !tamperedIntegrity.pass,
        retrievesRelevantArchivedEvidence: recalled.includes("后续结论 0") && recalled.includes("g0.ts"),
        projectBoundaryTracksTokenPressure: !!sample.compactBoundary?.context_budget && Number(sample.compression?.postCompactTokenCount || 0) > 0,
        decisionBoundaryTracksTokenPressure: !!sample.decisionCompactBoundary?.context_budget && Number(sample.decisionCompactBoundary?.postCompactTokenCount || 0) > 0,
        postCompactRestoreAnchorsRecorded: sample.compactBoundary?.post_compact_restore?.archiveIds?.length > 0 && sample.decisionCompactBoundary?.post_compact_restore?.archiveIds?.length > 0,
        taskHistoryUpsertsByTaskInsteadOfAppending: taskHistoryIsIdempotent,
        lowValueTaskHistoryIsNotInjectedByDefault: lowValueHistoryIsNotInjected,
        acceptedDurableMemoryIsDeduplicatedAndInjected: durableMemoryAdmissionWorks,
        failedReceiptCannotCommitDurableMemory,
        finalAcceptanceControlsDurableCommit: finalAcceptanceControlsCommit,
        buildsExecutionBriefWithRecallAndRules: brief.includes("CCM 项目执行前简报") && brief.includes("继续处理 g0.ts") && brief.includes("历史记忆只能辅助判断") && brief.includes("npm test"),
        atomicBackupRecoveryWorks: backupRecoveryWorks,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=memory.js.map