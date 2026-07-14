import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const modulePath = path.resolve("ccm-package/dist/modules/collaboration/group-session-maintenance.js");
const leaseFile = path.join(os.tmpdir(), `ccm-group-session-maintenance-race-${process.pid}-${Date.now()}.json`);

function runWorker(kind) {
  const holder = kind === "holder";
  const code = `
    const m = require(${JSON.stringify(modulePath)});
    const result = m.runGroupSessionRetentionMaintenance({
      force: true,
      dryRun: true,
      leaseFile: ${JSON.stringify(leaseFile)},
      groups: ${holder ? `[{id:"race-group",name:"Race"}]` : "[]"},
      config: {groupSessionAutoPruneEnabled:true,groupSessionRetentionDays:30,groupSessionMaxArchived:20,groupSessionRetentionIntervalHours:24},
      pruneFn: () => { ${holder ? "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1800);" : ""} return {candidateCount:0,results:[]}; },
      artifactDeleteFn: () => ({deletedFiles:0}),
      trigger: ${JSON.stringify(`race-${kind}`)}
    });
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  `;
  return spawn(process.execPath, ["-e", code], { stdio: ["ignore", "pipe", "pipe"] });
}

function collect(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(stderr || `worker exited ${code}`));
      try { resolve(JSON.parse(stdout)); } catch (error) { reject(new Error(`invalid worker output: ${stdout}\n${stderr}\n${error}`)); }
    });
  });
}

const holder = runWorker("holder");
await new Promise(resolve => setTimeout(resolve, 350));
const contender = runWorker("contender");
const [holderResult, contenderResult] = await Promise.all([collect(holder), collect(contender)]);

const checks = {
  holderCompletes: holderResult.success === true && holderResult.skipped !== true,
  contenderSkipsBusyLease: contenderResult.skipped === true && contenderResult.reason === "lease_busy",
  bothReferenceSameLeaseOwner: contenderResult.lease?.leaseId === holderResult.lease?.leaseId,
  onlyOneRunProcessesGroups: holderResult.groupCount === 1 && Number(contenderResult.groupCount || 0) === 0,
};

try {
  const dir = path.dirname(leaseFile);
  const prefix = path.basename(leaseFile);
  for (const name of fs.readdirSync(dir)) if (name.startsWith(prefix)) fs.unlinkSync(path.join(dir, name));
} catch {}

const result = { pass: Object.values(checks).every(Boolean), checks, holder: holderResult.lease, contender: { reason: contenderResult.reason, lease: contenderResult.lease } };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
