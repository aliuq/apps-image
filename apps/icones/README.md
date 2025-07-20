# Icones

> 一个开源、美观的图标浏览器，让您能够搜索和浏览超过 150,000 个开源矢量图标

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/icones)](https://hub.docker.com/r/aliuq/icones)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/icones)](https://hub.docker.com/r/aliuq/icones)

## 项目信息

- **官方仓库**: [antfu-collective/icones](https://github.com/antfu-collective/icones)
- **Docker 镜像**: [aliuq/icones](https://hub.docker.com/r/aliuq/icones)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/blob/master/apps/icones/Dockerfile)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name icones -p 8080:80 aliuq/icones:latest
# 测试
docker run --rm --name icones -p 8080:80 aliuq/icones:latest
```

访问 `http://localhost:8080` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: icones
services:
  icones:
    image: aliuq/icones:latest
    container_name: icones
    restart: unless-stopped
    ports:
      - '8080:80'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🔍 **搜索图标**: 从超过 150,000 个开源图标中快速搜索
- 📦 **多图标库支持**: 支持 Material Design、FontAwesome、Heroicons 等
- 🎨 **自定义样式**: 支持修改颜色、大小等属性
- 📱 **响应式设计**: 完美适配桌面和移动设备
- ⬇️ **多格式导出**: 支持 SVG、PNG、Vue 组件等格式

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/icones

# 构建镜像
docker buildx build -f ./Dockerfile -t icones:local --load .

# 运行测试
docker run --rm --name icones-local -p 8080:80 icones:local
```

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t icones:debug --load .
```

## 相关链接

- [https://icones.js.org](https://icones.js.org)
- [https://icones.netlify.app](https://icones.netlify.app)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
