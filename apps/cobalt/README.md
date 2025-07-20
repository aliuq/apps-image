# Cobalt

> 媒体下载器，支持多平台视频/音频下载

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/cobalt)](https://hub.docker.com/r/aliuq/cobalt)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/cobalt)](https://hub.docker.com/r/aliuq/cobalt)

## 项目信息

- **官方仓库**: [imputnet/cobalt](https://github.com/imputnet/cobalt)
- **Docker 镜像**: [`aliuq/cobalt`](https://hub.docker.com/r/aliuq/cobalt)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/blob/master/apps/cobalt/Dockerfile)

## 快速开始

### 使用 Docker Compose

创建 `docker-compose.yml` 文件

```yaml
name: cobalt
services:
  cobalt-api:
    image: ghcr.io/imputnet/cobalt:11.0.1
    restart: always
    container_name: cobalt-api
    ports:
      - 9000:9000
    environment:
      - API_URL=http://localhost:9000

  cobalt-web:
    image: aliuq/cobalt:latest
    restart: always
    container_name: cobalt-web
    ports:
      - 8080:80
    environment:
      - BASE_API=http://localhost:9000
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🎵 支持多平台媒体下载（YouTube, Twitter, TikTok, Instagram 等）
- 🎥 视频和音频格式选择
- 🔗 简单的 URL 粘贴下载
- 📱 响应式设计，支持移动端
- 🚀 快速下载，无需注册
- 🎯 支持高质量格式（最高 8K）

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `BASE_API` | `https://api.cobalt.tools` | Cobalt API 服务地址 |

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/cobalt

# 构建镜像
docker buildx build -f ./Dockerfile -t cobalt:local --load .
```

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t cobalt:debug --load .
```

## 相关链接

- [官方网站](https://cobalt.tools/)
- [文档](https://github.com/imputnet/cobalt/blob/main/docs/api-env-variables.md)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
