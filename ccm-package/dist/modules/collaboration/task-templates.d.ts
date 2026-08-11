export type TaskTemplateTargetType = "project" | "group";
export interface TaskTemplateVariable {
    key: string;
    label: string;
    required: boolean;
    defaultValue?: string;
}
export interface TaskTemplate {
    schema: "ccm-task-template-v1";
    id: string;
    name: string;
    title: string;
    instructions: string;
    targetType?: TaskTemplateTargetType;
    targetId?: string;
    priority: "low" | "normal" | "high";
    variables: TaskTemplateVariable[];
    createdBy: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
}
export declare function renderTaskTemplate(template: TaskTemplate, values?: Record<string, any>): {
    title: string;
    instructions: string;
    values: Record<string, string>;
    missing: string[];
    valid: boolean;
};
export declare function getTaskTemplate(id: string): TaskTemplate;
export declare function handleTaskTemplateApi(pathname: string, req: any, res: any): boolean;
