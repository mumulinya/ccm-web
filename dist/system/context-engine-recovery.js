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
exports.createContextEngineRecoveryPoint = createContextEngineRecoveryPoint;
exports.listContextEngineRecoveryPoints = listContextEngineRecoveryPoints;
exports.drillContextEngineRecoveryPoint = drillContextEngineRecoveryPoint;
exports.restoreContextEngineRecoveryPoint = restoreContextEngineRecoveryPoint;
exports.registerContextEngineRecoveryHook = registerContextEngineRecoveryHook;
exports.runContextEngineRecoverySelfTest = runContextEngineRecoverySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const memory_1 = require("../agents/global/memory");
const sessions_1 = require("../modules/projects/sessions");
const storage_1 = require("../modules/collaboration/storage");
const memory_2 = require("../modules/music/memory");
const session_compaction_core_1 = require("./session-compaction-core");
const ROOT = path.join(utils_1.CCM_DIR, "context-engine-recovery");
let hookRegistered = false;
function checksumFile(file) {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function clean(value, max = 160) {
    return String(value || "").replace(/[^a-zA-Z0-9_.:@-]+/g, "_").slice(0, max);
}
function insideCcm(file) {
    const relative = path.relative(path.resolve(utils_1.CCM_DIR), path.resolve(file));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function binding(input) {
    const scope = String(input?.scope || "").toLowerCase();
    const sessionId = String(input?.sessionId || "");
    const scopeId = String(input?.scopeId || input?.project || input?.groupId || (scope === "music" ? memory_2.MUSIC_AGENT_SINGLETON_ID : sessionId));
    if (!scope || !sessionId)
        throw new Error("恢复点必须绑定精确 scope 和 sessionId");
    return { scope, scopeId, sessionId };
}
function canonicalFile(input) {
    const exact = binding(input);
    let file = "";
    if (exact.scope === "global")
        file = (0, memory_1.getGlobalAgentTranscriptFile)(exact.sessionId);
    else if (exact.scope === "project")
        file = (0, sessions_1.getSessionFilePath)(exact.scopeId, exact.sessionId);
    else if (exact.scope === "group")
        file = (0, storage_1.getGroupChatSessionMessagesFile)(exact.scopeId, exact.sessionId);
    else if (exact.scope === "music")
        file = memory_2.MUSIC_AGENT_MEMORY_FILE;
    else
        throw new Error(`不支持的恢复作用域：${exact.scope}`);
    if (!insideCcm(file))
        throw new Error("恢复目标越过 CCM 数据目录");
    return { ...exact, file };
}
function manifestFile(recoveryId) {
    return path.join(ROOT, clean(recoveryId), "manifest.json");
}
function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
}
function createContextEngineRecoveryPoint(input) {
    const target = canonicalFile(input);
    if (!fs.existsSync(target.file))
        return { schema: "ccm-context-engine-recovery-point-v1", created: false, reason: "canonical_file_missing", ...binding(input) };
    const recoveryId = `cer_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
    const dir = path.join(ROOT, recoveryId);
    fs.mkdirSync(dir, { recursive: true });
    const copy = path.join(dir, "canonical.snapshot");
    fs.copyFileSync(target.file, copy);
    const backupSource = `${target.file}.bak`;
    const backupCopy = fs.existsSync(backupSource) ? path.join(dir, "canonical.bak.snapshot") : "";
    if (backupCopy)
        fs.copyFileSync(backupSource, backupCopy);
    const manifest = {
        schema: "ccm-context-engine-recovery-point-v1",
        version: 1,
        recoveryId,
        scope: target.scope,
        scopeId: target.scopeId,
        sessionId: target.sessionId,
        reason: String(input?.reason || input?.trigger || "pre_compact").slice(0, 160),
        sourceSize: fs.statSync(target.file).size,
        sourceChecksum: checksumFile(target.file),
        backupChecksum: backupCopy ? checksumFile(backupSource) : "",
        createdAt: new Date().toISOString(),
        contentStoredInManifest: false,
        checksum: "",
    };
    manifest.checksum = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    writeJson(path.join(dir, "manifest.json"), manifest);
    pruneRecoveryPoints(target);
    return { ...manifest, sourceChecksum: manifest.sourceChecksum, backupChecksum: manifest.backupChecksum };
}
function allManifests() {
    try {
        return fs.readdirSync(ROOT, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => {
            try {
                return JSON.parse(fs.readFileSync(path.join(ROOT, item.name, "manifest.json"), "utf8"));
            }
            catch {
                return null;
            }
        }).filter(Boolean);
    }
    catch {
        return [];
    }
}
function pruneRecoveryPoints(target) {
    const matching = allManifests().filter(item => item.scope === target.scope && item.scopeId === target.scopeId && item.sessionId === target.sessionId)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const item of matching) {
        const expired = Date.parse(item.createdAt || "") < cutoff;
        const overflow = matching.indexOf(item) >= 10;
        if (expired || overflow)
            fs.rmSync(path.dirname(manifestFile(item.recoveryId)), { recursive: true, force: true });
    }
}
function listContextEngineRecoveryPoints(input) {
    const exact = binding(input);
    return allManifests().filter(item => item.scope === exact.scope && item.scopeId === exact.scopeId && item.sessionId === exact.sessionId)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(item => ({ ...item, contentStoredInManifest: false }));
}
function drillContextEngineRecoveryPoint(input) {
    const exact = binding(input);
    const recoveryId = clean(input?.recoveryId);
    const manifest = JSON.parse(fs.readFileSync(manifestFile(recoveryId), "utf8"));
    if (manifest.scope !== exact.scope || manifest.scopeId !== exact.scopeId || manifest.sessionId !== exact.sessionId)
        throw new Error("恢复点与精确会话不匹配");
    const snapshot = path.join(path.dirname(manifestFile(recoveryId)), "canonical.snapshot");
    const actualChecksum = fs.existsSync(snapshot) ? checksumFile(snapshot) : "";
    return {
        schema: "ccm-context-engine-recovery-drill-v1",
        version: 1,
        recoveryId,
        ...exact,
        passed: actualChecksum === manifest.sourceChecksum && fs.statSync(snapshot).size === Number(manifest.sourceSize || 0),
        checksumMatched: actualChecksum === manifest.sourceChecksum,
        sizeMatched: fs.existsSync(snapshot) && fs.statSync(snapshot).size === Number(manifest.sourceSize || 0),
        canonicalUntouched: true,
        drilledAt: new Date().toISOString(),
        contentStored: false,
    };
}
function restoreContextEngineRecoveryPoint(input) {
    if (input?.confirm !== true)
        throw new Error("恢复操作必须显式 confirm=true");
    const target = canonicalFile(input);
    const recoveryId = clean(input?.recoveryId);
    const drill = drillContextEngineRecoveryPoint({ ...target, recoveryId });
    if (!drill.passed)
        throw new Error("恢复演练未通过，拒绝覆盖 canonical 会话");
    const beforeRestore = fs.existsSync(target.file) ? createContextEngineRecoveryPoint({ ...target, reason: `before_restore_${recoveryId}` }) : null;
    const snapshot = path.join(path.dirname(manifestFile(recoveryId)), "canonical.snapshot");
    fs.mkdirSync(path.dirname(target.file), { recursive: true });
    const temp = `${target.file}.${process.pid}.${Date.now()}.restore.tmp`;
    fs.copyFileSync(snapshot, temp);
    fs.renameSync(temp, target.file);
    return {
        schema: "ccm-context-engine-recovery-restore-v1",
        restored: true,
        recoveryId,
        ...binding(input),
        restoredChecksum: checksumFile(target.file),
        beforeRestoreRecoveryId: beforeRestore?.recoveryId || "",
        restoredAt: new Date().toISOString(),
        contentStored: false,
    };
}
function registerContextEngineRecoveryHook() {
    if (hookRegistered)
        return;
    hookRegistered = true;
    (0, session_compaction_core_1.registerSessionCompactionHook)("pre_compact", input => {
        if (!["global", "group", "project", "music"].includes(String(input?.scope || ""))) {
            return { schema: "ccm-context-engine-recovery-point-v1", created: false, reason: "scope_not_applicable", contentStored: false };
        }
        return createContextEngineRecoveryPoint(input);
    });
}
function runContextEngineRecoverySelfTest() {
    return { pass: insideCcm(path.join(utils_1.CCM_DIR, "test.json")) && !insideCcm(path.resolve(utils_1.CCM_DIR, "..", "escape.json")), checks: { pathContainment: true, contentStored: false } };
}
//# sourceMappingURL=context-engine-recovery.js.map