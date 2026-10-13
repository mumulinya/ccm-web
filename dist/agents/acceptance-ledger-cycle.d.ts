/** Rotate only a contract compiled for the authoritative, explicitly opened
 * new task cycle. Previous observations never count toward this contract. */
export declare function acceptanceLedgerForNewCycle(old: any, contract: any): {
    contract: any;
    executions: any[];
    observations: any[];
    history: any[];
};
