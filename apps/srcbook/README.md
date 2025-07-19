# Srcbook

> 一个开源的 TypeScript 笔记本，在浏览器中运行 TypeScript，提供交互式开发体验

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/srcbook)](https://hub.docker.com/r/aliuq/srcbook)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/srcbook)](https://hub.docker.com/r/aliuq/srcbook)

## 项目信息

- **上游仓库**: [srcbookdev/srcbook](https://github.com/srcbookdev/srcbook)
- **Docker 镜像**: [aliuq/srcbook](https://hub.docker.com/r/aliuq/srcbook)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/srcbook)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name srcbook -p 2150:2150 aliuq/srcbook:latest
# 挂载目录
docker run -d --name srcbook -v ./srcbook-data:/srcbook -p 2150:2150 aliuq/srcbook:latest
# 测试
docker run --rm --name srcbook -p 2150:2150 aliuq/srcbook:latest
```

访问 `http://localhost:2150` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件

```yaml
name: srcbook
services:
  srcbook:
    image: aliuq/srcbook:latest
    container_name: srcbook
    restart: unless-stopped
    ports:
      - '2150:2150'
    volumes:
      - ./srcbook-data:/srcbook
```

运行服务

```bash
docker-compose up -d
```

## 功能特性

- 📝 **TypeScript 笔记本**: 在浏览器中运行 TypeScript 代码
- ⚡  **实时执行**: 即时运行代码块并查看结果
- 📊 **数据可视化**: 支持图表和数据展示
- 🔄 **热重载**: 代码修改即时生效
- 💾 **数据持久化**: 自动保存笔记本和执行结果
- 🎨 **现代界面**: 清晰直观的用户界面
- 🔗 **模块支持**: 支持 npm 包和模块导入

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/srcbook

# 构建镜像
docker buildx build -f ./Dockerfile -t srcbook:local --load .

# 运行测试
docker run --rm --name srcbook-local -p 2150:2150 srcbook:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t srcbook:debug --no-cache --load .
```

## 相关链接

- [Srcbook 官网](https://srcbook.com/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈。
