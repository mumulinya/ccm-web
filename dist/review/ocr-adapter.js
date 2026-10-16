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
exports.redactReviewSource = void 0;
exports.probeOcr = probeOcr;
exports.normalizeOcrResult = normalizeOcrResult;
exports.runOcrReview = runOcrReview;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const git_workspace_runtime_1 = require("../modules/tools/git-workspace-runtime");
const settings_1 = require("./settings");
const process_1 = require("./process");
const snapshot_1 = require("./snapshot");
const findings_1 = require("./findings");
var redaction_1 = require("./redaction");
Object.defineProperty(exports, "redactReviewSource", { enumerable: true, get: function () { return redaction_1.redactReviewSource; } });
const redaction_2 = require("./redaction");
async function probeOcr() {
    try {
        const cli = require.resolve('@alibaba-group/open-code-review/bin/ocr.js');
        const result = await (0, process_1.reviewProcess)(process.execPath, [cli, '--version'], { cwd: path.dirname(cli), timeoutMs: 10000, env: { ...process.env, OCR_NO_UPDATE: '1' } });
        return { available: result.exitCode === 0 && /\bv?1\.12\.13\b/.test(result.stdout + result.stderr), version: '1.12.13' };
    }
    catch {
        return { available: false, version: '1.12.13' };
    }
}
function normalizeOcrResult(raw, job) {
    if (!raw || !Array.isArray(raw.comments) || !raw.manifest?.coverage)
        throw new Error('ocr 缺少有效结果与覆盖清单');
    const paths = job.subject.files.map(f => f.path), coverage = raw.manifest.coverage;
    const getPath = (row) => String(row.path || '').replace(/\\/g, '/');
    const completed = [...new Set([...(coverage.completed || []), ...(coverage.reused || [])].map(getPath))];
    const failed = coverage.failed || [], waived = coverage.waived || [];
    const localOnly = (rel) => job.subject.files.find(f => f.path === rel)?.binary || !job.subject.files.find(f => f.path === rel)?.after || /(?:^|\/)(?:tests?|__tests__|scripts)\/|\.(?:test|spec)\./.test(rel)
        || /(?:^|\/)\.env(?:\.|$)|\.(?:pem|key)$/.test(rel);
    const missing = paths.filter(p => !completed.includes(p) && !localOnly(p));
    const terminal = raw.manifest.terminal_state;
    const status = ['failed', 'partial'].includes(terminal) || failed.length || missing.length ? 'partial' : 'complete';
    return { findings: raw.comments.map((r) => (0, findings_1.finding)(r, 'ocr', (0, snapshot_1.subjectFiles)(job.subject).concat(paths))),
        coverage: { tool: 'ocr', status, selected: paths, completed: completed.filter(p => paths.includes(p)),
            skipped: [...waived.map((r) => ({ path: getPath(r), reason: String(r.reason || r.classification || '工具未审核').slice(0, 300) })), ...missing.map(p => ({ path: p, reason: '必需变更未出现在 ocr 完成清单中' }))],
            ...(status !== 'complete' ? { reason: 'ocr 仅完成部分审核，不能据空意见判断通过' } : {}) } };
}
async function runOcrReview(job, signal) {
    const probe = await probeOcr();
    if (!probe.available)
        throw new Error('ocr 1.12.13 不可用，请检查可选平台包安装');
    const cli = require.resolve('@alibaba-group/open-code-review/bin/ocr.js');
    const view = path.join(path.dirname(job.subject.targetDir), `${job.id}-ocr-view`), home = path.join(path.dirname(job.subject.targetDir), `${job.id}-ocr-home`);
    fs.mkdirSync(view, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(home, '.opencodereview'), { recursive: true, mode: 0o700 });
    const model = (0, settings_1.reviewModelConfig)(job.policy);
    fs.writeFileSync(path.join(home, '.opencodereview', 'config.json'), JSON.stringify({ provider: 'ccm', model: model.model, language: 'zh', telemetry: { enabled: false },
        custom_providers: { ccm: { api_key: model.apiKey, url: model.apiUrl, model: model.model, protocol: model.format === 'anthropic' ? 'anthropic' : 'openai', timeout_sec: 120 } } }), { mode: 0o600 });
    const env = { ...(0, process_1.privateReviewEnv)(home), GIT_AUTHOR_NAME: 'CCM Review', GIT_AUTHOR_EMAIL: 'review@ccm.local', GIT_COMMITTER_NAME: 'CCM Review', GIT_COMMITTER_EMAIL: 'review@ccm.local' };
    const git = (args) => (0, git_workspace_runtime_1.runGitCommand)(view, ['-c', 'core.hooksPath=/dev/null', ...args], { env: env, signal });
    function copy(side) {
        const all = [...new Set([...(0, snapshot_1.subjectFiles)(job.subject), ...job.subject.files.map(f => f.path)])];
        for (const rel of all) {
            // Repository instructions are review data, never ocr configuration.
            if (rel.split('/').includes('.opencodereview') || rel === '.gitignore' || rel === '.ccm-review-manifest.json')
                continue;
            const file = (0, snapshot_1.snapshotPath)(view, rel);
            let text = '';
            try {
                text = (0, redaction_2.redactReviewSource)((0, snapshot_1.readReviewSource)(job.subject, rel, side));
            }
            catch {
                continue;
            }
            const source = (0, snapshot_1.snapshotPath)(side === 'before' ? job.subject.baselineDir : job.subject.targetDir, rel);
            if (!fs.existsSync(source)) {
                if (fs.existsSync(file))
                    fs.unlinkSync(file);
                continue;
            }
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, text, { mode: 0o600 });
        }
    }
    try {
        await git(['init']);
        copy('before');
        await git(['add', '-f', '-A']);
        await git(['commit', '--allow-empty', '-m', 'review baseline']);
        const from = (await git(['rev-parse', 'HEAD'])).stdout.trim();
        copy('after');
        await git(['add', '-f', '-A']);
        await git(['commit', '--allow-empty', '-m', 'review target']);
        const to = (await git(['rev-parse', 'HEAD'])).stdout.trim(), output = path.join(home, 'result.json');
        const result = await (0, process_1.reviewProcess)(process.execPath, [cli, 'review', '--from', from, '--to', to, '--format', 'json', '--output', output,
            '--concurrency', '1', '--max-tokens', '8192', '--max-tokens-budget', String(job.policy.settings.ocrTokenBudget || 64000)], { cwd: view, env, signal, timeoutMs: Math.min(job.policy.settings.ocrTimeoutMs, job.policy.settings.timeoutMs) });
        if (!fs.existsSync(output))
            throw new Error('ocr 未生成审核结果');
        const raw = JSON.parse(fs.readFileSync(output, 'utf8')), parsed = normalizeOcrResult(raw, job);
        if (result.exitCode !== 0)
            parsed.coverage.status = 'failed';
        const summary = raw.summary || {}, reported = ['input_tokens', 'output_tokens', 'total_tokens'].every(k => Number.isFinite(summary[k]) && summary[k] >= 0);
        return { ...parsed, usage: { stage: 'ocr', reported, usage: reported ? { inputTokens: summary.input_tokens, outputTokens: summary.output_tokens, totalTokens: summary.total_tokens, provenance: 'ocr_summary', cost: null } : null } };
    }
    finally {
        const config = path.join(home, '.opencodereview', 'config.json');
        if (fs.existsSync(config))
            fs.unlinkSync(config);
    }
}
//# sourceMappingURL=ocr-adapter.js.map