# Telegram Upload

> 一个命令行工具，用于将文件上传到 Telegram，支持大文件分片上传和断点续传

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/telegram-upload)](https://hub.docker.com/r/aliuq/telegram-upload)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/telegram-upload)](https://hub.docker.com/r/aliuq/telegram-upload)

## 项目信息

- **上游仓库**: [Nekmo/telegram-upload](https://github.com/Nekmo/telegram-upload)
- **Docker 镜像**: [aliuq/telegram-upload](https://hub.docker.com/r/aliuq/telegram-upload)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/telegram-upload)
- **Documentation**: [查看文档](https://docs.nekmo.org/telegram-upload/usage.html)

## 快速开始

### 基本用法

```bash
# 查看帮助信息
docker run -it --rm --name telegram-upload aliuq/telegram-upload:latest upload --help
```

## 功能特性

- 📤 **大文件上传**: 支持大文件分片上传，突破 Telegram 文件大小限制
- 🔄 **断点续传**: 支持上传中断后自动续传
- 📁 **批量上传**: 支持多文件和文件夹批量上传
- 🎯 **精准控制**: 支持指定频道、群组或私聊上传
- 📊 **进度显示**: 实时显示上传进度和速度
- 🔐 **安全认证**: 使用官方 Telegram API，安全可靠
- 💾 **配置持久化**: 支持配置文件保存，避免重复认证

## 使用示例

### Docker Compose 配置

创建 `docker-compose.yml` 文件

```yaml
name: telegram-upload
services:
  telegram-upload:
    image: aliuq/telegram-upload:latest
    container_name: telegram-upload
    restart: always
    command: upload -i
    volumes:
      - ./config:/config
      - ./files:/files
```

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/telegram-upload

# 构建镜像
docker buildx build -f ./Dockerfile -t telegram-upload:local --load .

# 运行测试
docker run -it --rm --name telegram-upload-local telegram-upload:local upload --help
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t telegram-upload:debug --no-cache --load .
```

## 注意事项

- 首次使用需要提供 Telegram API 凭据（API ID 和 Hash）
- 建议挂载配置目录以避免重复认证
- 大文件上传可能需要较长时间，请耐心等待
- 确保有足够的网络带宽和存储空间

## 相关链接

- [上游项目主页](https://github.com/Nekmo/telegram-upload)
- [Telegram API 文档](https://core.telegram.org/api)
- [获取 API 凭据](https://my.telegram.org/apps)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈。
