import type { GlobalAgentToolRisk } from "./loop";
type ToolDecision = {
    name?: string;
    arguments?: any;
} | null | undefined;
type ToolSpec = {
    name: string;
    risk: GlobalAgentToolRisk | ((args: any) => GlobalAgentToolRisk);
};
export declare function globalPlanModeWouldCauseSideEffect(input: {
    tool?: ToolDecision;
    workflowActionRequired?: boolean;
    toolSpecs: ToolSpec[];
}): boolean;
export declare function runGlobalAgentPlanModeSelfTest(): {
    pass: boolean;
    checks: {
        readToolAllowed: boolean;
        writeToolBlocked: boolean;
        unknownToolClosed: boolean;
        directActionBlocked: boolean;
        holdClearsDispatch: boolean;
        holdClearsProjectDelegate: boolean;
        readToolsPass: boolean;
        writeToolsHeld: boolean;
        unknownToolsHeld: boolean;
        disabledDoesNotHold: boolean;
        readToolOpen: boolean;
        groupSessionWins: boolean;
        projectIdentityResolved: boolean;
    };
};
export {};
