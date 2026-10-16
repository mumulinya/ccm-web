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
exports.handleCodeReviewApi = handleCodeReviewApi;
const fs = __importStar(require("fs"));
const utils_1 = require("../core/utils");
const db_1 = require("../core/db");
const access_policy_1 = require("../modules/system/access-policy");
const settings_1 = require("./settings");
const store_1 = require("./store");
const service_1 = require("./service");
const snapshot_1 = require("./snapshot");
const ocr_adapter_1 = require("./ocr-adapter");
const snapshot_2 = require("./snapshot");
function resource(req, project, manage = false) {
    const auth = req.ccmAuth;
    if (!auth)
        throw Object.assign(new Error('请登录'), { status: 401 });
    if (auth.kind === 'internal')
        throw Object.assign(new Error('审核管理接口仅允许登录用户'), { status: 403 });
    if (!(0, access_policy_1.hasResourceAccess)(auth.userId, auth.role, 'project', project, manage ? 'manage' : 'use'))
        throw Object.assign(new Error('无项目审核权限'), { status: 403 });
}
const root = snapshot_2.registeredReviewWorkspace;
async function body(req) { let text = ''; for await (const chunk of req) {
    text += chunk;
    if (text.length > 256 * 1024)
        throw new Error('审核请求过大');
} return JSON.parse(text || '{}'); }
function handleCodeReviewApi(pathname, req, res) {
    const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/code-review(?:\/(recheck))?$/);
    if (!pathname.startsWith('/api/code-review/') && !pathname.startsWith('/api/system/code-review') && pathname !== '/api/git/code-review' && !taskMatch)
        return false;
    void (async () => {
        if (pathname.startsWith('/api/system/code-review')) {
            const auth = req.ccmAuth;
            if (auth?.kind !== 'browser' || !(auth.role === 'admin' || (0, access_policy_1.hasFeatureAccess)(auth.userId, auth.role, 'platform_settings')))
                throw Object.assign(new Error('无平台设置权限'), { status: 403 });
            if (pathname.endsWith('/rule-drafts')) {
                if (auth.role !== 'admin')
                    throw Object.assign(new Error('规则反馈需要管理员审核'), { status: 403 });
                if (req.method === 'GET')
                    return (0, utils_1.sendJson)(res, { success: true, drafts: (0, store_1.listRuleDrafts)() });
                const input = await body(req), draft = (0, store_1.listRuleDrafts)().find(d => d.id === input.id);
                if (!draft || draft.status !== 'draft')
                    throw new Error('规则草案不存在或已处理');
                if (input.operation !== 'approve' && input.operation !== 'reject')
                    throw new Error('规则决定无效');
                if (input.operation === 'approve') {
                    const settings = (0, settings_1.loadReviewSettings)();
                    (0, settings_1.saveReviewSettings)({ revision: settings.revision, rules: [...settings.rules, { project: draft.project, pattern: draft.pattern, instruction: String(input.instruction || draft.instruction) }] });
                }
                (0, store_1.saveRuleDraft)({ ...draft, status: input.operation === 'approve' ? 'approved' : 'rejected', decidedBy: auth.userId, decidedAt: new Date().toISOString() });
                return (0, utils_1.sendJson)(res, { success: true, drafts: (0, store_1.listRuleDrafts)() });
            }
            if (pathname.endsWith('/probe') && req.method === 'POST') {
                const settings = (0, settings_1.loadReviewSettings)();
                return (0, utils_1.sendJson)(res, { success: true, tools: { ocr: await (0, ocr_adapter_1.probeOcr)(), secretlint: (() => { try {
                            require.resolve('secretlint/package.json');
                            return { available: true, version: '10.2.2' };
                        }
                        catch {
                            return { available: false };
                        } })(),
                        semgrep: { available: !!settings.semgrep.executable && fs.existsSync(settings.semgrep.executable) }, osv: { available: !!settings.osv.executable && fs.existsSync(settings.osv.executable), databaseReady: !!settings.osv.database && fs.existsSync(settings.osv.database) } }, modelConfigured: !!settings.model.keyRef && !!settings.model.apiUrl && !!settings.model.model });
            }
            if (req.method === 'GET')
                return (0, utils_1.sendJson)(res, { success: true, settings: (0, settings_1.publicReviewSettings)() });
            if (req.method === 'POST')
                return (0, utils_1.sendJson)(res, { success: true, settings: (0, settings_1.publicReviewSettings)((0, settings_1.saveReviewSettings)(await body(req))) });
        }
        if (pathname === '/api/git/code-review' && req.method === 'POST') {
            const input = await body(req), project = String(input.project || '');
            resource(req, project, true);
            if (!Array.isArray(input.files))
                throw new Error('需要精确提交文件列表');
            const subject = await (0, snapshot_1.gitReviewSubject)(project, root(project), input.files, input.expected_snapshot_checksum);
            const job = (0, service_1.createReviewJob)(subject, (0, settings_1.freezeReviewPolicy)('commit'), String(input.idempotency_key || ''));
            return (0, utils_1.sendJson)(res, { success: true, review: (0, store_1.publicReviewJob)(job) }, 202);
        }
        if (taskMatch) {
            const task = (0, db_1.loadTasks)().find(t => t.id === decodeURIComponent(taskMatch[1]));
            if (!task)
                throw new Error('任务不存在');
            const jobs = (0, store_1.listReviewJobs)(task.id);
            for (const job of jobs)
                resource(req, job.subject.project, req.method !== 'GET');
            if (task.target_project && task.target_project !== 'global-agent')
                resource(req, task.target_project, req.method !== 'GET');
            if (!jobs.length && !task.target_project)
                throw Object.assign(new Error('任务审核尚未建立项目授权'), { status: 403 });
            if (req.method === 'GET')
                return (0, utils_1.sendJson)(res, { success: true, reviews: jobs.map(store_1.publicReviewJob) });
            if (req.method === 'POST' && taskMatch[2]) {
                const input = await body(req), prior = jobs.find(j => j.id === input.review_job_id);
                if (!prior)
                    throw new Error('需要指定原审核');
                if (!task.code_review_policy || ['done', 'completed', 'cancelled'].includes(task.status))
                    throw new Error('任务不能重新审核');
                const subject = await (0, snapshot_1.taskReviewSubject)(task, prior.subject.project, prior.subject.root, prior.subject.workItemId);
                const job = (0, service_1.createReviewJob)(subject, task.code_review_policy, String(input.idempotency_key || ''));
                require('../modules/collaboration/collaboration-task-service').updateTask(task.id, { code_review_job_ids: [...new Set([...(task.code_review_job_ids || []), job.id])], code_review_summary: (0, store_1.publicReviewJob)(job) });
                return (0, utils_1.sendJson)(res, { success: true, review: (0, store_1.publicReviewJob)(job) }, 202);
            }
        }
        const jobMatch = pathname.match(/^\/api\/code-review\/jobs\/([^/]+)(?:\/(cancel|decision|attest-files))?$/);
        if (jobMatch) {
            const job = (0, store_1.readReviewJob)(decodeURIComponent(jobMatch[1]));
            if (!job)
                throw Object.assign(new Error('审核不存在'), { status: 404 });
            resource(req, job.subject.project, req.method !== 'GET');
            if (req.method === 'GET')
                return (0, utils_1.sendJson)(res, { success: true, review: (0, store_1.publicReviewJob)(job) });
            const input = await body(req);
            let updated;
            if (!Number.isInteger(input.revision))
                throw new Error('审核操作需要当前 revision');
            if (jobMatch[2] === 'cancel')
                updated = (0, service_1.cancelReviewJob)(job.id, input.revision);
            else if (jobMatch[2] === 'decision')
                updated = (0, service_1.decideReviewFinding)(job.id, input.finding_id, input.revision, req.ccmAuth, input);
            else if (jobMatch[2] === 'attest-files')
                updated = (0, service_1.attestReviewArtifacts)(job.id, input.revision, req.ccmAuth, input.reason);
            else
                throw new Error('不支持的审核操作');
            return (0, utils_1.sendJson)(res, { success: true, review: (0, store_1.publicReviewJob)(updated) });
        }
        (0, utils_1.sendJson)(res, { success: false, error: '审核接口不存在' }, 404);
    })().catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message || '审核操作失败', code: error.code || 'code_review_error' }, error.status || 400));
    return true;
}
//# sourceMappingURL=routes.js.map