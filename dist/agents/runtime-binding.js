"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRuntimeBinding = exports.replaceRuntimeSession = exports.listRuntimeBindings = exports.bindRuntimeSession = void 0;
/** Runtime binding facade. Third-party sessions remain replaceable execution backends. */
var execution_session_registry_1 = require("./execution-session-registry");
Object.defineProperty(exports, "bindRuntimeSession", { enumerable: true, get: function () { return execution_session_registry_1.bindRuntimeSession; } });
Object.defineProperty(exports, "listRuntimeBindings", { enumerable: true, get: function () { return execution_session_registry_1.listRuntimeBindings; } });
Object.defineProperty(exports, "replaceRuntimeSession", { enumerable: true, get: function () { return execution_session_registry_1.replaceRuntimeSession; } });
Object.defineProperty(exports, "updateRuntimeBinding", { enumerable: true, get: function () { return execution_session_registry_1.updateRuntimeBinding; } });
//# sourceMappingURL=runtime-binding.js.map