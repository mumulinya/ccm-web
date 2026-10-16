"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentFoliaOwner = exports.bindFoliaRequest = exports.withFoliaRequest = void 0;
const async_hooks_1 = require("async_hooks");
// HTTP 主体在鉴权后读取；异步模型与音源调用沿用同一请求主体。
const scope = new async_hooks_1.AsyncLocalStorage();
const withFoliaRequest = (req, operation) => scope.run(req, operation);
exports.withFoliaRequest = withFoliaRequest;
// IncomingMessage 的 end 事件可能由请求作用域之外的 HTTP 资源触发。
// 显式绑定请求，避免个人媒体的用户身份在读取 POST 主体后退回 workspace。
const bindFoliaRequest = (req, operation) => ((...args) => (0, exports.withFoliaRequest)(req, () => operation(...args)));
exports.bindFoliaRequest = bindFoliaRequest;
const currentFoliaOwner = () => String(scope.getStore()?.ccmAuth?.userId || 'workspace');
exports.currentFoliaOwner = currentFoliaOwner;
//# sourceMappingURL=context.js.map