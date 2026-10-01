"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAcceptanceGitAudit = captureAcceptanceGitAudit;
const child_process_1 = require("child_process");
const acceptance_contract_1 = require("./acceptance-contract");
/** Read-only Git audit. Content fingerprints remain separate so disposable copies can be verified. */
function captureAcceptanceGitAudit(root, cleanupPaths) {
    const run = (args) => (0, child_process_1.spawnSync)("git", ["-C", root, ...args], {
        encoding: "utf8", windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
    const inside = run(["rev-parse", "--is-inside-work-tree"]);
    if (inside.status !== 0 || inside.stdout?.trim() !== "true")
        return { available: false, fingerprint: "" };
    const paths = ["--", ".", ...cleanupPaths.map(p => `:(exclude,literal)${p.replace(/\\/g, "/")}`)];
    const head = run(["rev-parse", "--verify", "HEAD"]);
    const branch = run(["symbolic-ref", "-q", "HEAD"]);
    if (head.status !== 0 && branch.status !== 0)
        return { available: false, fingerprint: "" };
    const index = run(["ls-files", "--stage", "-z", ...paths]);
    const staged = run(["diff", "--cached", "--no-ext-diff", "--no-textconv", "--binary", ...paths]);
    const unstaged = run(["diff", "--no-ext-diff", "--no-textconv", "--binary", ...paths]);
    const status = run(["status", "--porcelain=v1", "-z", "--untracked-files=all", ...paths]);
    if ([index, staged, unstaged, status].some(r => r.status !== 0 || r.error))
        return { available: false, fingerprint: "" };
    return { available: true, fingerprint: (0, acceptance_contract_1.acceptanceHash)({ head: head.status === 0 ? head.stdout.trim() : "unborn",
            index: index.stdout, staged: staged.stdout, unstaged: unstaged.stdout, status: status.stdout }) };
}
//# sourceMappingURL=acceptance-git-audit.js.map