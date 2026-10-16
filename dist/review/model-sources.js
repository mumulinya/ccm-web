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
exports.prepareModelSources = prepareModelSources;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const snapshot_1 = require("./snapshot");
const process_1 = require("./process");
/** Scan both old and new context before any model sees source. Ranges retain
 * newlines so review line references continue to address the original files. */
async function prepareModelSources(job, signal, reviewInput = {}) {
    const root = path.join(path.dirname(job.subject.targetDir), `${job.id}-model-sources`);
    const input = path.join(root, 'input');
    fs.mkdirSync(input, { recursive: true, mode: 0o700 });
    const records = [];
    const paths = [...new Set([...(0, snapshot_1.subjectFiles)(job.subject), ...job.subject.files.map(f => f.path)])];
    for (const side of ['before', 'after'])
        for (const rel of paths) {
            if (signal.aborted)
                throw new Error('审核已取消');
            if (!fs.existsSync((0, snapshot_1.snapshotPath)(side === 'before' ? job.subject.baselineDir : job.subject.targetDir, rel)))
                continue;
            let text;
            try {
                text = (0, snapshot_1.readReviewSource)(job.subject, rel, side);
            }
            catch {
                continue;
            }
            const name = `${records.length}${path.extname(rel) || '.txt'}`;
            records.push({ name, rel, side, text });
            fs.writeFileSync(path.join(input, name), text, { mode: 0o600 });
        }
    // Plans can embed source evidence and pasted credentials too. They cross
    // the same local masking boundary, without becoming fake repository files.
    const planText = JSON.stringify(reviewInput);
    if (Buffer.byteLength(planText) > 2 * 1024 * 1024)
        throw new Error('审核计划上下文超出预算');
    const planRecord = { name: `${records.length}.json`, rel: '', side: 'plan', text: planText };
    records.push(planRecord);
    fs.writeFileSync(path.join(input, planRecord.name), planRecord.text, { mode: 0o600 });
    const config = path.join(root, 'secretlintrc.json');
    fs.writeFileSync(config, JSON.stringify({ rules: [{ id: require.resolve('@secretlint/secretlint-rule-preset-recommend'), rules: [{ id: '@secretlint/secretlint-rule-filter-comments', disabled: true }] }] }), { mode: 0o600 });
    fs.writeFileSync(config + '.empty', '', { mode: 0o600 });
    try {
        if (records.length) {
            const cli = path.join(path.dirname(require.resolve('secretlint/package.json')), 'bin', 'secretlint.js');
            const result = await (0, process_1.reviewProcess)(process.execPath, [cli, '--format', 'json', '--secretlintrc', config, '--secretlintignore', config + '.empty', '*'], { cwd: input, signal, timeoutMs: 60000 });
            const rows = JSON.parse(result.stdout);
            if (result.exitCode > 1 || !Array.isArray(rows) || rows.length !== records.length)
                throw new Error('关联源码密钥脱敏未完整执行');
            for (const row of rows) {
                const record = records.find(r => r.name === path.basename(row.filePath));
                if (!record)
                    throw new Error('关联源码扫描路径不匹配');
                const ranges = (row.messages || []).map((m) => m.range).sort((a, b) => b[0] - a[0]);
                for (const range of ranges) {
                    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 0 || range[1] > record.text.length)
                        throw new Error('密钥扫描缺少可靠位置，禁止发送源码');
                    record.text = record.text.slice(0, range[0]) + record.text.slice(range[0], range[1]).replace(/[^\r\n]/g, '*') + record.text.slice(range[1]);
                }
            }
        }
        for (const side of ['before', 'after'])
            fs.mkdirSync(path.join(root, side), { recursive: true, mode: 0o700 });
        for (const record of records.filter(r => r.side !== 'plan')) {
            const file = (0, snapshot_1.snapshotPath)(path.join(root, record.side), record.rel);
            fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
            fs.writeFileSync(file, record.text, { mode: 0o600 });
        }
        return { ...job.subject, baselineDir: path.join(root, 'before'), targetDir: path.join(root, 'after'), reviewInput: JSON.parse(planRecord.text) };
    }
    finally {
        fs.rmSync(input, { recursive: true, force: true });
        fs.rmSync(config, { force: true });
        fs.rmSync(config + '.empty', { force: true });
    }
}
//# sourceMappingURL=model-sources.js.map