# tgcf

> Telegram 消息转发工具，支持频道、群组和私聊之间的消息转发和过滤

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/tgcf)](https://hub.docker.com/r/aliuq/tgcf)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/tgcf)](https://hub.docker.com/r/aliuq/tgcf)

## 项目信息

- **上游仓库**: [aahnik/tgcf](https://github.com/aahnik/tgcf)
- **Docker 镜像**: [aliuq/tgcf](https://hub.docker.com/r/aliuq/tgcf)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/tgcf)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name tgcf -p 8501:8501 aliuq/tgcf:latest
```

访问 `http://localhost:8501` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'
services:
  tgcf:
    image: aliuq/tgcf:latest
    container_name: tgcf
    restart: unless-stopped
    ports:
      - '8501:8501'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 📤 **消息转发**: 支持频道、群组、私聊之间的消息转发
- 🔍 **内容过滤**: 支持基于关键词、用户、媒体类型的消息过滤
- 🎛️ **Web 界面**: 提供直观的 Streamlit Web 界面进行配置
- 📝 **格式化**: 支持消息格式化和自定义模板
- 🔗 **批量转发**: 支持多个源到多个目标的批量转发
- ⚙️ **灵活配置**: 支持 YAML 配置文件和环境变量配置
- 📊 **实时监控**: 实时显示转发状态和统计信息

## 使用方法

### 初始配置

1. **启动服务**: 使用上述 Docker 命令启动服务
2. **访问界面**: 打开浏览器访问 `http://localhost:8501`
3. **配置 API**: 输入 Telegram API ID 和 Hash
4. **设置转发规则**: 配置源和目标聊天
5. **启动转发**: 开始自动转发消息

### 获取 Telegram API 凭据

1. 访问 [my.telegram.org](https://my.telegram.org/)
2. 登录您的 Telegram 账户
3. 创建应用程序获取 API ID 和 Hash

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/tgcf

# 构建镜像
docker buildx build -f ./Dockerfile -t tgcf:local --load .

# 运行测试
docker run --rm --name tgcf-local -p 8501:8501 tgcf:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t tgcf:debug --no-cache --load .

# 交互式运行容器
docker run -it --rm --name tgcf-debug -p 8501:8501 tgcf:debug
```

## 注意事项

- 需要有效的 Telegram API 凭据才能使用
- 建议挂载配置目录以持久化设置
- 转发大量消息可能触发 Telegram API 限制
- 请遵守相关法律法规和平台规则

## 相关链接

- [上游项目主页](https://github.com/aahnik/tgcf)
- [Telegram API 文档](https://core.telegram.org/api)
- [获取 API 凭据](https://my.telegram.org/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
