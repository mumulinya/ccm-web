import type { ReviewJob } from './types';
export declare function newTaskReviewPolicy(task: any): import("./types").ReviewPolicySnapshot;
export declare function startTaskCodeReviewBaseline(task: any, project: string, root: string): void;
export declare function runTaskCodeReview(taskId: string, project: string, root: string, options?: {
    workItemId?: string;
    requestKey?: string;
}): Promise<ReviewJob>;
export declare function codeReviewRepairGaps(job: ReviewJob): string[];
export declare function reviewTaskWithRepair(input: {
    taskId: string;
    project: string;
    root: string;
    workItemId?: string;
    repair?: (round: number, gaps: string[]) => Promise<void>;
}): Promise<ReviewJob>;
export declare function reviewGroupTask(input: any, repair: (project: string, gaps: string[]) => Promise<void>): Promise<void>;
export declare function validateTaskCodeReview(task: any, updates?: any): "任务代码审核策略不可直接替换" | "任务代码审核策略无效" | "当前任务代码审核证据缺失" | "代码审核未通过、已过期或身份不符" | "存在尚未完成代码审核的项目";
