import { TestAgentArtifactManifest } from "./types";
import { TestAgentArtifactVerification } from "./artifact-verifier-core";
export declare function verifyTestAgentArtifactManifest(manifest: TestAgentArtifactManifest, manifestPath?: string): TestAgentArtifactVerification;
export declare function verifyTestAgentArtifactManifestFile(manifestPath: string): TestAgentArtifactVerification;
