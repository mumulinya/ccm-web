"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryManagedProcessesAsync = queryManagedProcessesAsync;
const child_process_1 = require("child_process");
const performance_monitor_1 = require("../../system/performance-monitor");
let inFlight = null;
function queryManagedProcessesAsync() {
    if (inFlight)
        return inFlight;
    inFlight = (0, performance_monitor_1.measureAsyncPerformance)('background.process_inventory', () => new Promise(resolve => {
        const windows = process.platform === 'win32';
        const command = windows ? 'powershell.exe' : 'ps';
        const args = windows ? ['-NoProfile', '-NonInteractive', '-Command',
            'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress'] : ['-eo', 'pid=,ppid=,args='];
        (0, child_process_1.execFile)(command, args, { encoding: 'utf8', windowsHide: true, timeout: 8000, maxBuffer: 8 * 1024 * 1024 }, (error, raw) => {
            if (error) {
                resolve([]);
                return;
            }
            try {
                if (windows) {
                    const parsed = raw.trim() ? JSON.parse(raw) : [];
                    resolve((Array.isArray(parsed) ? parsed : [parsed]).map(row => ({ pid: Number(row.ProcessId || 0), parentPid: Number(row.ParentProcessId || 0), commandLine: String(row.CommandLine || '') })).filter(row => row.pid > 0 && !!row.commandLine));
                }
                else
                    resolve(raw.split(/\r?\n/).flatMap(line => {
                        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
                        return match ? [{ pid: Number(match[1]), parentPid: Number(match[2]), commandLine: match[3] }] : [];
                    }));
            }
            catch {
                resolve([]);
            }
        });
    })).finally(() => { inFlight = null; });
    return inFlight;
}
//# sourceMappingURL=managed-process-query.js.map