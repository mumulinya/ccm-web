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
exports.additionalDirectoryActivity = additionalDirectoryActivity;
const path = __importStar(require("path"));
const runtime_paths_1 = require("../core/runtime-paths");
const runtime_directory_config_1 = require("../core/runtime-directory-config");
const runtime_directory_job_1 = require("../core/runtime-directory-job");
function additionalDirectoryActivity() {
    const runtime = (0, runtime_directory_config_1.readJson)(path.join(runtime_paths_1.CCM_DIR, 'project-runtime/state.json'), {});
    const projectProcesses = [...Object.values(runtime.processes || {}), ...Object.values(runtime.builds || {})].filter((row) => ['starting', 'running', 'stopping', 'building', 'cancelling', 'unknown'].includes(row.status) && (!row.pid || (0, runtime_directory_job_1.alive)(Number(row.pid)))).length;
    // Inspection must never initialize a second SQLite connection or start a job pump.
    const cached = (file) => require.cache[require.resolve(file)]?.exports;
    const musicDownloads = (cached('../modules/music/download-jobs')?.musicDownloadJobs?.list() || []).filter((row) => ['resolving', 'running'].includes(row.status)).length;
    const installs = Object.values(cached('../modules/system/agent-provider-settings')?.getAgentProviderInstallJobs() || {}).filter((row) => ['installing', 'running'].includes(row?.status)).length;
    const languages = (cached('./managed-language-servers')?.listManagedLanguageServerInstallations() || []).filter((row) => row.installState === 'installing').length;
    return { projectProcesses, musicDownloads, installs, languages };
}
//# sourceMappingURL=data-directory-activity.js.map