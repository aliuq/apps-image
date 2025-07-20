# Apps Image

> 精选开源应用的 Docker 镜像集合，提供开箱即用的容器化解决方案

[![GitHub](https://img.shields.io/github/license/aliuq/apps-image)](https://github.com/aliuq/apps-image/blob/master/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/aliuq/apps-image)](https://github.com/aliuq/apps-image)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aliuq/apps-image/build-image.yaml)](https://github.com/aliuq/apps-image/actions)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-aliuq-blue)](https://hub.docker.com/u/aliuq)

## 项目简介

本项目致力于为优秀的开源应用提供稳定、安全的 Docker 镜像，所有镜像都经过精心构建和测试，确保在生产环境中的可靠性

## 应用列表

| 应用 | 描述 | 镜像 | 拉取数 | 大小 | 文档 |
|------|------|------|--------|------|------|
| [**Cobalt**](https://github.com/imputnet/cobalt) | 媒体下载器 | [`aliuq/cobalt`](https://hub.docker.com/r/aliuq/cobalt) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/cobalt) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/cobalt) | [README](./apps/cobalt/README.md) |
| [**Icones**](https://github.com/antfu-collective/icones) | 图标浏览器 | [`aliuq/icones`](https://hub.docker.com/r/aliuq/icones) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/icones) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/icones) | [README](./apps/icones/README.md) |
| [**Inpaint Web**](https://github.com/lxfater/inpaint-web) | AI 图像修复 | [`aliuq/inpaint-web`](https://hub.docker.com/r/aliuq/inpaint-web) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/inpaint-web) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/inpaint-web) | [README](./apps/inpaint-web/README.md) |
| [**JSON Hero**](https://github.com/triggerdotdev/jsonhero-web) | JSON 浏览器 | [`aliuq/jsonhero-web`](https://hub.docker.com/r/aliuq/jsonhero-web) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/jsonhero-web) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/jsonhero-web) | [README](./apps/jsonhero-web/README.md) |
| [**Lsky**](https://github.com/lsky-org/lsky-pro) | 图床系统 | [`aliuq/lsky`](https://hub.docker.com/r/aliuq/lsky) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/lsky) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/lsky) | [README](./apps/lsky/README.md) |
| [**Memogram**](https://github.com/usememos/memogram) | Telegram 机器人 | [`aliuq/memogram`](https://hub.docker.com/r/aliuq/memogram) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/memogram) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/memogram) | [README](./apps/memogram/README.md) |
| [**Srcbook**](https://github.com/srcbookdev/srcbook) | TS 笔记本 | [`aliuq/srcbook`](https://hub.docker.com/r/aliuq/srcbook) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/srcbook) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/srcbook) | [README](./apps/srcbook/README.md) |
| [**TG Upload**](https://github.com/Nekmo/telegram-upload) | 文件上传工具 | [`aliuq/telegram-upload`](https://hub.docker.com/r/aliuq/telegram-upload) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/telegram-upload) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/telegram-upload) | [README](./apps/telegram-upload/README.md) |
| [**Telemirror**](https://github.com/khoben/telemirror) | 消息镜像工具 | [`aliuq/telemirror`](https://hub.docker.com/r/aliuq/telemirror) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/telemirror) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/telemirror) | [README](./apps/telemirror/README.md) |
| [**tgcf**](https://github.com/aahnik/tgcf) | 消息转发工具 | [`aliuq/tgcf`](https://hub.docker.com/r/aliuq/tgcf) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/tgcf) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/tgcf) | [README](./apps/tgcf/README.md) |
| [**WeekTodo**](https://github.com/manuelernestog/weektodo) | 任务管理工具 | [`aliuq/weektodo`](https://hub.docker.com/r/aliuq/weektodo) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/weektodo) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/weektodo) | [README](./apps/weektodo/README.md) |
| [**鱼了个鱼**](https://github.com/liyupi/yulegeyu) | 休闲益智游戏 | [`aliuq/yulegeyu`](https://hub.docker.com/r/aliuq/yulegeyu) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/yulegeyu) | ![Image Size](https://img.shields.io/docker/image-size/aliuq/yulegeyu) | [README](./apps/yulegeyu/README.md) |

## 镜像特性

- ✅ **定期更新**: 自动跟踪上游项目更新
- 🔒 **安全可靠**: 基于官方镜像构建，安全扫描通过
- 📦 **体积优化**: 使用多阶段构建，镜像体积小巧
- 🏷️ **标签规范**: 提供 latest 和版本标签
- 📚 **文档完善**: 每个应用都有详细的使用文档

## 构建

本项目使用 GitHub Actions 自动构建和发布 Docker 镜像，支持多架构（amd64, arm64）

### 构建状态

所有镜像的构建状态可以通过上方的 Build Status 徽章查看，或访问 [GitHub Actions](https://github.com/aliuq/apps-image/actions) 页面查看详细信息

### 本地测试

```bash
# 检查单个应用
act --workflows ".github/workflows/check-version.yaml" --input app="cobalt" workflow_dispatch

# 检查所有应用
act --workflows ".github/workflows/check-version.yaml" workflow_dispatch

# 使用 act 测试 GitHub Actions
act --workflows ".github/workflows/build-image.yaml" --job "resolve-docker-metadata" --input context="apps/cobalt" --input debug="true" workflow_dispatch
```

## LICENSE

本项目基于 [MIT License](./LICENSE) 开源
