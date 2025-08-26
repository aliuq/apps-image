# Haitang 海棠诗社

> 古诗词的数字桃源，提供丰富的中国古典诗词浏览、搜索和学习功能

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/haitang)](https://hub.docker.com/r/aliuq/haitang)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/haitang)](https://hub.docker.com/r/aliuq/haitang)

## 项目信息

- **上游仓库**: [javayhu/haitang](https://github.com/javayhu/haitang)
- **Docker 镜像**: [aliuq/haitang](https://hub.docker.com/r/aliuq/haitang)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/haitang)
- **官方网站**: [haitang.app](https://haitang.app/)
- **在线体验**: [haitang.vercel.app](https://haitang.vercel.app/)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name haitang -p 4321:4321 aliuq/haitang:latest
# 测试
docker run --rm --name haitang -p 4321:4321 aliuq/haitang:latest
```

访问 `http://localhost:4321` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: haitang
services:
  haitang:
    image: aliuq/haitang:latest
    container_name: haitang
    restart: unless-stopped
    ports:
      - '4321:4321'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🎯 **多维度检索**: 按诗集、朝代、诗人、诗词等方式检索，内容丰富，信息齐全
- 📝 **精选分类**: 按选集、主题、节日、节气、词牌、时令、地理等方式精选分类
- 🔍 **全站响应式**: 兼容移动端，支持暗黑模式，响应速度快
- 🏮 **海量诗词**: 收录大量中国古典诗词作品
- 📱 **完美适配**: 桌面和移动设备都有优秀的使用体验
- 🎨 **优雅界面**: 中式设计风格，简洁美观

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/haitang

# 构建镜像
docker buildx build -f ./Dockerfile -t haitang:local --load .

# 运行测试
docker run --rm --name haitang-local -p 4321:4321 haitang:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t haitang:debug --no-cache --load .
```

## 注意事项

- 容器已经移除 `Analytics: Umami + Google Analytics` 相关代码
- 容器已经移除 `Comment: Giscus` 相关代码

## 相关链接

- [海棠诗社官网](https://haitang.app/)
- [开源版本体验](https://haitang.vercel.app/)
- [上游项目主页](https://github.com/javayhu/haitang)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
