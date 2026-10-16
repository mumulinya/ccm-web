import type Database from 'better-sqlite3';
/** Reuse query compilation only. Each all/get still reads committed SQLite
 * state; no rows, authorization decisions or execution gates are cached. */
export declare function taskStoreReadStatement(db: Database.Database, sql: string): Database.Statement;
