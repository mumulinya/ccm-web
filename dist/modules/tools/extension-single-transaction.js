"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingStandaloneMcp = pendingStandaloneMcp;
exports.configureStandaloneTransaction = configureStandaloneTransaction;
const credential_store_1 = require("../../core/credential-store");
const extension_state_1 = require("../../tools/extension-state");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const marketplace_transactions_1 = require("./marketplace-transactions");
function pendingStandaloneMcp(name) {
    const transaction = (0, marketplace_transactions_1.listMarketplaceTransactions)(2000).find(row => row.type === "mcp" && row.name === name && row.action !== "uninstall"
        && ["previewed", "quarantined", "failed", "recovery_required"].includes(row.state) && Date.parse(row.activationExpiresAt) > Date.now());
    return transaction ? (0, credential_store_1.resolveObjectSecrets)(transaction.itemSnapshot) : null;
}
async function configureStandaloneTransaction(id, input, principal) {
    const lock = await (0, atomic_json_file_1.acquireFileLockAsync)(marketplace_transactions_1.MARKETPLACE_ACTIVATION_LOCK_FILE, { timeoutMs: 30_000, staleMs: 10 * 60_000 });
    try {
        const previous = (0, marketplace_transactions_1.readMarketplaceTransaction)(id);
        if (!previous || previous.type !== "mcp" || previous.action === "uninstall" || previous.principal.userId !== principal.userId
            || previous.principal.sessionId !== principal.sessionId || !["previewed", "quarantined", "failed", "recovery_required"].includes(previous.state)
            || Date.parse(previous.activationExpiresAt) <= Date.now())
            throw new Error("连接配置事务无效，请重新预览");
        const item = (0, credential_store_1.resolveObjectSecrets)(previous.itemSnapshot);
        for (const field of ["env", "headers"]) {
            const values = input[field];
            if (values === undefined)
                continue;
            if (!values || typeof values !== "object" || Array.isArray(values) || Object.values(values).some(value => typeof value !== "string"))
                throw new Error("凭据必须为字符串 JSON 对象");
            item[field] = { ...(item[field] || {}), ...values };
        }
        const protectedItem = (0, credential_store_1.protectObjectSecrets)(item, `extension-configure:${previous.id}:${(0, extension_state_1.extensionHash)([item.env, item.headers])}`);
        for (const field of ["env", "headers"])
            if (item[field])
                protectedItem[field] = Object.fromEntries(Object.entries(item[field]).map(([key, value]) => [key, (0, credential_store_1.protectCredential)(`extension-configure:${previous.id}:${field}`, key, value)]));
        const transaction = (0, marketplace_transactions_1.createMarketplaceTransaction)({ ...previous, itemSnapshot: protectedItem,
            materialHash: (0, extension_state_1.extensionHash)({ material: previous.materialHash, env: item.env || {}, headers: item.headers || {} }),
            preview: { ...previous.preview, envKeys: Object.keys(item.env || {}), headerKeys: Object.keys(item.headers || {}) } });
        return { transaction: (0, marketplace_transactions_1.publicMarketplaceTransaction)(transaction), activation_token: (0, marketplace_transactions_1.signMarketplaceActivation)(transaction), requires_activation: true };
    }
    finally {
        (0, atomic_json_file_1.releaseFileLock)(lock);
    }
}
//# sourceMappingURL=extension-single-transaction.js.map