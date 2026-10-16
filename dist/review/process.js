"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewProcess = reviewProcess;
exports.privateReviewEnv = privateReviewEnv;
const child_process_1 = require("child_process");
const managed_process_tree_1 = require("../system/managed-process-tree");
const credential_store_1 = require("../core/credential-store");
function reviewProcess(command, args, options) {
    return new Promise((resolve, reject) => {
        if (options.signal?.aborted)
            return reject(new Error('审核已取消'));
        const child = (0, child_process_1.spawn)(command, args, { cwd: options.cwd, env: options.env || process.env, windowsHide: true, shell: false,
            detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '', stderr = '', failed = false;
        const stop = () => { failed = true; if (child.pid)
            void (0, managed_process_tree_1.terminateManagedProcessTree)(child.pid); };
        const timer = setTimeout(stop, options.timeoutMs);
        options.signal?.addEventListener('abort', stop, { once: true });
        const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', stop); };
        child.stdout.on('data', b => { stdout += b.toString(); if (stdout.length > 16 * 1024 * 1024)
            stop(); });
        child.stderr.on('data', b => { stderr = (stderr + b.toString()).slice(-16000); });
        child.on('error', () => { cleanup(); reject(new Error('审核程序启动失败，请检查工具安装')); });
        child.on('close', code => {
            cleanup();
            if (failed)
                reject(new Error(options.signal?.aborted ? '审核已取消' : '审核超时或输出超出预算'));
            else
                resolve({ stdout, stderr: (0, credential_store_1.redactSensitiveText)(stderr), exitCode: code ?? -1 });
        });
        child.stdin.on('error', () => { });
        child.stdin.end(options.input || '');
    });
}
function privateReviewEnv(home) {
    const env = { HOME: home, USERPROFILE: home, OCR_NO_UPDATE: '1', GIT_TERMINAL_PROMPT: '0', NO_COLOR: '1' };
    for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS'])
        if (process.env[key])
            env[key] = process.env[key];
    return env;
}
//# sourceMappingURL=process.js.map