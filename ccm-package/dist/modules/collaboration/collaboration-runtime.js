"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Behavior-freeze facade — implementation split into focused modules.
__exportStar(require("./collaboration-runtime-task-queue"), exports);
__exportStar(require("./collaboration-runtime-status-helpers"), exports);
__exportStar(require("./collaboration-runtime-daily-dev"), exports);
__exportStar(require("./collaboration-runtime-cross-agent-runtime"), exports);
__exportStar(require("./collaboration-runtime-test-agent-handoff"), exports);
__exportStar(require("./collaboration-runtime-coordinator-review"), exports);
__exportStar(require("./collaboration-runtime-plan-tools"), exports);
__exportStar(require("./collaboration-runtime-runtime-tools"), exports);
__exportStar(require("./collaboration-runtime-task-ops"), exports);
//# sourceMappingURL=collaboration-runtime.js.map