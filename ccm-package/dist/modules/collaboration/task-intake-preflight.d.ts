export declare function buildTaskPreflight(payload: any, req: any): {
    schema: string;
    allowed: boolean;
    requiresConfirmation: boolean;
    target: {
        type: "group" | "project";
        id: string;
        exists: boolean;
        accessible: boolean;
    };
    automationSession: {
        state: string;
        exactSessionId: string;
        bindingRevision: number;
        bindingChecksum: string;
    } | {
        state: string;
        exactSessionId?: undefined;
        bindingRevision?: undefined;
        bindingChecksum?: undefined;
    };
    agent: {
        runtime: any;
        enabled: boolean;
        ready: boolean;
    };
    projectPath: {
        available: boolean;
    };
    workspace: any;
    testAgent: {
        enabled: boolean;
        mode: string;
    };
    template: {
        id: any;
        revision: any;
        rendered: any;
    };
    finalTask: {
        title: string;
        instructions: string;
        priority: string;
        deadlineAt: string;
        dependencyIds: unknown[];
    };
    dependencies: {
        id: any;
        title: any;
        status: any;
        accepted: boolean;
    }[];
    duplicates: {
        id: any;
        title: any;
        status: any;
        createdAt: any;
    }[];
    errors: {
        code: string;
        message: string;
    }[];
    warnings: {
        code: string;
        message: string;
    }[];
    checkedAt: string;
    contentStored: boolean;
};
export declare function handleTaskPreflightApi(pathname: string, req: any, res: any): boolean;
