"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskStoreReadStatement = taskStoreReadStatement;
const connections = new WeakMap();
/** Reuse query compilation only. Each all/get still reads committed SQLite
 * state; no rows, authorization decisions or execution gates are cached. */
function taskStoreReadStatement(db, sql) {
    let statements = connections.get(db);
    if (!statements) {
        statements = new Map();
        connections.set(db, statements);
    }
    let statement = statements.get(sql);
    if (!statement) {
        statement = db.prepare(sql);
        if (statements.size >= 32)
            statements.delete(statements.keys().next().value);
        statements.set(sql, statement);
    }
    return statement;
}
//# sourceMappingURL=task-store-read-statements.js.map