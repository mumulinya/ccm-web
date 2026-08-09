import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-context-source-selftest-"));
process.env.CCM_TASK_STORE_DIR = path.join(tempRoot, ".cc-connect");
const sourceContinuityModule = await import("../ccm-package/dist/system/main-agent-context-source-continuity.js");

const result = sourceContinuityModule.runContextSourceContinuitySelfTest();
if (!result?.pass) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ pass: true, budgets: result.budgets, catalog: result.catalog, receiptCount: result.continuity.receipts.length, contentStored: result.reference.contentStored }, null, 2));
fs.rmSync(tempRoot, { recursive: true, force: true });
