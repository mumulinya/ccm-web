"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSourceInquiryContext = createGroupSourceInquiryContext;
exports.groupDelegatedSourceTools = groupDelegatedSourceTools;
const global_source_model_content_1 = require("./global-source-model-content");
const global_source_access_1 = require("./global-source-access");
const trusted = new WeakSet();
function createGroupSourceInquiryContext(run, principal, projectIds) {
    const context = { run, principal, projectIds };
    trusted.add(context);
    return context;
}
function groupDelegatedSourceTools(context) {
    if (!context)
        return null;
    if (!trusted.has(context))
        throw new Error('SOURCE_DELEGATION_CONTEXT_UNTRUSTED');
    return {
        definitions: global_source_model_content_1.GLOBAL_SOURCE_TOOLS.map(name => ({ name, description: '按当前授权成员项目读取源码；搜索仅定位，需读取后核对。', inputSchema: (0, global_source_model_content_1.globalSourceToolSchema)(name) })),
        async execute(requests, signal) {
            const results = [];
            for (const call of requests) {
                if (!global_source_model_content_1.GLOBAL_SOURCE_TOOLS.includes(call.name) || !context.projectIds.includes(call.arguments?.project))
                    throw new Error('SOURCE_GROUP_PROJECT_OUT_OF_SCOPE');
                const observation = await (0, global_source_access_1.executeGlobalSourceTool)(call.name, call.arguments, context.run, context.principal, signal);
                observation.sourceAccess.toolCallId = call.id;
                results.push({ name: call.name, ok: true, rawOutput: (0, global_source_model_content_1.globalSourcePersistence)(observation), output: JSON.stringify((0, global_source_model_content_1.globalSourcePersistence)(observation)), modelOutput: (0, global_source_model_content_1.globalSourceModelPayload)(observation) });
            }
            return results;
        },
    };
}
//# sourceMappingURL=group-delegated-source-tools.js.map