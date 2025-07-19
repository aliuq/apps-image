# Telemirror

> 一个 Telegram 消息镜像工具，可以将 Telegram 频道/群组的消息转发到其他频道或群组

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/telemirror)](https://hub.docker.com/r/aliuq/telemirror)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/telemirror)](https://hub.docker.com/r/aliuq/telemirror)

## 项目信息

- **上游仓库**: [khoben/telemirror](https://github.com/khoben/telemirror)
- **Docker 镜像**: [aliuq/telemirror](https://hub.docker.com/r/aliuq/telemirror)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/telemirror)

## 快速开始

### 使用 Docker Compose

创建 `docker-compose.yml` 文件

```yaml
name: telemirror
services:
  telemirror:
    image: aliuq/telemirror:latest
    restart: unless-stopped
    environment:
      - API_ID=
      - API_HASH=
      - SESSION_STRING=
      - USE_MEMORY_DB=false
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/telemirror
      - LOG_LEVEL=info
    volumes:
      - ./.configs:/app/.configs:ro
    ports:
      - '8000:8000'
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: telemirror
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ./pg_data:/var/lib/postgresql/data
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🔄 **消息转发**: 自动转发 Telegram 频道或群组消息
- 📱 **多平台支持**: 支持频道到频道、群组到群组的转发
- 🎯 **精确控制**: 支持过滤规则和转发条件设置
- 📊 **实时监控**: 提供 Web 界面查看转发状态和统计
- 🔧 **灵活配置**: 支持多种配置选项和自定义规则
- 💾 **数据持久化**: 保存转发记录和配置信息
- 📝 **日志记录**: 详细的操作日志和错误记录

## 使用方法

### 获取 Telegram API 凭据

1. 访问 [my.telegram.org](https://my.telegram.org/)
2. 登录您的 Telegram 账户
3. 创建应用程序获取 API ID 和 Hash

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/telemirror

# 构建镜像
docker buildx build -f ./Dockerfile -t telemirror:local --load .

# 运行测试
docker run --rm --name telemirror-local -p 8000:8000 telemirror:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t telemirror:debug --no-cache --load .
```

## 注意事项

- 需要有效的 Telegram API 凭据才能使用
- 建议挂载配置目录以持久化设置
- 转发大量消息可能触发 Telegram API 限制
- 请遵守相关法律法规和平台规则

## 相关链接

- [Telegram API 文档](https://core.telegram.org/api)
- [获取 API 凭据](https://my.telegram.org/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
