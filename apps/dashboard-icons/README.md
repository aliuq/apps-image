# Dashboard Icons

> Your definitive source for dashboard icons - A collection of over 1800 curated icons for services, applications and tools

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/dashboard-icons)](https://hub.docker.com/r/aliuq/dashboard-icons)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/dashboard-icons)](https://hub.docker.com/r/aliuq/dashboard-icons)

## 项目信息

- **官方仓库**: [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons)
- **Docker 镜像**: [aliuq/dashboard-icons](https://hub.docker.com/r/aliuq/dashboard-icons)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/blob/master/apps/dashboard-icons/Dockerfile)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name dashboard-icons -p 3000:3000 aliuq/dashboard-icons:latest
# 测试
docker run --rm --name dashboard-icons -p 3000:3000 aliuq/dashboard-icons:latest
```

访问 `http://localhost:3000` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: dashboard-icons
services:
  dashboard-icons:
    image: aliuq/dashboard-icons:latest
    container_name: dashboard-icons
    restart: unless-stopped
    ports:
      - '3000:3000'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🎨 **海量图标**: 提供超过 1800 个精心策划的服务和应用图标
- 🔍 **快速搜索**: 支持按名称、类别快速查找所需图标
- 📦 **多种格式**: 支持 SVG、PNG 等多种格式下载
- 🎯 **专为 Dashboard 设计**: 图标风格统一，特别适合用于控制面板和应用目录
- 🌐 **开源免费**: 基于 Apache-2.0 许可证开源
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🔄 **持续更新**: 定期添加新的应用和服务图标

## 使用场景

- **Home Lab Dashboard**: 为 Homarr、Homepage、Dashy 等主页应用提供统一风格的图标
- **应用目录**: 为自托管服务目录提供专业图标
- **Docker 管理**: 为容器管理界面添加可视化图标
- **服务监控**: 为各类服务监控面板提供清晰的视觉标识

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/dashboard-icons

# 构建镜像
docker buildx build -f ./Dockerfile -t dashboard-icons:local --load .

# 运行测试
docker run --rm --name dashboard-icons-local -p 3000:3000 dashboard-icons:local
```

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t dashboard-icons:debug --load .
```

## 技术栈

- **框架**: Next.js 15+ (React 19)
- **运行环境**: Node.js 20 Alpine
- **构建工具**: Bun
- **包管理**: Turborepo (Monorepo)

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `NODE_ENV` | `production` | 运行环境 |
| `NEXT_TELEMETRY_DISABLED` | `1` | 禁用 Next.js 遥测 |
| `NEXT_PUBLIC_DISABLE_POSTHOG` | `true` | 禁用 PostHog 分析 |

## 相关链接

- [Dashboard Icons 官方网站](https://github.com/homarr-labs/dashboard-icons)
- [Homarr - Dashboard 应用](https://github.com/homarr-labs/homarr)
- [Homepage - 自托管服务主页](https://github.com/gethomepage/homepage)

## 许可证

本项目 Dockerfile 基于 MIT 许可证开源，原项目 Dashboard Icons 基于 Apache-2.0 许可证。

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
