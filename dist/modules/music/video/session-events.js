"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishVideoSession = publishVideoSession;
exports.subscribeVideoSession = subscribeVideoSession;
// SSE 只发送现有脱敏会话快照；连接关闭后释放订阅与心跳。
const listeners = new Map();
function publishVideoSession(id) { for (const notify of listeners.get(id) || [])
    notify(); }
function subscribeVideoSession(id, req, res, snapshot) {
    const initial = snapshot(); // 在发送响应头前完成权限校验。
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    const send = () => { try {
        res.write(`event: state\ndata: ${JSON.stringify({ success: true, session: snapshot() })}\n\n`);
    }
    catch {
        res.end();
    } };
    let set = listeners.get(id);
    if (!set) {
        set = new Set();
        listeners.set(id, set);
    }
    set.add(send);
    res.write(`event: state\ndata: ${JSON.stringify({ success: true, session: initial })}\n\n`);
    const heartbeat = setInterval(() => { try {
        snapshot();
        res.write(': heartbeat\n\n');
    }
    catch {
        res.end();
    } }, 15_000);
    res.once('close', () => { clearInterval(heartbeat); set.delete(send); if (!set.size)
        listeners.delete(id); });
}
//# sourceMappingURL=session-events.js.map