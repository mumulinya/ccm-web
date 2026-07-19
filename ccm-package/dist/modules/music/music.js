"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMusicRemoteCommandQueueSelfTest = exports.runMusicAgentIntentSelfTest = exports.handleMusicApiPartB = exports.handleMusicApiPartA = void 0;
exports.handleMusicApi = handleMusicApi;
// Behavior-freeze facade — implementation split into focused modules.
const music_part_01_1 = require("./music-part-01");
Object.defineProperty(exports, "handleMusicApiPartA", { enumerable: true, get: function () { return music_part_01_1.handleMusicApiPartA; } });
const music_part_02_1 = require("./music-part-02");
Object.defineProperty(exports, "handleMusicApiPartB", { enumerable: true, get: function () { return music_part_02_1.handleMusicApiPartB; } });
var agent_1 = require("./agent");
Object.defineProperty(exports, "runMusicAgentIntentSelfTest", { enumerable: true, get: function () { return agent_1.runMusicAgentIntentSelfTest; } });
var state_1 = require("./state");
Object.defineProperty(exports, "runMusicRemoteCommandQueueSelfTest", { enumerable: true, get: function () { return state_1.runMusicRemoteCommandQueueSelfTest; } });
function handleMusicApi(pathname, req, res, parsed, ctx) {
    if ((0, music_part_01_1.handleMusicApiPartA)(pathname, req, res, parsed, ctx))
        return true;
    return (0, music_part_02_1.handleMusicApiPartB)(pathname, req, res, parsed, ctx);
}
//# sourceMappingURL=music.js.map