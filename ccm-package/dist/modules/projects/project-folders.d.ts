type ProjectFolder = {
    id: string;
    name: string;
    order: number;
    created_at: string;
    updated_at: string;
};
export declare function getProjectFolderState(): {
    schema: "ccm-project-folders-v1";
    folders: ProjectFolder[];
    assignments: {
        [k: string]: string;
    };
    updated_at: string;
};
export declare function updateProjectFolderState(input?: any): {
    schema: "ccm-project-folders-v1";
    folders: ProjectFolder[];
    assignments: {
        [k: string]: string;
    };
    updated_at: string;
    success: boolean;
};
export declare function runProjectFolderSelfTest(): {
    pass: boolean;
    checks: {
        folder_shape_normalized: boolean;
        archived_project_assignment_hidden: boolean;
    };
};
export {};
