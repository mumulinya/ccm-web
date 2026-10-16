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
exports.removeUnusedReviewSubject = removeUnusedReviewSubject;
exports.purgeTaskCodeReviews = purgeTaskCodeReviews;
exports.pruneStandaloneCodeReviews = pruneStandaloneCodeReviews;
exports.eraseExpiredReviewCredentials = eraseExpiredReviewCredentials;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const store_1 = require("./store");
const snapshot_1 = require("./snapshot");
function removePrivateArtifact(dir) {
    const root = path.resolve((0, snapshot_1.reviewRoot)()), target = path.resolve(dir), relative = path.relative(root, target);
    if (!relative || path.isAbsolute(relative) || relative.startsWith('..') || !['snapshots', 'baselines'].includes(relative.split(path.sep)[0]))
        throw new Error('审核清理路径不属于私有审核目录');
    if (!fs.existsSync(target))
        return;
    const realRelative = path.relative(fs.realpathSync.native(root), fs.realpathSync.native(target));
    if (!realRelative || path.isAbsolute(realRelative) || realRelative.startsWith('..'))
        throw new Error('审核清理路径存在联接逃逸');
    fs.rmSync(target, { recursive: true, force: true });
}
function removeUnusedReviewSubject(subject) {
    const relative = path.relative((0, snapshot_1.reviewRoot)(), subject.targetDir).split(path.sep);
    if (relative.length < 2 || relative[0] !== 'snapshots')
        throw new Error('审核快照清理范围无效');
    removePrivateArtifact(path.join((0, snapshot_1.reviewRoot)(), relative[0], relative[1]));
}
function removeJobArtifacts(job) {
    removeUnusedReviewSubject(job.subject);
    const parent = path.dirname(job.subject.targetDir);
    if (fs.existsSync(parent))
        for (const entry of fs.readdirSync(parent))
            if (entry.startsWith(`${job.id}-`))
                removePrivateArtifact(path.join(parent, entry));
}
function purgeTaskCodeReviews(taskId) {
    const jobs = (0, store_1.listReviewJobs)(taskId), retained = jobs.filter(j => j.status === 'running' && j.leaseUntil > Date.now());
    const remove = jobs.filter(j => !retained.includes(j));
    for (const job of remove) {
        removeJobArtifacts(job);
        if (!retained.some(j => j.subject.baselineDir === job.subject.baselineDir))
            removePrivateArtifact(job.subject.baselineDir);
    }
    (0, store_1.removeReviewJobs)(remove.map(j => j.id));
    return { removed: remove.length, deferred: retained.length };
}
function pruneStandaloneCodeReviews() {
    const jobs = (0, store_1.staleStandaloneReviewJobs)();
    for (const job of jobs)
        removeJobArtifacts(job);
    (0, store_1.removeReviewJobs)(jobs.map(j => j.id));
    return { removed: jobs.length };
}
/** Finally handles normal completion; this also removes plaintext tool config
 * after a parent crash once its persisted lease is no longer active. */
function eraseExpiredReviewCredentials() {
    for (const job of (0, store_1.expiredCredentialReviewJobs)()) {
        const parent = path.dirname(job.subject.targetDir);
        for (const dir of [parent, path.join(parent, `${job.id}-model-sources`)]) {
            const file = path.join(dir, `${job.id}-ocr-home`, '.opencodereview', 'config.json');
            if (!fs.existsSync(file))
                continue;
            const relative = path.relative(fs.realpathSync.native((0, snapshot_1.reviewRoot)()), fs.realpathSync.native(file));
            if (!relative || path.isAbsolute(relative) || relative.startsWith('..') || fs.lstatSync(file).isSymbolicLink())
                throw new Error('审核配置清理路径无效');
            fs.unlinkSync(file);
        }
        (0, store_1.updateReviewJob)(job.id, j => { j.credentialsCleared = true; });
    }
}
//# sourceMappingURL=maintenance.js.map