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
docker run --rm --name readest -p 3000:3000 -e USE_DEFAULT=true aliuq/readest:latest
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
docker run --rm --name readest-local -p 3000:3000 -e USE_DEFAULT=true readest:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t readest:debug --load .
```

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
