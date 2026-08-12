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
exports.buildTestAgentReadonlyCapabilityManifest = buildTestAgentReadonlyCapabilityManifest;
exports.verifyTestAgentReadonlyCapabilityManifest = verifyTestAgentReadonlyCapabilityManifest;
exports.runTestAgentReadonlyCapabilitySelfTest = runTestAgentReadonlyCapabilitySelfTest;
/**
 * Read-only Skill/MCP capability manifest for the native TestAgent.
 *
 * The returned `manifest` is safe to persist: it contains names, descriptions,
 * hashes, scopes and signatures only.  `prompt` is an ephemeral projection
 * for the current planner/Loop and is intentionally kept outside the
 * manifest so callers cannot accidentally persist Skill正文.
 */
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const role_skills_1 = require("../skills/role-skills");
const workspace_readonly_tools_1 = require("../tools/workspace-readonly-tools");
const SECRET_FILE = path.join(os.homedir(), ".cc-connect", "private", "test-agent-readonly-capability-secret");
const DEFAULT_SKILL_SUMMARY_CHARS = 2_000;
const DEFAULT_SKILL_CATALOG_CHARS = 8_000;
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => {
        if (value[key] !== undefined)
            out[key] = canonical(value[key]);
        return out;
    }, {});
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value ?? null))).digest("hex");
}
function ensureSecret() {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    if (!fs.existsSync(SECRET_FILE))
        fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString("base64url"), { mode: 0o600 });
    const value = fs.readFileSync(SECRET_FILE, "utf8").trim();
    if (value.length < 32)
        throw new Error("TestAgent只读能力签名密钥无效");
    return value;
}
function sign(value) {
    return crypto.createHmac("sha256", ensureSecret()).update(JSON.stringify(canonical(value))).digest("base64url");
}
function isoAfter(ms) { return new Date(Date.now() + Math.max(60_000, ms)).toISOString(); }
function safeText(value, limit) {
    return String(value || "").replace(/^\uFEFF/, "").trim().slice(0, Math.max(0, limit));
}
function readSkillBody(row, limit) {
    const candidates = [row?.skillFile, row?.skillPath, row?.packagePath ? path.join(row.packagePath, "SKILL.md") : ""]
        .map(value => String(value || "").trim()).filter(Boolean);
    for (const candidate of candidates) {
        try {
            if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile())
                continue;
            const body = fs.readFileSync(candidate, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
            return { body: safeText(body, limit), contentHash: checksum(body), truncated: body.length > limit };
        }
        catch { /* continue with description */ }
    }
    const description = safeText(row?.description, limit);
    return { body: description, contentHash: String(row?.contentHash || checksum(description)), truncated: false };
}
function registrySkills() {
    if (!fs.existsSync(db_1.SKILLS_DIR))
        return [];
    const rows = [];
    for (const file of fs.readdirSync(db_1.SKILLS_DIR).filter(name => name.toLowerCase().endsWith(".json")).sort()) {
        try {
            const row = JSON.parse(fs.readFileSync(path.join(db_1.SKILLS_DIR, file), "utf8"));
            if (!row || !row.name)
                continue;
            // External Skills must explicitly opt into verification/read-only use.
            const readOnly = row.readOnly === true || row.read_only === true || row.verificationOnly === true || row.verification_only === true || row.verification?.readOnly === true;
            if (readOnly)
                rows.push(row);
        }
        catch { /* malformed registry rows are ignored and reported by caller */ }
    }
    return rows;
}
function selectedInternalSkills(options) {
    const names = (options.selectedSkillNames || []).map(String).filter(Boolean);
    const selected = (0, role_skills_1.selectRoleSkills)("test-agent", options.taskText || "verification", {
        forceWork: true,
        phase: "verification",
        selectedSkillNames: names,
    });
    return selected;
}
function buildMcpCapability(definition, options) {
    const readOnlyHint = definition?.annotations?.readOnlyHint === true || definition?.readOnly === true || definition?.mutability === "read_only" || definition?.mutability === "readonly";
    const destructiveHint = definition?.annotations?.destructiveHint === true || definition?.destructive === true || definition?.mutability === "write" || definition?.mutability === "destructive";
    if (!readOnlyHint || destructiveHint)
        return null;
    const server = String(definition.server || definition.serverName || definition.source || "").trim() || "unknown";
    const allowedServers = (options.allowedMcpServers || []).map(String).filter(Boolean);
    if (allowedServers.length && !allowedServers.includes(server))
        return null;
    const body = {
        name: String(definition.name || "").trim(),
        canonicalName: String(definition.canonicalName || definition.name || "").trim(),
        server,
        description: safeText(definition.description || definition.name, 500),
        inputSchema: definition.inputSchema || definition.input_schema || {},
        scope: "test-agent",
        mutability: "read_only",
        readOnly: true,
    };
    if (!body.name || !body.canonicalName)
        return null;
    const schemaChecksum = checksum(body.inputSchema);
    return { ...body, schemaChecksum, signature: sign({ ...body, schemaChecksum, targetName: options.targetName || "", generation: Number(options.generation || 0) }) };
}
function buildSkillCapability(row, source, options) {
    const name = String(row?.name || "").trim();
    if (!name)
        return null;
    const maxChars = Math.max(128, Math.min(8_000, Number(options.skillSummaryMaxChars || DEFAULT_SKILL_SUMMARY_CHARS)));
    const loaded = readSkillBody(row, maxChars);
    const description = safeText(row?.description || name, 500);
    const body = {
        name,
        description,
        scope: "test-agent",
        readOnly: true,
        source,
        contentHash: loaded.contentHash,
        summaryChecksum: checksum(loaded.body),
        truncated: loaded.truncated,
    };
    return { capability: { ...body, signature: sign({ ...body, targetName: options.targetName || "", generation: Number(options.generation || 0) }) }, body: loaded.body };
}
function buildTestAgentReadonlyCapabilityManifest(options = {}) {
    const targetName = String(options.targetName || "test-agent").trim();
    const workDir = String(options.workDir || "").trim();
    const selected = selectedInternalSkills(options);
    const rejectedSkills = [];
    const skills = [];
    const ephemeralBodies = [];
    const seenSkills = new Set();
    for (const row of selected) {
        const result = buildSkillCapability({ ...row, readOnly: true, verificationOnly: true }, "builtin", options);
        if (!result)
            continue;
        seenSkills.add(result.capability.name);
        skills.push(result.capability);
        ephemeralBodies.push({ name: result.capability.name, description: result.capability.description, body: result.body, truncated: result.capability.truncated });
    }
    for (const row of registrySkills()) {
        const name = String(row?.name || "").trim();
        if (seenSkills.has(name))
            continue;
        const result = buildSkillCapability(row, "registry", options);
        if (!result) {
            if (name)
                rejectedSkills.push({ name, reason: "Skill注册信息不完整或无法读取。" });
            continue;
        }
        seenSkills.add(name);
        skills.push(result.capability);
        // Registry Skills are only included in the ephemeral prompt when they
        // were explicitly selected by the work order.
        if ((options.selectedSkillNames || []).map(String).includes(name))
            ephemeralBodies.push({ name, description: result.capability.description, body: result.body, truncated: result.capability.truncated });
    }
    const mcp = [];
    const rejectedMcp = [];
    const seenMcp = new Set();
    const definitions = [...workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3, ...(Array.isArray(options.mcpTools) ? options.mcpTools : [])];
    for (const definition of definitions) {
        const name = String(definition?.canonicalName || definition?.name || "").trim();
        if (!name || seenMcp.has(name))
            continue;
        const capability = buildMcpCapability(definition, options);
        if (!capability) {
            rejectedMcp.push({ name, reason: "MCP未声明只读能力、含写入提示或不在授权服务器范围。" });
            continue;
        }
        seenMcp.add(name);
        mcp.push(capability);
    }
    const issuedAt = new Date().toISOString();
    const expiresAt = isoAfter(options.ttlMs || 30 * 60_000);
    const unsigned = {
        schema: "ccm-test-agent-readonly-capability-manifest-v1",
        targetName,
        workDir,
        issuedAt,
        expiresAt,
        mcp,
        skills,
        mcpCount: mcp.length,
        skillCount: skills.length,
        contentStored: false,
    };
    const manifest = {
        ...unsigned,
        checksum: checksum(unsigned),
        signature: sign({ ...unsigned, checksum: checksum(unsigned) }),
    };
    const budget = Math.max(512, Math.min(DEFAULT_SKILL_CATALOG_CHARS * 4, Number(options.skillCatalogBudgetChars || DEFAULT_SKILL_CATALOG_CHARS)));
    const skillPrompt = ephemeralBodies.map(item => `## Skill:${item.name}\n简介：${item.description}\n只读验证摘要：\n${item.body}${item.truncated ? "\n[摘要已截断；完整正文不进入持久化回执]" : ""}`).join("\n\n");
    const mcpPrompt = mcp.map(tool => `- ${tool.canonicalName}: ${tool.description}; 参数 Schema=${JSON.stringify(tool.inputSchema)}`).join("\n");
    const prompt = [
        "[TestAgent 只读能力清单]",
        "以下 Skill/MCP 仅用于验证和读取；不得编辑源码、调用部署/写入工具或扩大作用域。",
        skillPrompt ? `[只读 Skill 摘要]\n${skillPrompt}` : "",
        mcpPrompt ? `[只读 MCP 工具与参数 Schema]\n${mcpPrompt}` : "",
        `能力清单 checksum：${manifest.checksum}`,
    ].filter(Boolean).join("\n\n").slice(0, budget);
    return { manifest, prompt, selectedSkills: selected, rejectedSkills, rejectedMcp };
}
function verifyTestAgentReadonlyCapabilityManifest(manifest) {
    if (!manifest || manifest.schema !== "ccm-test-agent-readonly-capability-manifest-v1")
        return { valid: false, reason: "能力清单 schema 无效。" };
    if (manifest.contentStored !== false)
        return { valid: false, reason: "能力清单不允许保存正文。" };
    if (!Array.isArray(manifest.mcp) || !Array.isArray(manifest.skills))
        return { valid: false, reason: "能力清单缺少 MCP/Skill 数组。" };
    if (manifest.mcp.some((tool) => tool.readOnly !== true || tool.mutability !== "read_only" || tool.annotations?.destructiveHint === true))
        return { valid: false, reason: "MCP能力清单含非只读工具。" };
    if (manifest.skills.some((skill) => skill.readOnly !== true || !skill.contentHash || !skill.signature))
        return { valid: false, reason: "Skill能力清单缺少只读标记或校验值。" };
    const { checksum: suppliedChecksum, signature: suppliedSignature, ...unsigned } = manifest;
    const expectedChecksum = checksum(unsigned);
    if (suppliedChecksum !== expectedChecksum)
        return { valid: false, reason: "能力清单 checksum 不匹配。" };
    const expectedSignature = sign({ ...unsigned, checksum: expectedChecksum });
    if (suppliedSignature !== expectedSignature)
        return { valid: false, reason: "能力清单签名无效。" };
    return { valid: true, checksum: expectedChecksum, expiresAt: manifest.expiresAt, mcpCount: manifest.mcp.length, skillCount: manifest.skills.length };
}
function runTestAgentReadonlyCapabilitySelfTest() {
    const built = buildTestAgentReadonlyCapabilityManifest({
        targetName: "test-agent-selftest",
        workDir: process.cwd(),
        taskText: "只读验收",
        ttlMs: 60_000,
    });
    const validation = verifyTestAgentReadonlyCapabilityManifest(built.manifest);
    const serialized = JSON.stringify(built.manifest);
    return {
        pass: validation.valid
            && built.manifest.contentStored === false
            && built.manifest.mcp.every(item => item.readOnly && item.mutability === "read_only")
            && !serialized.includes("只读验证摘要"),
        validation,
        manifestChecksum: built.manifest.checksum,
    };
}
//# sourceMappingURL=readonly-capabilities.js.map