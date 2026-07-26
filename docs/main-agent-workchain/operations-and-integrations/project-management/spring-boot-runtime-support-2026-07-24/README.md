# Spring Boot 项目运行支持

Date: 2026-07-24

Status: Implemented

## 问题

项目运行工作台原先只根据 `pom.xml` 当前模块是否直接声明 `spring-boot-maven-plugin` 或 `mainClass` 判断能否启动。真实多模块 Spring Boot 项目经常在父 POM 统一声明插件，子模块只保留启动类，因此会被误判成只能打包。没有显式默认配置时，页面还会选择列表第一项，通常是没有启动命令的父聚合 POM。

Windows 上的 `mvn`、`gradle` 实际通常是 `.cmd` 或 `.bat`，源码运行器也需要通过受控 Shell 调用；此前仅 Wrapper 和 Node 包管理器启用该兼容行为。子进程环境还没有明确继承 Java 与 Maven/Gradle 工具链目录。

## 当前流程

```text
扫描 pom.xml / build.gradle
-> 检查插件、mainClass 和 src/main 下真实 @SpringBootApplication
-> 聚合 POM 标记为“仅构建”
-> Spring Boot 模块生成独立启动和打包配置
-> 没有用户默认项时选择第一个可启动配置
-> 用户可在下拉框切换其他服务并独立启动
```

- Maven 构建使用 `-pl <module> -am` 构建目标及依赖；启动使用 `-f <module>/pom.xml spring-boot:run`，确保运行目标只作用于真实 Spring Boot 模块，不会把启动 Goal 施加到父聚合 POM。
- Gradle 子模块使用精确任务路径和 `bootRun`。
- 下拉项明确显示“可启动”或“仅构建”。
- 用户显式选择的有效默认配置继续优先；只有缺失或失效时才自动推荐。
- 重新扫描会更新未被用户修改过的自动探测配置，手动配置和用户改过的命令保持不变。
- Windows 对 `mvn/mvnw/gradle/gradlew` 使用经过安全解析的 Shell 调用，仍禁止拼接符、命令替换和目录越界。
- 子进程继承 `JAVA_HOME`、`JDK_HOME`、`MAVEN_HOME`、`M2_HOME` 和 `GRADLE_HOME`，不会继承凭据或无关环境变量。

## 真实项目验收

`smart-live-Cloud` 重新扫描结果：

- Maven 配置：`24`
- 可启动 Spring Boot 服务：`19`
- 默认配置：`smartLive-auth · Spring Boot`
- 默认启动命令：`mvn -f smartLive-auth/pom.xml spring-boot:run`
- 本机 Maven：`3.9.5`
- 本机 JDK：`17.0.1`

首次静态验收没有启动真实业务服务，也没有安装依赖。

后续真实启动复现发现，`-pl <module> -am spring-boot:run` 会先在父聚合 POM 上执行 Spring Boot Goal，并以“找不到主类”失败。修正后以 `smartLive-ai` 做了限时探针，Maven 成功进入应用启动阶段；探针运行 18 秒后已主动停止。项目日志提示本机 Nacos `127.0.0.1:8848/9848` 未运行，以及 Tomcat Native 版本不匹配，这些属于项目依赖环境，不再是 CCM 命令路由错误。

后续对 `nova-erp-server` 的真实验收还覆盖了本地 SNAPSHOT/BOM、根 POM 排除模块和 `${revision}` 父版本。CCM 完成受控依赖恢复后，应用真实输出 `Started YudaoServerApplication in 16.842 seconds` 并监听 `48080`。实时日志和恢复细节见 [IDEA 风格运行控制台与 Maven 自动恢复](../idea-run-console-and-maven-recovery-2026-07-24/README.md)。

## 回归

- `npm run check`
- `npm run build`
- `node scripts/project-runtime-workbench-selftest.mjs`
- `npm run test:integrations -- --no-build`
- `npm run docs:check`

自测覆盖继承父插件的 Spring Boot 子模块、聚合 POM 仅构建、默认可运行配置、Windows Maven Shell、Java 工具链环境、并行进程、精确停止、重启和真实构建产物。付费 Provider 调用为 `0`。
