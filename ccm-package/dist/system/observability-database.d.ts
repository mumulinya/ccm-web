export declare const OBSERVABILITY_DATABASE_FILE: string;
export declare function getObservabilityDatabase(): any;
export declare function withImmediateObservabilityTransaction<T>(operation: (db: any) => T): T;
export declare function observabilityMeta(key: string, fallback?: any): any;
export declare function setObservabilityMeta(key: string, value: any): void;
export declare function closeObservabilityDatabaseForTests(): void;
