# JSON Hero Web

> 一个开源、美观的 Web JSON 浏览器，让您能够快速浏览、搜索和导航 JSON 文件

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/jsonhero-web)](https://hub.docker.com/r/aliuq/jsonhero-web)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/jsonhero-web)](https://hub.docker.com/r/aliuq/jsonhero-web)

## 项目信息

- **上游仓库**: [triggerdotdev/jsonhero-web](https://github.com/triggerdotdev/jsonhero-web)
- **Docker 镜像**: [aliuq/jsonhero-web](https://hub.docker.com/r/aliuq/jsonhero-web)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/jsonhero-web)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name jsonhero-web -p 8787:8787 -e SESSION_SECRET=<your-secret-key> aliuq/jsonhero-web:latest
# 测试
docker run --rm --name jsonhero-web -p 8787:8787 -e SESSION_SECRET=test-secret aliuq/jsonhero-web:latest
```

访问 `http://localhost:8787` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: jsonhero-web
services:
  jsonhero-web:
    image: aliuq/jsonhero-web:latest
    container_name: jsonhero-web
    restart: unless-stopped
    ports:
      - '8787:8787'
    environment:
      - SESSION_SECRET=<your-secret-key>
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🔍 **快速搜索**: 在大型 JSON 文件中快速搜索特定字段或值
- 🌳 **树状浏览**: 直观的树形结构展示 JSON 数据
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🎨 **美观界面**: 现代化的 UI 设计，支持语法高亮
- 📊 **数据类型识别**: 自动识别并高亮不同的数据类型
- 🔗 **URL 分享**: 生成可分享的链接，方便团队协作
- 💾 **本地存储**: 支持本地文件上传和在线 JSON 数据

## 配置选项

### 环境变量

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `SESSION_SECRET` | 是 | - | 会话加密密钥，用于安全认证 |

## 使用方法

1. **上传 JSON**: 将 JSON 文件拖拽到页面或粘贴 JSON 内容
2. **浏览数据**: 使用树状结构浏览 JSON 数据
3. **搜索内容**: 使用搜索功能快速定位特定字段
4. **分享链接**: 生成可分享的链接供他人查看

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/jsonhero-web

# 构建镜像
docker buildx build -f ./Dockerfile -t jsonhero-web:local --load .

# 运行测试
docker run --rm --name jsonhero-web-local -p 8787:8787 -e SESSION_SECRET=test-secret jsonhero-web:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t jsonhero-web:debug --no-cache --load .
```

## 相关链接

- [JSON Hero 官网](https://jsonhero.io/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
