"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestAcceptanceWorker = runTestAcceptanceWorker;
const internal_mcp_test_store_1 = require("./internal-mcp-test-store");
async function runTestAcceptanceWorker(file = process.argv[2] || "") {
    if (!file)
        throw new Error("缺少 TestAgent 运行文件");
    const result = await (0, internal_mcp_test_store_1.executeInternalMcpTestRunFile)(file);
    process.stdout.write(`${JSON.stringify({ run_id: result.run_id, status: result.status })}\n`);
    return result;
}
if (require.main === module) {
    void runTestAcceptanceWorker().then(result => {
        process.exitCode = result.status === "completed" ? 0 : 1;
    }).catch(error => {
        process.stderr.write(`${error?.message || String(error)}\n`);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=test-acceptance-worker.js.map