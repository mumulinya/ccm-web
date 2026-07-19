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
exports.handleCollaborationApi = void 0;
// Behavior-freeze facade — implementation split into focused modules.
var collaboration_routes_part_04_1 = require("./collaboration-routes-part-04");
Object.defineProperty(exports, "handleCollaborationApi", { enumerable: true, get: function () { return collaboration_routes_part_04_1.handleCollaborationApi; } });
__exportStar(require("./collaboration-routes-part-01"), exports);
__exportStar(require("./collaboration-routes-part-02"), exports);
__exportStar(require("./collaboration-routes-part-03"), exports);
__exportStar(require("./collaboration-routes-part-04"), exports);
//# sourceMappingURL=collaboration-routes.js.map