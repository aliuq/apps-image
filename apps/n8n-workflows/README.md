# N8n Workflows

> n8n 工作流模板集合，提供 4,343+ 个生产就绪的自动化工作流和在线浏览界面

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/n8n-workflows)](https://hub.docker.com/r/aliuq/n8n-workflows)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/n8n-workflows)](https://hub.docker.com/r/aliuq/n8n-workflows)

## 项目信息

- **上游仓库**: [Zie619/n8n-workflows](https://github.com/Zie619/n8n-workflows)
- **Docker 镜像**: [aliuq/n8n-workflows](https://hub.docker.com/r/aliuq/n8n-workflows)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/n8n-workflows)
- **在线体验**: [zie619.github.io/n8n-workflows](https://zie619.github.io/n8n-workflows)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name n8n-workflows -p 8000:8000 aliuq/n8n-workflows:latest
```

访问 `http://localhost:8000` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: n8n-workflows
services:
  n8n-workflows:
    image: aliuq/n8n-workflows:latest
    container_name: n8n-workflows
    restart: unless-stopped
    ports:
      - '8000:8000'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 📊 **4,343+ 工作流**: 涵盖 365+ 种集成服务的生产就绪工作流
- 🔍 **智能搜索**: 基于 SQLite FTS5 的全文搜索，< 100ms 响应时间
- 📂 **15+ 分类**: 按使用场景组织（营销、销售、DevOps 等）
- 📱 **响应式设计**: 完美适配桌面和移动设备
- ⬇️ **直接下载**: 一键获取工作流 JSON 文件
- 🎨 **现代界面**: 支持明暗主题切换
- 🚀 **高性能**: 700 倍性能提升，10 倍更快加载速度

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/n8n-workflows

# 构建镜像
docker buildx build -f ./Dockerfile -t n8n-workflows:local --load .
```

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t n8n-workflows:local --load .

# 运行容器并进入交互模式
docker run -it --rm -p 8000:8000 n8n-workflows:local
```

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
