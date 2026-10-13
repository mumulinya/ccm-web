import { DispatchProfile } from "./dispatch-profile";
export declare function renderDispatchReceiptTemplate(profile: DispatchProfile, fullTemplate: string): string;
export declare function dispatchRequiresAck(task: any): boolean;
export declare function dispatchRequiresMemoryReceipt(task: any): boolean;
/** Exempt a declaration requirement; do not invent memory delivery evidence. */
export declare function lightDispatchMemoryReceiptStatus(): {
    schema: string;
    required: boolean;
    pass: boolean;
    profile_exempt: boolean;
    matched_gate_ids: any[];
    snapshot_ids: any[];
    matched_snapshot_ids: any[];
    missing_snapshot_ids: any[];
    task_agent_session_ids: any[];
    rows: any[];
    system_delivery_required: boolean;
    system_delivery_passed: boolean;
    agent_declaration_required: boolean;
    agent_declaration_passed: boolean;
};
