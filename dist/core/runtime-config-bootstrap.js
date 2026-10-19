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
// Resolve before any eager store initialization; child processes inherit the same root.
const runtime_directory_config_1 = require("./runtime-directory-config");
const runtime_directory_job_1 = require("./runtime-directory-job");
const path = __importStar(require("path"));
const explicit = !!process.env.CCM_TASK_STORE_DIR;
if (!explicit) {
    const directory = (0, runtime_directory_config_1.resolveDataDirectory)();
    const { DEFAULT_DATA_DIRECTORY } = require('./runtime-directory-config');
    if (directory !== DEFAULT_DATA_DIRECTORY)
        process.env.CCM_TASK_STORE_DIR = directory;
}
const entry = path.basename(process.argv[1] || '');
// Existing task/MCP workers must finish while the server waits. Only new
// service entrypoints are fenced here; the instance lock also fences embeds.
if (entry === 'server.js' || ['ccm.js', 'legacy-project-cli.js'].includes(entry) && ['start', 'serve', 'web', 'restart'].includes(process.argv[2])) {
    (0, runtime_directory_job_1.assertDirectoryReservation)((0, runtime_directory_config_1.resolveDataDirectory)());
}
//# sourceMappingURL=runtime-config-bootstrap.js.map