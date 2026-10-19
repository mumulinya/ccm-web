# CCM 集成版本版权与来源

CCM 5.0.0 Folia 集成版本以 GNU Affero General Public License version 3 发布，完整许可见 LICENSE。

Folia：https://github.com/chthollyphile/folia-major，v0.7.20，提交 1b39fd868e2ddda95788f1baa839c032f3e7a285。由 v0.7.18 三方合并升级，保留其版权、许可证、依赖许可与来源说明；修改详见 integrations/folia/CCM-INTEGRATION.md。

CCM 原有代码和独立第三方组件的版权声明保持有效，原有 MIT 授权不追溯撤销。音源 API、素材、字体和独立集成的许可随对应组件保留，AGPL 标识不替代第三方权利人的许可。

桌面媒体适配另使用固定依赖：`bodian-music-api@0.1.2`（AGPL-3.0，Mintcolour）、`onnxruntime-node@1.30.0`（MIT）、`electron-store@11.0.2`（MIT）、`koffi@3.3.1`（MIT）、`fflate@0.8.3`（MIT）、`music-metadata@11.16.1`（MIT）、`@xhayper/discord-rpc@1.5.1`（ISC）及 `ws@8.21.3`（MIT）；完整版权与许可保留于对应依赖的 LICENSE/NOTICE。模型仍依上游固定清单声明的各自许可按需安装。壁纸 helper 的来源与许可见 `integrations/folia/packaging/windows/wallpaper-helper/README.md`。

运行版本对应源码在音乐页面“音源与设置 → 集成版本源码”提供；源码包含修改后的 Folia、CCM 代码、接口定义、构建脚本和依赖锁文件。npm 安装用户无需自行构建。

Windows 桌面媒体工具从 FFmpeg 8.1.2 固定源码构建：视频/导出工具 `8.1.2-ccm.1` 使用 GPLv3 配置，音频兼容工具 `8.1.2-ccm.audio.1` 沿用 Folia `v8.1.2-folia.3` 的 LGPL 配方。固定编译工具链、静态依赖及对应源码的来源、大小、SHA-256 和重建说明见 `desktop/packaging/media/`。源码包的 PKGBUILD 与二进制依赖 BUILDINFO 对照校验；FFmpeg、静态链接依赖和运行库的完整对应源码随桌面源码归档 `media/` 交付。各依赖许可证和实际构建/验证记录随工具目录保留；两个工具不替代各组件的许可。beta.6 及更早验收包仍保留其原始预编译工具和来源记录，不代表本轮源码构建产物。壁纸 helper 从固定 v0.7.20 官方安装资产提取，绝不执行该安装器；资产与 helper 哈希见 `desktop/scripts/prepare-folia-helper.mjs`，对应源代码及构建说明保留在 Folia 的 `packaging/windows/wallpaper-helper/`。
