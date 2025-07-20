# Apps Image

> 精选开源应用的 Docker 镜像集合，提供开箱即用的容器化解决方案

[![GitHub](https://img.shields.io/github/license/aliuq/apps-image)](https://github.com/aliuq/apps-image/blob/master/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/aliuq/apps-image)](https://github.com/aliuq/apps-image)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aliuq/apps-image/build-image.yaml)](https://github.com/aliuq/apps-image/actions)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-aliuq-blue)](https://hub.docker.com/u/aliuq)

## 项目简介

本项目致力于为优秀的开源应用提供稳定、安全的 Docker 镜像，所有镜像都经过精心构建和测试，确保在生产环境中的可靠性

## 应用列表

| 应用名称 | 描述 | Docker 镜像 | 拉取次数 | 镜像大小 | 文档 |
|----------|------|-------------|----------|----------|------|
| **Cobalt** | 媒体下载器，支持多平台视频/音频下载 | [`aliuq/cobalt`](https://hub.docker.com/r/aliuq/cobalt) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/cobalt) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/cobalt) | [README](./apps/cobalt/README.md) |
| **Icones** | 开源图标浏览器，搜索浏览 150,000+ 图标 | [`aliuq/icones`](https://hub.docker.com/r/aliuq/icones) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/icones) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/icones) | [README](./apps/icones/README.md) |
| **Inpaint Web** | AI 图像修复工具，智能去除图片对象 | [`aliuq/inpaint-web`](https://hub.docker.com/r/aliuq/inpaint-web) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/inpaint-web) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/inpaint-web) | [README](./apps/inpaint-web/README.md) |
| **JSON Hero Web** | Web JSON 浏览器，快速浏览和搜索 JSON | [`aliuq/jsonhero-web`](https://hub.docker.com/r/aliuq/jsonhero-web) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/jsonhero-web) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/jsonhero-web) | [README](./apps/jsonhero-web/README.md) |
| **Lsky** | 兰空图床，轻量级图片云存储系统 | [`aliuq/lsky`](https://hub.docker.com/r/aliuq/lsky) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/lsky) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/lsky) | [README](./apps/lsky/README.md) |
| **Memogram** | Memos 的 Telegram 机器人集成 | [`aliuq/memogram`](https://hub.docker.com/r/aliuq/memogram) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/memogram) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/memogram) | [README](./apps/memogram/README.md) |
| **Srcbook** | TypeScript 笔记本，浏览器中运行 TS | [`aliuq/srcbook`](https://hub.docker.com/r/aliuq/srcbook) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/srcbook) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/srcbook) | [README](./apps/srcbook/README.md) |
| **Telegram Upload** | Telegram 文件上传工具，支持大文件分片 | [`aliuq/telegram-upload`](https://hub.docker.com/r/aliuq/telegram-upload) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/telegram-upload) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/telegram-upload) | [README](./apps/telegram-upload/README.md) |
| **Telemirror** | Telegram 消息镜像转发工具 | [`aliuq/telemirror`](https://hub.docker.com/r/aliuq/telemirror) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/telemirror) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/telemirror) | [README](./apps/telemirror/README.md) |
| **tgcf** | Telegram 消息转发和过滤工具 | [`aliuq/tgcf`](https://hub.docker.com/r/aliuq/tgcf) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/tgcf) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/tgcf) | [README](./apps/tgcf/README.md) |
| **WeekTodo** | 每周任务管理工具，高效规划待办事项 | [`aliuq/weektodo`](https://hub.docker.com/r/aliuq/weektodo) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/weektodo) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/weektodo) | [README](./apps/weektodo/README.md) |
| **鱼了个鱼** | 羊了个羊纯前端实现版，休闲益智游戏 | [`aliuq/yulegeyu`](https://hub.docker.com/r/aliuq/yulegeyu) | ![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/yulegeyu) | ![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/yulegeyu) | [README](./apps/yulegeyu/README.md) |

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
