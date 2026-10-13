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
exports.prepareTaskListReadCache = prepareTaskListReadCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const runtime_paths_1 = require("../core/runtime-paths");
const readonly_performance_service_1 = require("./readonly-performance-service");
const performance_monitor_1 = require("./performance-monitor");
// Prepare large compatibility list summaries after HTTP listen. This reads no
// authorization state and starts no Runtime; every consumer still checks the
// file version and its own fresh permission boundary before using the summary.
async function prepareTaskListReadCache() {
    const file = path.join(runtime_paths_1.CCM_DIR, 'task-runs.json');
    try {
        const source = await fs.promises.stat(file);
        if (source.isFile() && source.size > 512 * 1024)
            await (0, readonly_performance_service_1.readTaskRunSummaryOffThread)(file);
    }
    catch (error) {
        if (error?.code !== 'ENOENT')
            (0, performance_monitor_1.recordPerformance)('startup.task_list_preparation_failed', 0);
    }
}
//# sourceMappingURL=task-list-preparation.js.map