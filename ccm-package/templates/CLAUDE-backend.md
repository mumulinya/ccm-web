# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 飞书协作规则

在回答用户问题前，必须先获取飞书聊天上下文：

1. 使用 `list_chats` 工具获取群聊列表
2. 使用 `get_chat_history` 工具获取最近 20 条消息，了解对话上下文
3. 分析上下文后再回答用户问题

这样可以：
- 了解其他 Agent 之前的回答
- 避免重复工作
- 保持对话连贯性

## 跨 Agent 协作（后端 → 前端）

当你的工作涉及前端页面需要配合修改时，使用以下命令通知前端 Agent：

```
/ask-frontend 接口字段变更说明，需要前端配合修改的内容
```

或中文别名：
```
/前端 接口字段变更说明，需要前端配合修改的内容
```

使用场景：
- 后端接口字段变更，需要前端适配
- 新增/删除接口，需要前端对接
- 数据格式调整，需要前端配合
- Bug 修复涉及前后端联调

你负责的是后端（smart-live-Cloud），前端（smart-live-app）由另一个 Agent 负责。

## Project Overview
**Smart Live (智评生活)** is a microservice-based multi-platform merchant system designed to solve local merchant traffic and user decision-making issues. It includes features like merchant display, AI recommendations, and various management modules (User, Shop, Order, Marketing, etc.).

- **Architecture**: Microservices based on Spring Cloud Alibaba & Spring Boot 3.2.2.
- **Service Discovery/Config**: Nacos (Port 8848)
- **Gateway**: Spring Cloud Gateway (Port 8080)
- **Auth**: JWT + Spring Security (Port 9200)

## Build & Test

### Core Commands
- **Build Entire Project**: `mvn clean install`
- **Run Specific Service**: `mvn spring-boot:run -pl smartLive-modules/smartLive-[module_name]`
- **Run Tests**: `mvn test`
- **Run Single Test Class**: `mvn -Dtest=ClassName test`

### Key Ports
| Service | Module | Port |
|---------|--------|------|
| Gateway | `smartLive-gateway` | 8080 |
| Auth | `smartLive-auth` | 9200 |
| User | `smartLive-modules/smartLive-user` | 9201 |
| System | `smartLive-modules/smartLive-system` | 9202 |
| Shop | `smartLive-modules/smartLive-shop` | 9203 |
| Search | `smartLive-modules/smartLive-search` | 9204 |
| Order | `smartLive-modules/smartLive-order` | 9205 |
| Marketing | `smartLive-modules/smartLive-marketing` | 9206 |
| AI | `smartLive-modules/smartLive-ai` | 9215 |
| Monitor | `smartLive-visual/smartLive-monitor` | 9100 |

## Code Architecture

### Module Structure
- `smartLive-api`: Public API definitions (Feign Clients, DTOs, VOs).
- `smartLive-common`: Shared components (Core, Redis, Security, Datasource, Log, RabbitMQ).
- `smartLive-gateway`: API Gateway handling routing and rate limiting (Sentinel).
- `smartLive-auth`: Authentication center (JWT issuance).
- `smartLive-modules`: Business logic implementations.

### Key Technologies
- **Framework**: Spring Boot 3.2.2, Spring Cloud 2023.0.0, Spring Cloud Alibaba 2023.0.1.0
- **Database**: MySQL, MyBatis Plus 3.5.5
- **Middleware**:
  - **Redis**: Caching
  - **RabbitMQ**: Async messaging
  - **Elasticsearch**: Search engine
  - **MinIO**: Object storage
  - **Seata**: Distributed transactions
  - **Sentinel**: Flow control & circuit breaking
- **Tools**: Lombok, MapStruct, Knife4j (Swagger), Arthas

## Development Conventions

### Coding Style
- **Naming**: CamelCase for Java classes/methods.
- **Response Format**: Use `R<T>` or `AjaxResult` for API responses.
- **Exception Handling**: Global exception handlers in `smartLive-common`.
- **Annotations**: Extensive use of Spring (`@Autowired`, `@Service`, `@RestController`) and Lombok (`@Data`, `@Slf4j`).

### Commit Messages
Format: `type(scope): subject`
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Build/tool updates
