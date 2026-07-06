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
exports.buildProjectMemoryPacket = buildProjectMemoryPacket;
exports.buildProjectExecutionBrief = buildProjectExecutionBrief;
exports.runProjectMemorySelfTest = runProjectMemorySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const context_budget_1 = require("./context-budget");
const utils_1 = require("./utils");
const memory_control_center_1 = require("./modules/memory-control-center");
const PROJECT_MEMORY_DIR = path.join(utils_1.CCM_DIR, "project-memory");
const PROJECT_MEMORY_VERSION = 3;
const CONCLUSION_COMPACT_THRESHOLD = 20;
const CONCLUSION_RECENT_KEEP = 10;
const DECISION_COMPACT_THRESHOLD = 80;
const DECISION_RECENT_KEEP = 40;
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
    for (const archive of [...(memory.conclusionArchives || []), ...(memory.decisionArchives || [])]) {
        for (const record of archive?.records || []) {
            const text = archive.kind === "decisions"
                ? `${record.decision || ""} ${record.reason || ""}`
                : `${record.summary || ""} ${(record.filesModified || []).join(" ")} ${(record.verification || []).join(" ")}`;
            const lower = text.toLowerCase();
            let score = 0;
            for (const token of tokens)
                if (lower.includes(token))
                    score += token.length >= 4 ? 3 : 1;
            if (score)
                candidates.push({ score, time: record.time || "", type: archive.kind, text: compactPreserveEdges(text, 1200), archiveId: archive.id || "" });
        }
    }
    const selected = candidates.sort((a, b) => b.score - a.score || String(b.time).localeCompare(String(a.time))).slice(0, maxRecords);
    if (!selected.length)
        return "";
    return [
        "- 按本次任务自动召回的项目历史原文（优先于滚动摘要）：",
        ...selected.map(item => `  - [${item.type}/${item.archiveId}] ${item.time || ""} ${item.text}`),
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
function normalizeDecision(item, meta) {
    if (typeof item === "string")
        return { time: meta.time, taskId: meta.taskId, groupId: meta.groupId, decision: compact(item, 700), reason: "" };
    return {
        time: meta.time,
        taskId: meta.taskId,
        groupId: meta.groupId,
        decision: compact(item?.decision || item?.title || item?.summary || "", 700),
        reason: compact(item?.reason || "", 500),
    };
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
    const conclusion = {
        time: now,
        taskId: String(input.taskId || ""),
        groupId: String(input.groupId || ""),
        status: String(receipt.status || "partial"),
        summary: compact(receipt.summary || "", 1000),
        filesModified,
        verification: uniqueStrings(receipt.verification || []).slice(0, 20),
        memoryUsed: uniqueStrings(receipt.memoryUsed || receipt.memory_used || []).slice(0, 20),
        memoryIgnored: uniqueStrings(receipt.memoryIgnored || receipt.memory_ignored || []).slice(0, 20),
        invokedSkills: uniqueStrings((receipt.invokedSkills || receipt.invoked_skills || []).map((item) => typeof item === "string" ? item : `Skill:${item.name || ""}${item.contentHash ? `#${item.contentHash}` : ""}`), (receipt.memoryUsed || receipt.memory_used || []).filter((item) => /Skill\s*[:：]/i.test(String(item || "")))).slice(0, 20),
    };
    memory.conclusions = [...(memory.conclusions || []), conclusion];
    const decisions = Array.isArray(receipt.newDecisions || receipt.new_decisions) ? (receipt.newDecisions || receipt.new_decisions) : [];
    memory.decisions = [...(memory.decisions || []), ...decisions.map((item) => normalizeDecision(item, { time: now, taskId: input.taskId || "", groupId: input.groupId || "" })).filter((item) => item.decision)];
    memory.filesModified = uniqueStrings(memory.filesModified || [], filesModified).slice(-240);
    if (receipt.architecture)
        memory.architecture = compact(receipt.architecture, 3000);
    if (Array.isArray(receipt.techStack || receipt.tech_stack))
        memory.techStack = uniqueStrings(memory.techStack || [], receipt.techStack || receipt.tech_stack).slice(0, 40);
    const scannedStructure = scanProjectFileStructure(memory.workDir);
    memory.fileStructure = scannedStructure.startsWith("工作目录不可用") && (receipt.fileStructure || receipt.file_structure)
        ? compact(receipt.fileStructure || receipt.file_structure, 20_000)
        : scannedStructure;
    applyResourceConfig(memory, input.resources);
    compactConclusions(memory);
    compactDecisions(memory);
    memory.integrity = {
        conclusions: validateArchiveIntegrity(memory.conclusionArchives),
        decisions: validateArchiveIntegrity(memory.decisionArchives),
    };
    memory.updatedAt = now;
    writeJsonAtomic(memoryFile(input.project), memory);
    return memory;
}
function buildProjectMemoryPacket(project, options = {}) {
    const memory = (0, memory_control_center_1.applyMemoryControls)("project", project, loadProjectMemory(project, { workDir: options.workDir, resources: options.resources, refreshStructure: false }));
    const lines = [
        "第二层：独立项目记忆（跨群聊、跨临时会话持续保存）：",
        `- 项目：${memory.project}`,
        `- 工作目录：${memory.workDir || "未配置"}`,
        `- 架构描述：${memory.architecture || "尚未记录"}`,
        `- 技术栈：${memory.techStack?.length ? memory.techStack.join("、") : "尚未识别"}`,
    ];
    if (memory.storageRecovery?.recoveredFromBackup)
        lines.push("- 存储恢复：主文件损坏，本次已从最近有效备份恢复。");
    if (memory.integrity?.conclusions?.pass === false || memory.integrity?.decisions?.pass === false) {
        lines.push(`- ⚠ 项目记忆归档校验异常：${[...(memory.integrity?.conclusions?.corrupted || []), ...(memory.integrity?.decisions?.corrupted || [])].join("、")}`);
    }
    const boundary = memory.compactBoundary || memory.decisionCompactBoundary;
    if (boundary) {
        lines.push(`- 项目记忆压缩边界：${boundary.kind || "memory"} archive=${boundary.archiveId || ""}；压缩前 ${boundary.preCompactTokenCount || 0} tokens，压缩后 ${boundary.postCompactTokenCount || 0} tokens，压力 ${boundary.context_budget?.pressure ?? 0}%。`);
    }
    if (memory.filesModified?.length)
        lines.push(`- 压缩后恢复锚点：${memory.filesModified.slice(-12).join("、")}`);
    if (Array.isArray(boundary?.post_compact_restore?.archiveIds) && boundary.post_compact_restore.archiveIds.length) {
        lines.push(`- 压缩后归档回灌：${boundary.post_compact_restore.archiveIds.slice(-5).join("、")}`);
    }
    if (memory.compressedConclusions)
        lines.push(`- 历史结论压缩摘要：\n${compact(memory.compressedConclusions, 3500)}`);
    if (memory.conclusions?.length) {
        lines.push("- 最近 3 条任务结论：");
        for (const item of memory.conclusions.slice(-3))
            lines.push(`  - [${item.status || "unknown"}] ${item.summary || "无摘要"}${item.filesModified?.length ? `；文件：${item.filesModified.slice(0, 8).join("、")}` : ""}${item.invokedSkills?.length ? `；Skill：${item.invokedSkills.slice(0, 6).join("、")}` : ""}`);
    }
    if (memory.decisions?.length) {
        lines.push("- 架构/实现决策：");
        for (const item of memory.decisions.slice(-8))
            lines.push(`  - ${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
    }
    if (memory.decisionArchives?.length) {
        lines.push(`- 历史决策归档：${memory.decisionArchives.reduce((sum, item) => sum + Number(item.count || 0), 0)} 条，${memory.decisionArchives.length} 个带校验归档；需要时可从项目记忆原文回溯。`);
        lines.push(compactPreserveEdges(renderArchiveIndex(memory.decisionArchives, "", 2600), 2600));
    }
    const archiveEvidence = buildRelevantArchiveEvidence(memory, String(options.query || ""));
    if (archiveEvidence)
        lines.push(archiveEvidence);
    lines.push(`- MCP：${memory.resources?.mcp?.join("、") || "无"}`);
    lines.push(`- Skills：${memory.resources?.skill?.join("、") || "无"}`);
    lines.push(`- 共享文档：${memory.resources?.sharedDocuments?.join("、") || "无"}`);
    lines.push("- 当前文件结构：", compact(memory.fileStructure, 6500));
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
    let invokedSkillPreserved = false;
    try {
        const updated = updateProjectMemoryFromReceipt({
            project: skillMemoryProject,
            receipt: {
                status: "done",
                summary: "使用 Skill 生成发布说明",
                invokedSkills: [{ name: "release-notes", contentHash: "abc123" }],
                memoryUsed: ["Skill:release-notes"],
            },
        });
        const packet = buildProjectMemoryPacket(skillMemoryProject);
        invokedSkillPreserved = updated.conclusions.at(-1)?.invokedSkills?.includes("Skill:release-notes#abc123")
            && packet.includes("Skill:release-notes");
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
        invokedSkillPreservedInMemory: invokedSkillPreserved,
        buildsExecutionBriefWithRecallAndRules: brief.includes("CCM 项目执行前简报") && brief.includes("继续处理 g0.ts") && brief.includes("历史记忆只能辅助判断") && brief.includes("npm test"),
        atomicBackupRecoveryWorks: backupRecoveryWorks,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=project-memory.js.map