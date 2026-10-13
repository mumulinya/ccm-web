"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptanceLedgerForNewCycle = acceptanceLedgerForNewCycle;
const db_1 = require("../core/db");
const acceptance_contract_1 = require("./acceptance-contract");
/** Rotate only a contract compiled for the authoritative, explicitly opened
 * new task cycle. Previous observations never count toward this contract. */
function acceptanceLedgerForNewCycle(old, contract) {
    const task = (0, db_1.getTaskById)(contract.taskId);
    const current = (0, acceptance_contract_1.taskAcceptanceContract)(task);
    const preserved = task?.delivery_history?.some((row) => (0, acceptance_contract_1.taskAcceptanceContract)(row)?.checksum === old.contract.checksum);
    if (!task?.task_session_boundary_version || !task.task_session_continuation_context?.session_id
        || !preserved || current?.checksum !== contract.checksum
        || Number(task.generation) !== Number(contract.generation)
        || Number(contract.generation) <= Number(old.contract.generation)) {
        throw new Error("acceptance_contract_revision_requires_new_generation");
    }
    return { contract: JSON.parse(JSON.stringify(contract)), executions: [], observations: [],
        history: [...(old.history || []), { contract: old.contract, executions: old.executions, observations: old.observations }] };
}
//# sourceMappingURL=acceptance-ledger-cycle.js.map