"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildScopeNavigationSourceManifest = buildScopeNavigationSourceManifest;
const project_main_agent_source_1 = require("../modules/projects/project-main-agent-source");
/** 仅认知生成排除 CCM 本地验收产物、发布输出和运行队列；通用源码工具保持原合同。 */
function buildScopeNavigationSourceManifest(project, workDir) {
    return (0, project_main_agent_source_1.buildProjectSourceManifest)(project, workDir, { excludedRootDirectories: ['scratch', 'ccm-package', '.ccm', '.cc-connect'],
        excludedDirectories: ['.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache'] });
}
//# sourceMappingURL=scope-navigation-source.js.map