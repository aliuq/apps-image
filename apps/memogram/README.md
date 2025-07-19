# Memogram

> Memos 的 Telegram 机器人集成，让您可以通过 Telegram 轻松管理和分享您的备忘录

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/memogram)](https://hub.docker.com/r/aliuq/memogram)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/memogram)](https://hub.docker.com/r/aliuq/memogram)

## 项目信息

- **上游仓库**: [usememos/telegram-integration](https://github.com/usememos/telegram-integration)
- **Docker 镜像**: [aliuq/memogram](https://hub.docker.com/r/aliuq/memogram)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/memogram)

## 快速开始

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: memos
services:
  memos:
    image: ghcr.io/usememos/memos:latest
    restart: unless-stopped
    container_name: memos
    ports:
      - 5230:5230
    volumes:
      - ./data:/var/opt/memos
    env_file: .env

  memogram:
    image: aliuq/memogram:latest
    restart: unless-stopped
    container_name: memogram
    environment:
      - SERVER_ADDR=dns:memos:5230
      - BOT_TOKEN=${BOT_TOKEN}
    depends_on:
      - memos
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🤖 **Telegram 机器人**: 通过 Telegram 创建、查看和管理备忘录
- 📝 **快速记录**: 发送消息即可快速创建备忘录
- 🔍 **搜索功能**: 在 Telegram 中搜索您的备忘录
- 📷 **媒体支持**: 支持图片、文件等媒体内容
- 🔗 **无缝集成**: 与 Memos 实例完美集成
- 👥 **多用户支持**: 支持多个用户通过各自的 Telegram 账户使用

## 配置选项

### 环境变量

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `SERVER_ADDR` | 是 | - | 运行 Memos 的 gRPC 服务器地址 |
| `BOT_TOKEN` | 是 | - | Telegram 机器人 Token |
| `BOT_PROXY_ADDR` | 否 | - | Telegram API 的可选代理地址（如果不需要则留空） |
| `ALLOWED_USERNAMES` | 否 | - | 可选的以逗号分隔的允许用户名列表（不带 @ 符号） |

### 获取 Telegram Bot Token

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令创建新机器人
3. 按照提示设置机器人名称和用户名
4. 获取 Bot Token

## 使用方法

### 基本命令

- `/start <access_token>` - 使用您的 Memos 访问令牌启动机器人
- `Send text messages` - 将消息保存为备忘录
- `Send files (photos, documents)` - 将文件保存为备忘录
- `/search [关键词]` - 搜索备忘录

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/memogram

# 构建镜像
docker buildx build -f ./Dockerfile -t memogram:local --load .

# 修改 docker-compose.yml 中的 image 为 memogram:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t memogram:debug --no-cache --load .
```

## 注意事项

- 确保 Memos 实例正常运行且可访问
- Telegram Bot Token 必须保密，不要泄露给他人
- 建议在生产环境中使用 HTTPS
- 定期备份 Memos 数据

## 相关链接

- [Memos 项目](https://github.com/usememos/memos)
- [Memos Self-Host](https://www.usememos.com/docs/install/self-hosting)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈。
