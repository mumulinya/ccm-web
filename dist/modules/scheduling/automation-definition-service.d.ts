export declare function listAutomationDefinitions(): any[];
export declare function getAutomationDefinition(id: string): any;
export declare function createAutomationDefinition(input: any): {
    owner_id: string;
    enabled: boolean;
    updated_at: string;
    schema: "ccm-automation-definition-v1";
    definition_id: string;
    revision: number;
    name: string;
    target: {
        type: "project" | "group";
        id: string;
        exact_session_id: string;
    };
    goal: string;
    scope: string;
    prompt: string;
    attachments: any[];
    schedule: string;
    timezone: string;
    execution_policy: import("../collaboration/task-workflow-model").TaskExecutionPolicy;
    notification_policy: any;
    metadata?: any;
    source_snapshot: {
        checksum: string;
        captured_at: string;
    };
    frozen_at: string;
    checksum: string;
};
export declare function updateAutomationDefinition(id: string, updates: any): any;
export declare function deleteAutomationDefinition(id: string): any;
export declare function listAutomationDefinitionRuns(id: string): import("../collaboration/task-run-store").TaskRunRecord[];
export declare function automationDefinitionStorePath(): string;
