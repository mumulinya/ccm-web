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
exports.runAuxScanner = runAuxScanner;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const process_1 = require("./process");
const findings_1 = require("./findings");
async function runAuxScanner(tool, job, signal) {
    const config = job.policy.settings[tool];
    if (!config.enabled)
        throw new Error('扫描器未在冻结策略中启用');
    if (!path.isAbsolute(config.executable) || !fs.existsSync(config.executable))
        throw new Error('扫描器程序不可用');
    const paths = job.subject.files.map(f => f.path), findings = [];
    const home = path.join(path.dirname(job.subject.targetDir), `${job.id}-scanner-home`);
    fs.mkdirSync(home, { recursive: true, mode: 0o700 });
    const env = { ...(0, process_1.privateReviewEnv)(home), SEMGREP_ENABLE_VERSION_CHECK: '0', SEMGREP_SEND_METRICS: 'off' };
    if (tool === 'semgrep') {
        const settings = job.policy.settings.semgrep;
        const result = await (0, process_1.reviewProcess)(settings.executable, ['scan', '--config', settings.rules, '--metrics', 'off', '--json', '--no-git-ignore', job.subject.targetDir], { cwd: job.subject.targetDir, signal, timeoutMs: 60000, env });
        const raw = JSON.parse(result.stdout);
        for (const row of raw.results || []) {
            const rel = path.relative(job.subject.targetDir, row.path).replace(/\\/g, '/');
            if (!paths.includes(rel))
                continue;
            findings.push((0, findings_1.finding)({ path: rel, startLine: row.start?.line, endLine: row.end?.line, content: row.extra?.message,
                category: 'security', severity: row.extra?.severity === 'ERROR' ? 'high' : 'medium', evidence: [row.check_id] }, tool, paths));
        }
        const completed = (raw.paths?.scanned || []).map((p) => path.relative(job.subject.targetDir, path.resolve(job.subject.targetDir, p)).replace(/\\/g, '/')).filter((p) => paths.includes(p));
        const missing = paths.filter(p => job.subject.files.find(f => f.path === p)?.after && !completed.includes(p));
        return { findings, coverage: { tool, status: result.exitCode > 1 || raw.errors?.length || missing.length ? 'partial' : 'complete', selected: paths, completed,
                skipped: missing.map(p => ({ path: p, reason: 'Semgrep 未声明已扫描，该语言或规则可能不受支持' })) } };
    }
    const settings = job.policy.settings.osv;
    if (!fs.existsSync(settings.database))
        throw new Error('OSV 离线数据库未准备');
    const databaseTimes = [];
    const databaseWalk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isSymbolicLink())
            throw new Error('离线数据库不能包含符号链接');
        if (entry.isDirectory())
            databaseWalk(file);
        else if (entry.name.endsWith('.zip'))
            databaseTimes.push(fs.statSync(file).mtimeMs);
    } };
    if (fs.statSync(settings.database).isDirectory())
        databaseWalk(settings.database);
    if (!databaseTimes.length || databaseTimes.some(t => Date.now() - t > settings.maxAgeDays * 86400000))
        throw new Error('OSV 离线数据库缺失或已过期，需要人工更新');
    const locks = job.subject.files.filter(f => f.after && /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|go\.sum|requirements.*\.txt)$/.test(f.path));
    if (!locks.length)
        return { findings, coverage: { tool, status: 'skipped', selected: [], completed: [], skipped: [{ path: '', reason: '本轮无依赖锁文件变化' }] } };
    async function scan(dir, names) {
        const result = await (0, process_1.reviewProcess)(settings.executable, ['scan', 'source', '--offline', '--format', 'json', ...names.flatMap(rel => ['--lockfile', path.join(dir, rel)])], { cwd: dir, signal, timeoutMs: 60000, env: { ...env, OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY: settings.database } });
        if (result.exitCode > 1)
            throw new Error('OSV 扫描未执行完成');
        return JSON.parse(result.stdout);
    }
    const beforeNames = locks.filter(f => f.before).map(f => f.path);
    const before = beforeNames.length ? await scan(job.subject.baselineDir, beforeNames) : { results: [] }, after = await scan(job.subject.targetDir, locks.map(f => f.path));
    const ids = new Set((before.results || []).flatMap((r) => (r.packages || []).flatMap((p) => (p.vulnerabilities || []).map((v) => `${p.package?.name}:${p.package?.version}:${v.id}`))));
    for (const result of after.results || [])
        for (const pkg of result.packages || [])
            for (const vuln of pkg.vulnerabilities || []) {
                const key = `${pkg.package?.name}:${pkg.package?.version}:${vuln.id}`;
                if (ids.has(key))
                    continue;
                const rel = path.relative(job.subject.targetDir, result.source?.path || '').replace(/\\/g, '/');
                const target = paths.includes(rel) ? rel : locks[0].path;
                findings.push((0, findings_1.finding)({ path: target, category: 'security', severity: 'unknown', title: `本次依赖变化引入 ${vuln.id}：${pkg.package?.name}`, evidence: [vuln.id], impact: vuln.summary }, tool, paths));
            }
    return { findings, coverage: { tool, status: 'complete', selected: locks.map(f => f.path), completed: locks.map(f => f.path), skipped: [] } };
}
//# sourceMappingURL=aux-scanners.js.map