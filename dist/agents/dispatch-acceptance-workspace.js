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
exports.startDispatchAcceptanceAtWorkspace = startDispatchAcceptanceAtWorkspace;
exports.resolveDispatchAcceptanceWorkspace = resolveDispatchAcceptanceWorkspace;
const db_1 = require("../core/db");
const acceptance_contract_1 = require("./acceptance-contract");
const task_acceptance_service_1 = require("./task-acceptance-service");
const acceptance_ledger_1 = require("./acceptance-ledger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/** Bind the developer's actual isolated lane before edits. Multi-project
 * workers may register only their project; never substitute another root. */
function startDispatchAcceptanceAtWorkspace(taskId, project, workspacePath) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    if (task)
        require('../review/task-integration').startTaskCodeReviewBaseline(task, project, workspacePath);
    if (!task || !(0, acceptance_contract_1.taskAcceptanceContract)(task))
        return;
    (0, task_acceptance_service_1.startTaskAcceptance)(task, { [project]: workspacePath }, project);
}
function canonical(directory) {
    const real = fs.realpathSync(directory);
    return process.platform === "win32" ? real.toLowerCase() : real;
}
function repository(directory) {
    const common = String((0, child_process_1.execFileSync)("git", ["-C", directory, "rev-parse", "--git-common-dir"], { encoding: "utf8", windowsHide: true, timeout: 5000, stdio: ["ignore", "pipe", "pipe"] })).trim();
    return canonical(path.resolve(directory, common));
}
/** A handoff cannot invent a workspace. Only a matching frozen ledger can
 * grant the actual lane, and that lane must belong to the registered repo. */
function resolveDispatchAcceptanceWorkspace(taskId, project, registeredRoot, groupId) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    const contract = task && (0, acceptance_contract_1.taskAcceptanceContract)(task);
    if (groupId && task?.group_id !== groupId)
        throw new Error("验收任务不属于当前群聊");
    if (!contract) {
        if (!task?.dispatch_profile_snapshot)
            return registeredRoot;
        // Lightweight contracts need not create an acceptance ledger. Read the
        // actual developer lane from the same persisted kernel used for launch.
        const execution = require("./execution-kernel").listExecutions({ taskId })
            .find((row) => row.project === project && row.agent !== "test-agent" && row.workspace?.workDir);
        const root = execution?.workspace?.workDir || registeredRoot;
        if (canonical(root) !== canonical(registeredRoot) && repository(root) !== repository(registeredRoot)) {
            throw new Error("验收工作区不属于注册项目仓库");
        }
        return root;
    }
    const ledger = (0, acceptance_ledger_1.readAcceptanceLedger)(taskId);
    if (!ledger || ledger.contract.checksum !== contract.checksum)
        throw new Error("验收工作区账本缺失或合同不匹配");
    const roots = [...new Set(ledger.executions.filter(row => row.projectId === project).map(row => row.root))];
    if (roots.length !== 1 || !registeredRoot)
        throw new Error("验收项目工作区绑定缺失或存在歧义");
    const root = roots[0];
    if (canonical(root) !== canonical(registeredRoot) && repository(root) !== repository(registeredRoot)) {
        throw new Error("验收工作区不属于注册项目仓库");
    }
    return root;
}
//# sourceMappingURL=dispatch-acceptance-workspace.js.map