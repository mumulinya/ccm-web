"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withScopeNavigationExecution = withScopeNavigationExecution;
exports.scopeNavigationBeforeSend = scopeNavigationBeforeSend;
exports.scopeNavigationDispatched = scopeNavigationDispatched;
exports.scopeNavigationCompleted = scopeNavigationCompleted;
const async_hooks_1 = require("async_hooks");
const context = new async_hooks_1.AsyncLocalStorage();
function withScopeNavigationExecution(execution, operation) { return context.run(execution, operation); }
function scopeNavigationBeforeSend() { context.getStore()?.beforeSend(); }
function scopeNavigationDispatched(permit) { context.getStore()?.dispatched(permit); }
function scopeNavigationCompleted(row) { context.getStore()?.completed(row); }
//# sourceMappingURL=scope-navigation-execution.js.map