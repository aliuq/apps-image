# Inpaint Web

> 基于 Web 的免费开源图像修复工具，使用 AI 技术智能去除图片中的不需要对象

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/inpaint-web)](https://hub.docker.com/r/aliuq/inpaint-web)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/inpaint-web)](https://hub.docker.com/r/aliuq/inpaint-web)

## 项目信息

- **上游仓库**: [lxfater/inpaint-web](https://github.com/lxfater/inpaint-web)
- **Docker 镜像**: [aliuq/inpaint-web](https://hub.docker.com/r/aliuq/inpaint-web)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/inpaint-web)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name inpaint-web -p 8080:80 aliuq/inpaint-web:latest
# 测试
docker run --rm --name inpaint-web -p 8080:80 aliuq/inpaint-web:latest
```

访问 `http://localhost:8080` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: inpaint-web
services:
  inpaint-web:
    image: aliuq/inpaint-web:latest
    container_name: inpaint-web
    restart: unless-stopped
    ports:
      - '8080:80'
```

运行服务：

```bash
docker-compose up -d
```

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/inpaint-web

# 构建镜像
docker buildx build -f ./Dockerfile -t inpaint-web:local --load .

# 运行测试
docker run --rm --name inpaint-web-local -p 8080:80 inpaint-web:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t inpaint-web:debug --load .
```

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
