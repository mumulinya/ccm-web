type Execution = {
    beforeSend: () => void;
    dispatched: (permit: any) => void;
    completed: (row: any) => void;
};
export declare function withScopeNavigationExecution<T>(execution: Execution, operation: () => T): T;
export declare function scopeNavigationBeforeSend(): void;
export declare function scopeNavigationDispatched(permit: any): void;
export declare function scopeNavigationCompleted(row: any): void;
export {};
