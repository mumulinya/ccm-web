"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentFoliaOwner = exports.bindFoliaRequest = exports.withFoliaRequest = void 0;
exports.preserveMusicRequestScope = preserveMusicRequestScope;
const async_hooks_1 = require("async_hooks");
// HTTP 主体在鉴权后读取；异步模型与音源调用沿用同一请求主体。
const scope = new async_hooks_1.AsyncLocalStorage();
const withFoliaRequest = (req, operation) => scope.run(req, operation);
exports.withFoliaRequest = withFoliaRequest;
// IncomingMessage 的 end 事件可能由请求作用域之外的 HTTP 资源触发。
// 显式绑定请求，避免个人媒体的用户身份在读取 POST 主体后退回 workspace。
const bindFoliaRequest = (req, operation) => (function (...args) {
    const receiver = this;
    return (0, exports.withFoliaRequest)(req, () => operation.apply(receiver, args));
});
exports.bindFoliaRequest = bindFoliaRequest;
const currentFoliaOwner = () => String(scope.getStore()?.ccmAuth?.userId || 'workspace');
exports.currentFoliaOwner = currentFoliaOwner;
const boundRequests = new WeakSet();
// 音乐旧路由使用 end 回调；保持当前已鉴权主体，不能在读取 POST 后退回全局主体。
function preserveMusicRequestScope(req) {
    if (boundRequests.has(req))
        return;
    boundRequests.add(req);
    const on = req.on;
    req.on = function (event, listener) { return on.call(this, event, event === 'end' ? (0, exports.bindFoliaRequest)(req, listener) : listener); };
}
//# sourceMappingURL=context.js.map