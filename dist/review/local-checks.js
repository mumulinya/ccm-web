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
exports.checkPlanScope = checkPlanScope;
exports.testShape = testShape;
exports.checkTestIntegrity = checkTestIntegrity;
exports.scanSecrets = scanSecrets;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
const findings_1 = require("./findings");
const minimatch_1 = require("minimatch");
const dispatch_profile_1 = require("../agents/dispatch-profile");
const snapshot_1 = require("./snapshot");
const process_1 = require("./process");
function checkPlanScope(job) {
    if (job.subject.kind !== 'task')
        return [];
    const paths = job.subject.files.map(f => f.path), items = job.subject.plan?.workItems || [];
    const projectItems = items.filter((w) => (w.projectId || w.project) === job.subject.project);
    const covered = (rel, list) => list.some(p => rel === p || rel.startsWith(p.replace(/\/$/, '') + '/') || (0, minimatch_1.minimatch)(rel, p));
    const scope = job.subject.dispatchScope || { recommendedPaths: [], protectedPaths: [], forbiddenPaths: [], approvedPaths: [] };
    const editable = [...scope.recommendedPaths, ...projectItems.flatMap((w) => w.editablePaths || w.files || [])];
    const itemForbidden = projectItems.flatMap((w) => [...(w.forbiddenPaths || []), ...(w.readOnlyPaths || [])]);
    // Different work items may deliberately read and write the same path. Full
    // task diffs do not prove which item wrote it, so conflicts stay candidates.
    const forbidden = [...scope.forbiddenPaths, ...itemForbidden.filter((p) => !covered(p, editable))];
    return paths.flatMap(rel => {
        const decision = (0, dispatch_profile_1.evaluateDispatchPath)(rel, { ...scope, recommendedPaths: editable, forbiddenPaths: forbidden }, job.policy.level === 'strict' ? 'strict' : 'standard', job.subject.root);
        const prohibited = covered(rel, forbidden) || decision.reason === 'forbidden_path';
        const outside = !decision.allowed || decision.advisory || covered(rel, itemForbidden) && covered(rel, editable);
        if (!prohibited && !outside)
            return [];
        return [(0, findings_1.finding)({ path: rel, category: 'scope', severity: prohibited ? 'critical' : 'high', state: prohibited ? 'confirmed' : 'unverified',
                title: prohibited ? '修改了冻结计划的禁止或只读路径' : '改动超出已声明范围，需要核对计划或批准范围扩展',
                trigger: `变更 ${rel}`, impact: '未经授权的改动可能改变需求边界或受保护数据', evidence: [job.subject.planChecksum, decision.reason],
                suggestion: prohibited ? '由原开发 Agent 撤回该路径的越界改动' : '核对该改动的必要性并通过现有范围扩展审批流程' }, 'plan_scope', paths)];
    });
}
function testShape(source, file) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const tests = [], assertions = [], controls = [];
    function visit(node) {
        if (ts.isCallExpression(node)) {
            const callee = node.expression.getText(tree);
            if (/^(?:it|test|describe)(?:\.(?:skip|only|todo))?$/.test(callee)) {
                const label = node.arguments[0];
                tests.push(label && ts.isStringLiteral(label) ? label.text : callee);
                if (/\.(?:skip|only|todo)$/.test(callee))
                    controls.push(`${callee}:${label?.getText(tree) || ''}`);
            }
            if (/^(?:expect|assert)(?:\.|$)/.test(callee) || /\.to(?:Be|Equal|Have|Match|Throw)/.test(callee))
                assertions.push(callee);
        }
        ts.forEachChild(node, visit);
    }
    visit(tree);
    return { tests, assertions, controls };
}
function checkTestIntegrity(job) {
    const findings = [], paths = job.subject.files.map(f => f.path);
    for (const file of job.subject.files) {
        if (file.binary)
            continue;
        let before = '', after = '';
        try {
            before = (0, snapshot_1.readReviewSource)(job.subject, file.path, 'before');
            after = (0, snapshot_1.readReviewSource)(job.subject, file.path);
        }
        catch {
            continue;
        }
        const issues = [];
        if (/(?:^|\/)(?:tests?|__tests__|scripts)(?:\/)|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file.path)) {
            if (file.before && !file.after)
                issues.push('已有测试或检查脚本被删除，需要对照计划核实');
            const a = testShape(before, file.path), b = testShape(after, file.path);
            if (a.tests.length > b.tests.length || a.assertions.length > b.assertions.length)
                issues.push('测试或断言数量减少，需要核实等价性与覆盖');
            if (b.controls.some(x => !a.controls.includes(x)))
                issues.push('新增 skip、only 或 todo，可能缩小实际测试范围');
        }
        if (/(?:package\.json|(?:jest|vitest|playwright|nyc).*\.[cm]?[jt]s|\.nycrc.*)$/.test(file.path) && before !== after) {
            if (file.path.endsWith('package.json')) {
                try {
                    const a = JSON.parse(before || '{}'), b = JSON.parse(after || '{}');
                    for (const key of Object.keys(a.scripts || {}).filter(k => /test|check|lint|type/.test(k)))
                        if (a.scripts[key] !== b.scripts?.[key])
                            issues.push(`验证脚本 ${key} 已变化，需要核实未削弱冻结检查`);
                }
                catch {
                    issues.push('验证配置无法解析');
                }
            }
            else
                issues.push('测试发现、断言或覆盖配置发生变化，需要对照冻结标准核实');
        }
        for (const title of issues)
            findings.push((0, findings_1.finding)({ path: file.path, title, category: 'test_integrity', severity: 'high', side: file.after ? 'after' : 'before', evidence: [file.beforeHash, file.afterHash] }, 'test_integrity', paths));
    }
    return findings;
}
async function scanSecrets(job, signal) {
    const packageFile = require.resolve('secretlint/package.json');
    const configFile = path.join(path.dirname(job.subject.targetDir), `${job.id}-secretlintrc.json`);
    const preset = require.resolve('@secretlint/secretlint-rule-preset-recommend');
    fs.writeFileSync(configFile, JSON.stringify({ rules: [{ id: preset, rules: [{ id: '@secretlint/secretlint-rule-filter-comments', disabled: true }] }] }), { mode: 0o600 });
    fs.writeFileSync(configFile + '.empty', '', { mode: 0o600 });
    const files = job.subject.files.filter(f => f.after && !f.binary);
    if (!files.length) {
        fs.rmSync(configFile, { force: true });
        fs.rmSync(configFile + '.empty', { force: true });
        return { findings: [], masks: [], completed: [] };
    }
    // Safe names prevent glob metacharacters in user filenames from changing scan targets.
    const view = path.join(path.dirname(job.subject.targetDir), `${job.id}-secretlint-input`);
    fs.mkdirSync(view, { recursive: true, mode: 0o700 });
    const lookup = new Map();
    files.forEach((f, i) => { const name = `${i}${path.extname(f.path) || '.txt'}`; lookup.set(name, f.path); fs.writeFileSync(path.join(view, name), fs.readFileSync((0, snapshot_1.snapshotPath)(job.subject.targetDir, f.path)), { mode: 0o600 }); });
    const cli = path.join(path.dirname(packageFile), 'bin', 'secretlint.js');
    let result;
    try {
        result = await (0, process_1.reviewProcess)(process.execPath, [cli, '--format', 'json', '--secretlintrc', configFile, '--secretlintignore', configFile + '.empty', '*'], { cwd: view, timeoutMs: 30000, signal });
    }
    finally {
        fs.rmSync(view, { recursive: true, force: true });
        fs.rmSync(configFile, { force: true });
        fs.rmSync(configFile + '.empty', { force: true });
    }
    const rows = JSON.parse(result.stdout);
    if (!Array.isArray(rows) || result.exitCode > 1)
        throw new Error('密钥检查未完整执行');
    if (rows.length !== files.length || rows.some(row => !lookup.has(path.basename(row.filePath))))
        throw new Error('密钥检查缺少文件覆盖证据');
    const findings = [], masks = [];
    for (const row of rows) {
        const rel = lookup.get(path.basename(row.filePath));
        for (const message of row.messages || []) {
            const value = (0, findings_1.finding)({ path: rel, title: `本地密钥规则 ${message.ruleId || message.messageId} 发现敏感内容`, category: 'secret', severity: 'critical', startLine: message.line, endLine: message.endLine, state: 'confirmed', evidence: [message.ruleId || 'secretlint'], trigger: '候选文件包含符合密钥规则的值', impact: '敏感值可能随源码提交或发送给模型', suggestion: '移除源码中的敏感值，使用环境变量或受保护凭据引用；核对后重新审核' }, 'secretlint', files.map(f => f.path));
            findings.push(value);
            masks.push({ path: rel, range: message.range, line: message.line });
        }
    }
    return { findings, masks, completed: files.map(f => f.path) };
}
//# sourceMappingURL=local-checks.js.map