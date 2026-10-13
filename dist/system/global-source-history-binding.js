"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSourceHistoryBinding = globalSourceHistoryBinding;
const global_agent_run_store_1 = require("../agents/global/global-agent-run-store");
const global_source_model_content_1 = require("./global-source-model-content");
/** The exact final message ID proves provenance; never attach to the nearest answer. */
function globalSourceHistoryBinding(message) {
    const id = String(message?.id || '');
    const match = /^gam_(.+)_assistant$/.exec(id);
    if (message?.role !== 'assistant' || !match)
        return {};
    const run = (0, global_agent_run_store_1.getGlobalAgentRun)(match[1]);
    return run ? { source_access_run_id: run.id, source_access_count: (0, global_source_model_content_1.countGlobalSourceAccess)(run) } : {};
}
//# sourceMappingURL=global-source-history-binding.js.map