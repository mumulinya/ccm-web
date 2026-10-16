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
exports.reviewRoot = void 0;
exports.registeredReviewWorkspace = registeredReviewWorkspace;
exports.reviewPlanFingerprint = reviewPlanFingerprint;
exports.snapshotPath = snapshotPath;
exports.captureReviewBaseline = captureReviewBaseline;
exports.taskReviewSubject = taskReviewSubject;
exports.gitReviewSubject = gitReviewSubject;
exports.readReviewSource = readReviewSource;
exports.subjectFiles = subjectFiles;
exports.reviewSubjectIsCurrent = reviewSubjectIsCurrent;
exports.taskReviewSubjectIsCurrent = taskReviewSubjectIsCurrent;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../core/utils");
const git_workspace_runtime_1 = require("../modules/tools/git-workspace-runtime");
const atomic_json_file_1 = require("../core/atomic-json-file");
const settings_1 = require("./settings");
const db_1 = require("../core/db");
function registeredReviewWorkspace(project, configs = (0, db_1.getConfigs)()) {
    for (const config of configs) {
        const info = (0, db_1.getConfigInfo)(config.path);
        const entry = info.find(row => row.name === project) || (config.name === project && info.length === 1 ? info[0] : null);
        if (entry?.workDir)
            return entry.workDir;
    }
    throw new Error(`审核项目配置缺失：${project}`);
}
function reviewPlanFingerprint(task) {
    const plan = task.plan_dispatch_contract || task.workflow_meta?.plan_dispatch_contract || task.implementation_plan
        || (task.work_items || []).map((w) => ({ id: w.id || w.workItemId, project: w.project || w.projectId, objective: w.objective,
            editablePaths: w.editablePaths || w.files, readOnlyPaths: w.readOnlyPaths, forbiddenPaths: w.forbiddenPaths, acceptance: w.acceptanceCriteria }));
    return (0, settings_1.reviewHash)({ plan, goal: task.business_goal || task.description || task.title || '', checksum: task.plan_checksum || '' });
}
const reviewRoot = () => path.resolve(process.env.CCM_REVIEW_STORE_DIR || path.join(utils_1.CCM_DIR, 'review'));
exports.reviewRoot = reviewRoot;
const excluded = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.cache', '.next', '.nuxt', 'target', 'ccm-package', 'scratch', 'release-artifacts', '.venv', 'venv', '__pycache__', '.ccm', '.cc-connect']);
const sensitivePath = /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.netrc|credentials(?:\..*)?)$|\.(?:pem|p12|pfx|keystore|key)$/i;
const snapshotByteBudget = 256 * 1024 * 1024;
function safePath(rel) { if (!rel || path.isAbsolute(rel) || rel.includes('\\') || rel.includes(':') || rel.split('/').some(x => !x || x === '..' || x === '.'))
    throw new Error('审核路径无效'); return rel; }
function snapshotPath(dir, rel) { return path.join(dir, safePath(rel)); }
function privateDir(dir) { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); return dir; }
function writeContent(dir, rel, bytes) { const file = snapshotPath(dir, rel); privateDir(path.dirname(file)); fs.writeFileSync(file, bytes, { mode: 0o600 }); }
function digest(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function isBinary(bytes) { return bytes.includes(0) || bytes.length > 512 * 1024; }
function workingManifest(root, dir, storeContents = true) {
    root = fs.realpathSync.native(root);
    if (storeContents)
        privateDir(dir);
    const files = {};
    let total = 0;
    const walk = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (excluded.has(entry.name))
                continue;
            const absolute = path.join(current, entry.name), rel = path.relative(root, absolute).replace(/\\/g, '/');
            if (entry.isSymbolicLink())
                throw new Error('审核不读取符号链接或 Junction，请先处理');
            // Embedded repositories belong to their own registered project/lane.
            if (entry.isDirectory() && fs.existsSync(path.join(absolute, '.git')))
                continue;
            (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(root, rel);
            if (entry.isDirectory())
                walk(absolute);
            else if (entry.isFile()) {
                if (Object.keys(files).length >= 10000 || (total += fs.statSync(absolute).size) > snapshotByteBudget)
                    throw new Error('审核快照超出预算');
                const bytes = fs.readFileSync(absolute);
                files[rel] = { hash: digest(bytes), binary: isBinary(bytes) };
                if (storeContents)
                    writeContent(dir, rel, bytes);
            }
        }
    };
    walk(root);
    let head = '';
    try {
        head = (0, child_process_1.execFileSync)('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }).trim();
    }
    catch { }
    const manifest = { root, dir, head, files };
    if (storeContents)
        (0, atomic_json_file_1.writeJsonAtomic)(path.join(dir, '.ccm-review-manifest.json'), manifest);
    return manifest;
}
const baselineDir = (task, project) => path.join((0, exports.reviewRoot)(), 'baselines', (0, settings_1.reviewHash)([task.id, task.generation || 1, task.attempt_id || task.attemptId || task.execution_attempt || 1, project]));
function captureReviewBaseline(task, project, root) {
    const dir = baselineDir(task, project), file = path.join(dir, '.ccm-review-manifest.json');
    const existing = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
    if (existing)
        return existing;
    return workingManifest(root, dir);
}
function changedFiles(before, after, selected) {
    const names = selected || [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])];
    return names.filter(rel => before.files[rel]?.hash !== after.files[rel]?.hash).map(rel => ({ path: rel,
        before: before.files[rel] ? 'present' : null, after: after.files[rel] ? 'present' : null,
        beforeHash: before.files[rel]?.hash || '', afterHash: after.files[rel]?.hash || '', binary: before.files[rel]?.binary || after.files[rel]?.binary }));
}
function sealSubject(input) {
    // Directory names are artifacts, not evidence identity; paths alone are never sufficient.
    const { baselineDir: _base, targetDir: _target, ...identity } = input;
    return { ...input, checksum: (0, settings_1.reviewHash)(identity) };
}
async function taskReviewSubject(task, project, root, workItemId = '') {
    const baseline = (0, atomic_json_file_1.readJsonWithBackup)(path.join(baselineDir(task, project), '.ccm-review-manifest.json'), null);
    if (!baseline)
        throw new Error('开发前审核基线缺失，不能使用当前 HEAD 伪造基线');
    const target = await workingManifest(root, path.join((0, exports.reviewRoot)(), 'snapshots', crypto.randomUUID()));
    const files = changedFiles(baseline, target);
    return sealSubject({ kind: 'task', project, root: target.root, taskId: task.id, workItemId, traceId: task.trace_id,
        attemptId: String(task.attempt_id || task.attemptId || task.execution_attempt || 1), generation: Number(task.generation || 1),
        exactSessionId: task.project_session_id || task.group_session_id || '', planChecksum: reviewPlanFingerprint(task),
        goal: String(task.business_goal || task.description || task.title || ''), plan: task.plan_dispatch_contract || task.workflow_meta?.plan_dispatch_contract || task.implementation_plan || task.work_items || {},
        head: target.head, workspaceChecksum: (0, settings_1.reviewHash)(target.files), contextFingerprint: (0, settings_1.reviewHash)(target.files), files,
        dispatchScope: require('../agents/dispatch-profile').resolveDispatchScope(task), baselineDir: baseline.dir, targetDir: target.dir });
}
async function gitReviewSubject(project, root, requested, expected) {
    const snapshot = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(root, project);
    if (!expected || expected !== snapshot.checksum)
        throw Object.assign(new Error('工作区已变化，请刷新提交预览'), { status: 409 });
    const requestedFiles = [...new Set(requested.map(safePath))].sort();
    const preview = await require('../modules/tools/git').commitPreviewAsync(root, requestedFiles, project);
    if (preview.blocked)
        throw Object.assign(new Error('提交文件已变化或存在冲突'), { status: 409 });
    const names = [...new Set([...requestedFiles, ...preview.files.map((f) => f.originalPath).filter(Boolean)])].sort();
    if (!names.length || names.length > 500)
        throw new Error('请选择 1–500 个提交文件');
    const dir = privateDir(path.join((0, exports.reviewRoot)(), 'snapshots', crypto.randomUUID()));
    const before = { root, dir: privateDir(path.join(dir, 'before')), head: snapshot.repository.head, files: {} };
    const rows = before.head ? (await (0, git_workspace_runtime_1.runGitCommand)(root, ['ls-tree', '-r', '-z', 'HEAD'], { maxOutputBytes: 16 * 1024 * 1024 })).stdout.split('\0').filter(Boolean) : [];
    const entries = rows.map(row => row.match(/^(\d+) blob ([0-9a-f]+)\t(.+)$/s)).filter(match => match && !safePath(match[3]).split('/').some(x => excluded.has(x)));
    const hashes = [...new Set(entries.map(match => match[2]))];
    const batch = hashes.length ? (0, child_process_1.execFileSync)('git', ['cat-file', '--batch'], { cwd: root, input: hashes.join('\n') + '\n', maxBuffer: snapshotByteBudget + 2 * 1024 * 1024, timeout: 30000, windowsHide: true }) : Buffer.alloc(0);
    const blobs = new Map();
    let offset = 0;
    for (const hash of hashes) {
        const end = batch.indexOf(10, offset);
        if (end < 0)
            throw new Error('Git 快照读取不完整');
        const header = batch.subarray(offset, end).toString('ascii').split(' '), size = Number(header[2]);
        if (header[0] !== hash || header[1] !== 'blob' || !Number.isInteger(size) || size < 0 || end + 1 + size > batch.length)
            throw new Error('Git 对象快照无效');
        blobs.set(hash, batch.subarray(end + 1, end + 1 + size));
        offset = end + 2 + size;
    }
    let total = 0;
    for (const match of entries) {
        const rel = safePath(match[3]);
        if (rel.split('/').some(x => excluded.has(x)))
            continue;
        if (match[1] === '120000') {
            if (names.includes(rel))
                throw new Error('所选符号链接需要人工检查');
            continue;
        }
        const bytes = blobs.get(match[2]);
        if ((total += bytes.length) > snapshotByteBudget || Object.keys(before.files).length >= 10000)
            throw new Error('提交审核快照超出预算');
        before.files[rel] = { hash: digest(bytes), binary: isBinary(bytes) };
        writeContent(before.dir, rel, bytes);
    }
    const after = { ...before, dir: privateDir(path.join(dir, 'after')), files: { ...before.files } };
    for (const rel of Object.keys(before.files))
        writeContent(after.dir, rel, fs.readFileSync(snapshotPath(before.dir, rel)));
    for (const rel of names) {
        const resolved = (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(root, rel, { allowLeafSymlink: false });
        if (fs.existsSync(resolved.absolute)) {
            const bytes = fs.readFileSync(path.join(root, rel));
            after.files[rel] = { hash: digest(bytes), binary: isBinary(bytes) };
            writeContent(after.dir, rel, bytes);
        }
        else {
            delete after.files[rel];
            fs.rmSync(snapshotPath(after.dir, rel), { force: true });
        }
    }
    const files = changedFiles(before, after, names);
    for (const file of files.filter(f => f.after)) {
        const attr = (await (0, git_workspace_runtime_1.runGitCommand)(root, ['check-attr', 'filter', '--', file.path])).stdout.trim();
        if (!attr.endsWith(': unspecified') && !attr.endsWith(': unset'))
            throw new Error('所选文件使用外部 Git filter，需要独立受控审核');
        file.afterBlobHash = (await (0, git_workspace_runtime_1.runGitCommand)(root, ['hash-object', `--path=${file.path}`, '--stdin'], { input: fs.readFileSync(snapshotPath(after.dir, file.path)) })).stdout.trim();
    }
    const final = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(root, project);
    if (final.checksum !== snapshot.checksum)
        throw Object.assign(new Error('构造审核副本期间工作区变化'), { status: 409 });
    return sealSubject({ kind: 'git', project, root, taskId: '', workItemId: '', traceId: `review_${crypto.randomUUID()}`, attemptId: '1', generation: 1,
        exactSessionId: '', planChecksum: '', goal: '审核明确选择的候选提交内容', plan: {}, head: before.head,
        workspaceChecksum: snapshot.checksum, requestedFiles, files, contextFingerprint: (0, settings_1.reviewHash)(after.files), baselineDir: before.dir, targetDir: after.dir });
}
function readReviewSource(subject, rel, side = 'after') {
    if (sensitivePath.test(rel))
        throw new Error('敏感文件仅供本地扫描，不发送模型');
    const file = snapshotPath(side === 'before' ? subject.baselineDir : subject.targetDir, rel);
    if (!fs.existsSync(file))
        return '';
    const bytes = fs.readFileSync(file);
    if (isBinary(bytes))
        throw new Error('二进制或超大文件不能作为源码读取');
    return bytes.toString('utf8');
}
function subjectFiles(subject) {
    const files = [];
    const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory())
            walk(abs);
        else {
            const rel = path.relative(subject.targetDir, abs).replace(/\\/g, '/');
            if (rel !== '.ccm-review-manifest.json')
                files.push(rel);
        }
    } };
    walk(subject.targetDir);
    return files;
}
async function reviewSubjectIsCurrent(subject) {
    if (subject.kind === 'git')
        return (await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(subject.root, subject.project)).checksum === subject.workspaceChecksum;
    const current = workingManifest(subject.root, '', false);
    return (0, settings_1.reviewHash)(current.files) === subject.contextFingerprint;
}
function taskReviewSubjectIsCurrent(subject) {
    try {
        const current = workingManifest(subject.root, '', false);
        return (0, settings_1.reviewHash)(current.files) === subject.contextFingerprint;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=snapshot.js.map