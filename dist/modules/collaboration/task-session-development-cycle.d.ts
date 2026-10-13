export declare function validateTaskDevelopmentCycleTransition(task: any, updates: any, source: string): boolean;
/** An explicit follow-up starts a new execution; a terminal Run never reopens. */
export declare function taskSessionDevelopmentCycle(task: any, source: string, currentlyRunning: boolean, proposed?: any): {};
