export declare function runGlobalAgentPlanModeSelfTest(): {
    pass: boolean;
    checks: {
        globalHasNoConversationPlanMode: boolean;
        groupKeepsConversationPlanMode: boolean;
        projectKeepsConversationPlanMode: boolean;
        holdClearsDispatch: boolean;
        holdClearsProjectDelegate: boolean;
        readToolsPass: boolean;
        writeToolsHeld: boolean;
        unknownToolsHeld: boolean;
        disabledDoesNotHold: boolean;
        unknownToolClosed: boolean;
        readToolOpen: boolean;
        groupSessionWins: boolean;
        projectIdentityResolved: boolean;
        agentModeKeepsModelPlan: boolean;
        manualPlanStillPresentsPlan: boolean;
    };
};
