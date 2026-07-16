export declare function loadTasksFromSqlite(): any[];
export declare function saveTasksToSqlite(tasks: any[]): {
    total: number;
    inserted: number;
    updated: number;
    deleted: number;
};
export declare function appendTaskLogRecord(taskId: string, entry: any, maxEntries?: number): number;
export declare function getTaskLogRecords(taskId: string, limit?: number): any[];
export declare function clearTaskLogRecords(taskId: string): number;
export declare function loadTaskLogsFromSqlite(): Record<string, any[]>;
export declare function replaceTaskLogsInSqlite(logs: any): void;
export declare function appendGroupLogRecord(groupId: string, entry: any, maxEntries?: number): number;
export declare function loadGroupLogsFromSqlite(): Record<string, any[]>;
export declare function replaceGroupLogsInSqlite(logs: any): void;
export declare function verifySqliteTaskStore(): {
    valid: boolean;
    integrity: string[];
    foreign_key_issues: any[];
};
export declare function getSqliteTaskStoreStatus(): {
    schema: string;
    schema_version: number;
    database_file: string;
    journal_mode: string;
    synchronous: number;
    database_bytes: number;
    wal_bytes: number;
    shm_bytes: number;
    counts: {
        tasks: number;
        task_logs: number;
        group_logs: number;
    };
    migrations: {
        tasks: any;
        task_logs: any;
        group_logs: any;
    };
    integrity: {
        valid: boolean;
        integrity: string[];
        foreign_key_issues: any[];
    };
};
export declare function checkpointSqliteTaskStore(mode?: "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE"): unknown;
export declare function backupSqliteTaskStore(destination?: string): {
    destination: string;
    bytes: number;
    created_at: string;
};
export declare function exportSqliteTaskStore(destination?: string): {
    destination: string;
    files: {
        tasks: string;
        task_logs: string;
        group_logs: string;
    };
    exported_at: string;
};
export declare function restoreSqliteTaskStore(source: string): {
    restored_from: string;
    previous_backup: string;
    status: {
        schema: string;
        schema_version: number;
        database_file: string;
        journal_mode: string;
        synchronous: number;
        database_bytes: number;
        wal_bytes: number;
        shm_bytes: number;
        counts: {
            tasks: number;
            task_logs: number;
            group_logs: number;
        };
        migrations: {
            tasks: any;
            task_logs: any;
            group_logs: any;
        };
        integrity: {
            valid: boolean;
            integrity: string[];
            foreign_key_issues: any[];
        };
    };
};
export declare function closeSqliteTaskStore(): void;
export declare function getSqliteTaskStorePaths(): {
    store_dir: string;
    database_file: string;
    legacy_backup_dir: string;
    database_backup_dir: string;
    export_dir: string;
    legacy_files: {
        tasks: string;
        taskLogs: string;
        groupLogs: string;
    };
};
