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
exports.reviewHash = void 0;
exports.loadReviewSettings = loadReviewSettings;
exports.publicReviewSettings = publicReviewSettings;
exports.saveReviewSettings = saveReviewSettings;
exports.freezeReviewPolicy = freezeReviewPolicy;
exports.reviewResourceFingerprints = reviewResourceFingerprints;
exports.validateReviewPolicy = validateReviewPolicy;
exports.reviewModelConfig = reviewModelConfig;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const credential_store_1 = require("../core/credential-store");
const acceptance_contract_1 = require("../agents/acceptance-contract");
const file = () => path.join(process.env.CCM_REVIEW_STORE_DIR || path.join(utils_1.CCM_DIR, 'review'), 'settings.json');
exports.reviewHash = acceptance_contract_1.acceptanceHash;
function loadReviewSettings() {
    const defaults = { version: 1, revision: 0, enabled: false, taskMode: 'auto', commitMode: 'block',
        model: { format: 'openai-compatible', apiUrl: '', model: '', keyRef: '' }, timeoutMs: 300000, ocrTimeoutMs: 180000, ocrTokenBudget: 64000,
        maxCalls: 4, maxReads: 32, semgrep: { enabled: false, executable: '', rules: '' },
        osv: { enabled: false, executable: '', database: '', maxAgeDays: 30 }, rules: [], updatedAt: '' };
    const stored = (0, atomic_json_file_1.readJsonWithBackup)(file(), {});
    return { ...defaults, ...stored, model: { ...defaults.model, ...stored.model }, semgrep: { ...defaults.semgrep, ...stored.semgrep }, osv: { ...defaults.osv, ...stored.osv } };
}
function publicReviewSettings(settings = loadReviewSettings()) {
    const { keyRef, ...model } = settings.model;
    return { ...settings, model: { ...model, hasKey: !!keyRef }, ocrVersion: '1.12.13', secretlintVersion: '10.2.2' };
}
function saveReviewSettings(input) {
    return (0, atomic_json_file_1.withFileLock)(file(), () => {
        const current = loadReviewSettings();
        if (Number(input.revision) !== current.revision)
            throw Object.assign(new Error('审核设置已变化，请刷新'), { status: 409 });
        const next = { ...current, enabled: input.enabled ?? current.enabled,
            taskMode: input.taskMode ?? current.taskMode, commitMode: input.commitMode ?? current.commitMode,
            model: { ...current.model, format: input.model?.format ?? current.model.format,
                apiUrl: String(input.model?.apiUrl ?? current.model.apiUrl).trim(), model: String(input.model?.model ?? current.model.model).trim() },
            semgrep: { ...current.semgrep, ...input.semgrep }, osv: { ...current.osv, ...input.osv }, rules: input.rules ?? current.rules,
            revision: current.revision + 1, updatedAt: new Date().toISOString() };
        for (const [key, min, max] of [['timeoutMs', 10000, 900000], ['ocrTimeoutMs', 10000, 300000], ['ocrTokenBudget', 4096, 200000], ['maxCalls', 2, 8], ['maxReads', 1, 64]]) {
            if (input[key] !== undefined) {
                const n = Number(input[key]);
                if (!Number.isInteger(n) || n < min || n > max)
                    throw new Error(`审核预算 ${key} 无效`);
                next[key] = n;
            }
        }
        if (typeof next.enabled !== 'boolean' || !['auto', 'warn', 'off'].includes(next.taskMode) || !['block', 'warn', 'off'].includes(next.commitMode))
            throw new Error('审核模式无效');
        if (!['openai-compatible', 'anthropic'].includes(next.model.format))
            throw new Error('审核模型协议无效');
        if (next.model.apiUrl) {
            const url = new URL(next.model.apiUrl);
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
                throw new Error('审核接口地址无效');
        }
        if (!Array.isArray(next.rules) || next.rules.length > 50 || next.rules.some(r => typeof r.pattern !== 'string' || !r.pattern || r.pattern.length > 200 || typeof r.instruction !== 'string' || r.instruction.length > 4000 || r.project !== undefined && (typeof r.project !== 'string' || r.project.length > 200)))
            throw new Error('审核规则无效');
        if (input.model?.apiKey)
            next.model.keyRef = (0, credential_store_1.protectCredential)(`code-review:${crypto.randomUUID()}`, 'apiKey', String(input.model.apiKey));
        if (input.model?.clearKey === true)
            next.model.keyRef = '';
        if (next.enabled && (!next.model.keyRef || !next.model.apiUrl || !next.model.model))
            throw new Error('请先配置独立审核模型、接口和 Key');
        if (next.semgrep.enabled && (!path.isAbsolute(next.semgrep.executable) || !path.isAbsolute(next.semgrep.rules)))
            throw new Error('Semgrep 程序和可信本地规则须使用绝对路径');
        if (next.osv.enabled && (!path.isAbsolute(next.osv.executable) || !path.isAbsolute(next.osv.database)))
            throw new Error('OSV 程序和离线数据库须使用绝对路径');
        if (!Number.isFinite(next.osv.maxAgeDays) || next.osv.maxAgeDays < 1 || next.osv.maxAgeDays > 365)
            throw new Error('数据库有效天数无效');
        (0, atomic_json_file_1.writeJsonAtomic)(file(), next);
        return next;
    });
}
function freezeReviewPolicy(level, settings = loadReviewSettings()) {
    const core = { schema: 'ccm-code-review-policy-v1', settings, level,
        resources: reviewResourceFingerprints(settings),
        required: settings.enabled && (level === 'commit' ? settings.commitMode !== 'off' : level !== 'light' && settings.taskMode !== 'off') };
    return { ...core, checksum: (0, exports.reviewHash)(core) };
}
function reviewResourceFingerprints(settings) {
    const resources = {};
    const fingerprint = (file, content) => {
        let count = 0;
        const visit = (value) => {
            if (++count > 20000)
                throw new Error('扫描器资源超出预算');
            const stat = fs.lstatSync(value);
            if (stat.isSymbolicLink())
                throw new Error('扫描器资源不能使用符号链接');
            if (stat.isDirectory())
                return fs.readdirSync(value).sort().map(name => [name, visit(path.join(value, name))]);
            if (!stat.isFile())
                throw new Error('扫描器资源类型无效');
            return content ? crypto.createHash('sha256').update(fs.readFileSync(value)).digest('hex') : [stat.size, stat.mtimeMs];
        };
        try {
            return (0, exports.reviewHash)(visit(file));
        }
        catch {
            return 'unavailable';
        }
    };
    if (settings.semgrep.enabled) {
        resources.semgrep = fingerprint(settings.semgrep.executable, true);
        resources.rules = fingerprint(settings.semgrep.rules, true);
    }
    if (settings.osv.enabled) {
        resources.osv = fingerprint(settings.osv.executable, true);
        resources.database = fingerprint(settings.osv.database, false);
    }
    return resources;
}
function validateReviewPolicy(value) {
    if (!value || value.schema !== 'ccm-code-review-policy-v1')
        return false;
    const { checksum, ...core } = value;
    return !!checksum && (0, exports.reviewHash)(core) === checksum;
}
function reviewModelConfig(policy) {
    const model = policy.settings.model;
    return { format: model.format, apiUrl: model.apiUrl, apiKey: (0, credential_store_1.resolveCredential)(model.keyRef), model: model.model };
}
//# sourceMappingURL=settings.js.map