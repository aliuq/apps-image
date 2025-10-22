# Readest

> 一个现代化的电子书阅读器，提供优雅的阅读体验和强大的书籍管理功能

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/readest)](https://hub.docker.com/r/aliuq/readest)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/readest)](https://hub.docker.com/r/aliuq/readest)

## 项目信息

- **上游仓库**: [readest/readest](https://github.com/readest/readest)
- **Docker 镜像**: [aliuq/readest](https://hub.docker.com/r/aliuq/readest)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/readest)
- **官方网站**: [https://readest.com/](https://readest.com/)
- **在线体验**: [https://web.readest.com/](https://web.readest.com/)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name readest -p 3000:3000 aliuq/readest:latest
# 测试
docker run --rm --name readest -p 3000:3000 aliuq/readest:latest
```

访问 `http://localhost:3000` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件

```yaml
name: readest

services:
  readest:
    image: aliuq/readest:latest
    container_name: readest
    restart: unless-stopped
    ports:
      - '3000:3000'
```

运行服务：

```bash
docker-compose up -d
```

## 配置说明

### 环境变量

- Readest [关于 supabase 的说明](https://github.com/readest/readest/wiki/Supabase-Tables-Schema-for-Sync-API)
- Readest [关于 .env.local 的说明](https://github.com/readest/readest/discussions/1957)

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | N/A | Supabase 数据库配置 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | N/A | Supabase 数据库配置 |
| `NEXT_PUBLIC_STORAGE_FIXED_QUOTA` | 0 | - |
| `NEXT_PUBLIC_API_BASE_URL` | - | - |
| `NEXT_PUBLIC_POSTHOG_KEY` | N/A | 遥测数据收集 |
| `NEXT_PUBLIC_POSTHOG_HOST` | N/A | 遥测数据收集 |
| `NEXT_PUBLIC_OBJECT_STORAGE_TYPE` | - | 存储类型，r2, s3 |

### 额外说明

关于客户端环境使用到的变量(`NEXT_PUBLIC_`)，有必要说明一下，官方使用的方式，并不适合容器化部署，原因是环境变量在构建镜像的过程中被硬编码到输出目录 `.next` 下的 js 文件中，导致无法在运行时动态修改

1. 如果通过 `.env.local` 和 `.env.web` 设置的变量，会在构建(`next build`)时硬编码到输出目录，这不适合容器化方式部署
2. 如果通过 `environment` 传入的变量，**不会** 被硬编码到输出目录，但这只适合服务端使用的变量，客户端由于在构建的时候变量不存在，所以会是空值，这会导致一种情况，客户端和服务端使用了不同的配置，且无法修改客户端配置

为了解决这个问题，镜像在构建时将上面的7个变量设置为环境变量占位符，然后在构建完成后，使用 `envsubst` 将输出目录 `.next` 下的 js 文件中的占位符替换为环境变量的值，从而实现运行时动态配置。**但可能随着时间的推移，官方增加或删除某些变量，导致部分失效，如果你有发现问题，请在 issue 中反馈**

只有需要在客户端使用的变量，才需要进行处理，服务端使用的变量使用 `environment` 传入即可，不需要进行占位符替换

#### 遥测数据收集

官方默认使用了 `posthog` 进行用户行为分析，镜像在构建的时候保留了官方配置，但允许通过环境变量设置，在启动应用的时候进行动态覆盖

如果你不想被收集，请将 `NEXT_PUBLIC_POSTHOG_KEY` 设置为**任意不为空的值**，例如 `your_posthog_key`，这将导致调用 `posthog.init` 时传入一个无效的 key，从而禁用数据收集

#### Supabase 配置

自托管 Supabase 不是一个明智的行为，但是你可以使用自己的 Supabase 实例来存储数据，具体的数据库 schema 请参考[上游文档](https://github.com/readest/readest/wiki/Supabase-Tables-Schema-for-Sync-API)

**建议只在固定某个 readest 镜像版本时使用**

## 功能特性

- 📖 **多格式支持**: 支持 EPUB、PDF、MOBI、TXT 等多种电子书格式
- 📱 **响应式设计**: 完美适配桌面、平板和手机设备
- 🎨 **自定义主题**: 支持亮色/暗色主题和字体大小调节
- 📊 **阅读进度**: 自动保存阅读进度和书签
- 🔍 **搜索功能**: 支持全文搜索和书籍管理
- 💾 **本地存储**: 支持本地文件上传和在线书库
- 🔖 **笔记标注**: 支持添加笔记、高亮和书签功能

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/readest

# 构建镜像
docker buildx build -f ./Dockerfile -t readest:local --load .

# 运行测试
docker run --rm --name readest-local -p 3000:3000 readest:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t readest:debug --load .
```

### 重要更新日志

- `0.9.88`
  - 基于 Readest v0.9.88 构建
  - 修复环境变量替换问题
  - 优化 Dockerfile 构建过程
  - 删除 `USE_DEFAULT` 环境变量相关内容

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
