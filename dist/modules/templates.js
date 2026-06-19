"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTemplatesApi = handleTemplatesApi;
const utils_1 = require("../utils");
const db_1 = require("../db");
function getDefaultTemplates() {
    return [
        {
            id: "tpl_frontend_dev",
            name: "前端功能开发",
            category: "development",
            description: "开发新的前端页面或组件",
            icon: "🎨",
            prompt: "请帮我开发一个前端功能：\n\n功能描述：\n- 页面名称：{页面名称}\n- 主要功能：{主要功能描述}\n- UI 要求：{UI与样式要求}\n\n技术要求：\n- 使用 Vue 3 + Vite\n- 响应式设计\n\n请先分析需求，然后逐步实现。",
            tags: ["前端", "Vue", "组件"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_backend_api",
            name: "后端接口开发",
            category: "development",
            description: "开发新的后端 API 接口",
            icon: "🔌",
            prompt: "请帮我开发后端接口：\n\n接口信息：\n- 接口路径：{接口路径}\n- 请求方法：{请求方法GET_POST等}\n- 请求参数：{请求参数结构}\n- 返回数据格式：{返回格式}\n\n业务逻辑：\n- {业务逻辑描述}\n\n请按照项目规范实现接口。",
            tags: ["后端", "API", "NodeJS"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_bug_fix",
            name: "Bug 修复",
            category: "maintenance",
            description: "定位和修复代码中的 Bug",
            icon: "🐛",
            prompt: "请帮我修复这个 Bug：\n\n问题描述：\n- 现象：{Bug现象}\n- 期望行为：{期望行为}\n- 复现步骤：{复现步骤}\n\n错误信息：{错误日志与堆栈}\n\n相关代码：{相关代码片段}\n\n请分析问题原因并提供修复方案。",
            tags: ["Bug", "修复", "调试"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_code_review",
            name: "代码审查",
            category: "review",
            description: "审查代码质量和潜在问题",
            icon: "🔍",
            prompt: "请帮我审查以下代码：\n\n代码文件：{文件路径或代码内容}\n\n审查重点：\n1. 代码质量和规范\n2. 潜在的 Bug\n3. 性能问题\n4. 安全隐患\n5. 可维护性\n\n请给出具体的改进建议。",
            tags: ["审查", "质量", "优化"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_api_integration",
            name: "前后端联调",
            category: "collaboration",
            description: "前后端接口对接和联调",
            icon: "🔗",
            prompt: "请帮我完成前后端联调：\n\n接口信息：\n- 接口名称：{接口名称}\n- 后端地址：{后端服务地址}\n- 接口文档：{接口定义或文档说明}\n\n前端需求：\n- 页面功能：{前端页面逻辑}\n- 数据展示：{数据绑定说明}\n\n请：\n1. 检查接口文档\n2. 实现前端调用代码\n3. 处理数据格式转换\n4. 添加错误处理",
            tags: ["联调", "接口", "协作"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_refactor",
            name: "代码重构",
            category: "maintenance",
            description: "重构和优化现有代码",
            icon: "⚡",
            prompt: "请帮我重构以下代码：\n\n代码文件：{需要重构的代码}\n\n重构目标：\n- 提高代码可读性\n- 减少重复代码\n- 优化性能\n- 遵循最佳实践\n\n请提供重构方案 and 具体实现。",
            tags: ["重构", "优化", "代码质量"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_feature_plan",
            name: "功能规划",
            category: "planning",
            description: "规划新功能的实现方案",
            icon: "📋",
            prompt: "请帮我规划这个功能的实现方案：\n\n功能描述：{功能设计描述}\n\n需求细节：{需求细节与用例}\n\n请提供：\n1. 技术方案设计\n2. 实现步骤\n3. 预估工作量\n4. 潜在风险\n5. 测试要点",
            tags: ["规划", "设计", "方案"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_database",
            name: "数据库操作",
            category: "development",
            description: "数据库表设计和 SQL 操作",
            icon: "🗄️",
            prompt: "请帮我完成数据库相关工作：\n\n需求描述：{数据库变动需求}\n\n请提供：\n1. 表结构设计（如需要）\n2. SQL 语句\n3. 索引建议\n4. 数据迁移方案（如需要）",
            tags: ["数据库", "SQL", "设计"],
            created_at: new Date().toISOString()
        }
    ];
}
function getActiveTemplates() {
    const templates = (0, db_1.loadTemplates)();
    const defaultTemplates = getDefaultTemplates();
    if (templates.length === 0) {
        return defaultTemplates;
    }
    // Smart merge: Map over code-level default templates, preserving user modifications
    const mergedTemplates = defaultTemplates.map((defaultTpl) => {
        const localTpl = templates.find((t) => t.id === defaultTpl.id);
        if (!localTpl) {
            return defaultTpl;
        }
        // If the user has explicitly edited this system template (updated_at exists)
        // or if the local version is already migrated to the variable structure (contains '{')
        // then we preserve the user's edits.
        if (localTpl.updated_at || localTpl.prompt.includes("{")) {
            return localTpl;
        }
        // Otherwise, it's a legacy plain-text system template. Upgrade it.
        return defaultTpl;
    });
    // Filter out custom templates (IDs not matching any default templates)
    const customTemplates = templates.filter((t) => !defaultTemplates.some((d) => d.id === t.id));
    return [...mergedTemplates, ...customTemplates];
}
function createTemplate(template) {
    const templates = getActiveTemplates();
    const newTemplate = {
        id: "tpl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: template.name,
        category: template.category || "custom",
        description: template.description || "",
        icon: template.icon || "📝",
        prompt: template.prompt,
        tags: template.tags || [],
        created_at: new Date().toISOString()
    };
    templates.push(newTemplate);
    (0, db_1.saveTemplates)(templates);
    return newTemplate;
}
function updateTemplate(id, updates) {
    const templates = getActiveTemplates();
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    Object.assign(templates[idx], updates, { updated_at: new Date().toISOString() });
    (0, db_1.saveTemplates)(templates);
    return templates[idx];
}
function deleteTemplate(id) {
    const templates = getActiveTemplates().filter(t => t.id !== id);
    (0, db_1.saveTemplates)(templates);
}
// === 模板 API 路由路由分流 ===
function handleTemplatesApi(pathname, req, res, parsed) {
    // 1. 获取所有模板
    if (pathname === "/api/templates" && req.method === "GET") {
        const category = parsed.query.category;
        let templates = getActiveTemplates();
        if (category) {
            templates = templates.filter(t => t.category === category);
        }
        (0, utils_1.sendJson)(res, { templates });
        return true;
    }
    // 2. 获取模板分类
    if (pathname === "/api/templates/categories" && req.method === "GET") {
        const categories = [
            { id: "development", name: "开发", icon: "💻" },
            { id: "maintenance", name: "维护", icon: "🔧" },
            { id: "review", name: "审查", icon: "🔍" },
            { id: "collaboration", name: "协作", icon: "🤝" },
            { id: "planning", name: "规划", icon: "📋" },
            { id: "custom", name: "自定义", icon: "✏️" }
        ];
        (0, utils_1.sendJson)(res, { categories });
        return true;
    }
    // 3. 获取单个模板
    if (pathname.match(/^\/api\/templates\/[\w-]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop() || "";
        const templates = getActiveTemplates();
        const template = templates.find(t => t.id === id);
        if (!template) {
            (0, utils_1.sendJson)(res, { error: "模板不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { template });
        return true;
    }
    // 4. 创建模板
    if (pathname === "/api/templates" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const template = createTemplate(JSON.parse(body));
                (0, utils_1.sendJson)(res, { success: true, template });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 5. 更新模板
    if (pathname.match(/^\/api\/templates\/[\w-]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop() || "";
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const template = updateTemplate(id, JSON.parse(body));
                if (!template) {
                    return (0, utils_1.sendJson)(res, { error: "模板不存在" }, 404);
                }
                (0, utils_1.sendJson)(res, { success: true, template });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 6. 删除模板
    if (pathname.match(/^\/api\/templates\/[\w-]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop() || "";
        deleteTemplate(id);
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
    return false;
}
//# sourceMappingURL=templates.js.map