"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCollaborationApiIntakeRoutesPartB = exports.handleCollaborationApiIntakeRoutesPartA = void 0;
exports.handleCollaborationApiIntakeRoutes = handleCollaborationApiIntakeRoutes;
// Behavior-freeze facade — implementation split into focused modules.
const collaboration_routes_part_02_part_01_1 = require("./collaboration-routes-part-02-part-01");
Object.defineProperty(exports, "handleCollaborationApiIntakeRoutesPartA", { enumerable: true, get: function () { return collaboration_routes_part_02_part_01_1.handleCollaborationApiIntakeRoutesPartA; } });
const collaboration_routes_part_02_part_02_1 = require("./collaboration-routes-part-02-part-02");
Object.defineProperty(exports, "handleCollaborationApiIntakeRoutesPartB", { enumerable: true, get: function () { return collaboration_routes_part_02_part_02_1.handleCollaborationApiIntakeRoutesPartB; } });
function handleCollaborationApiIntakeRoutes(pathname, req, res, parsed, ctx) {
    if ((0, collaboration_routes_part_02_part_01_1.handleCollaborationApiIntakeRoutesPartA)(pathname, req, res, parsed, ctx))
        return true;
    return (0, collaboration_routes_part_02_part_02_1.handleCollaborationApiIntakeRoutesPartB)(pathname, req, res, parsed, ctx);
}
//# sourceMappingURL=collaboration-routes-part-02.js.map