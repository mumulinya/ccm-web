"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireVideoTask = acquireVideoTask;
exports.promoteVideoTask = promoteVideoTask;
let running = 0, backgrounds = 0;
const queue = [];
function drain() {
    while (running < 2) {
        const index = queue.findIndex(item => !item.background || backgrounds < 1);
        if (index < 0)
            return;
        const item = queue.splice(index, 1)[0];
        item.signal?.removeEventListener('abort', item.abort);
        running++;
        if (item.background)
            backgrounds++;
        let released = false;
        item.resolve(() => { if (released)
            return; released = true; running--; if (item.background)
            backgrounds--; drain(); });
    }
}
function acquireVideoTask(signal, background = false) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted)
            return reject(Object.assign(new Error('已取消'), { name: 'AbortError' }));
        const item = { resolve, reject, signal, background };
        item.abort = () => { const index = queue.indexOf(item); if (index >= 0)
            queue.splice(index, 1); reject(Object.assign(new Error('已取消'), { name: 'AbortError' })); };
        signal?.addEventListener('abort', item.abort, { once: true });
        if (background)
            queue.push(item);
        else {
            const index = queue.findIndex(row => row.background);
            queue.splice(index < 0 ? queue.length : index, 0, item);
        }
        drain();
    });
}
function promoteVideoTask(signal) {
    const index = queue.findIndex(item => item.signal === signal);
    if (index < 0)
        return;
    const item = queue.splice(index, 1)[0];
    item.background = false;
    queue.unshift(item);
    drain();
}
//# sourceMappingURL=media-task-scheduler.js.map