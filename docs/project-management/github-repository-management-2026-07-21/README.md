# GitHub 仓库项目管理

## 目标

项目创建和编辑不再只接受一个已存在的本地目录。用户可以直接从 GitHub 仓库创建项目，也可以在编辑项目时查看和维护当前目录的 GitHub `origin`。

## 创建项目

“新建项目”提供两种来源：

- 本地目录：沿用原有流程，目录必须已经存在。
- GitHub 仓库：填写 HTTPS 或 SSH 地址、可选分支和本机克隆目标目录；服务端执行 `git clone`，成功后才创建项目配置。

GitHub 地址只接受 `github.com/<owner>/<repository>`，支持：

- `https://github.com/owner/repository.git`
- `git@github.com:owner/repository.git`

克隆目录必须是绝对路径，上级目录必须存在，目标目录只能不存在或为空。分支名经过独立校验，Git 命令不经过 shell 拼接。

## 编辑项目

“编辑项目”会实时读取当前代码目录的 Git 状态：

- 当前分支和 upstream。
- ahead / behind 数量。
- 未提交文件和未跟踪文件数量。
- 最近一次提交。
- 当前 `origin` 及可打开的 GitHub 网页地址。

非 Git 目录可以显式勾选“保存时初始化 Git 仓库”。修改 `origin` 失败时不会覆盖项目基础配置；没有主动修改仓库字段时，也不会改动已有 Git 配置。

## 凭据与边界

- CCM 不保存 GitHub Token、账号或密码。
- HTTPS 私有仓库复用本机 Git Credential Manager；SSH 仓库复用本机 SSH key。
- 即使历史 `origin` 含嵌入式凭据，状态接口也会先剥离凭据，再返回页面或保存项目元数据。
- 当前界面不提供 `push`、强制拉取、删除分支或删除仓库等高风险操作。
- 克隆失败时不创建项目配置，也不会递归删除 Git 已经写入的目录，便于用户检查失败现场。

## 接口

- `POST /api/projects/create`：新增 `source_type`、`repository_url`、`repository_branch`。
- `POST /api/projects/update`：新增 `repository_url`、`initialize_repository`。
- `GET /api/projects/git-status?project=<name>`：按已注册项目读取实时 Git 状态。

仓库元数据写入现有 `project-configs.json`，只记录 provider、脱敏 remote、分支和最近同步时间，不建立第二套仓库配置来源。

## 验证

- `npm run test:project-github-management`：21 项本地 Git、URL 安全、仓库初始化和 `origin` 更新检查；测试仓库位于系统临时目录，不继承当前工作仓库，网络 Git 操作为 0。
- `npm run test:project-management-render`：9 项桌面与移动端项目页面回归，覆盖 GitHub 创建模式和编辑状态展示。
- Backend 与 Frontend production build 通过。
- 测试不调用付费模型，也不连接或修改真实 GitHub 仓库。
