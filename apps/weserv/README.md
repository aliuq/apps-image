# weserv

> An image cache & resize service. Manipulate images on-the-fly with a worldwide cache.

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/weserv)](https://hub.docker.com/r/aliuq/weserv)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/weserv/alpine?label=alpine)](https://hub.docker.com/r/aliuq/weserv)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/weserv/latest?label=latest)](https://hub.docker.com/r/aliuq/weserv)

## 项目信息

- **上游仓库**: [weserv/images](https://github.com/weserv/images)
- **Docker 镜像**: [aliuq/weserv](https://hub.docker.com/r/aliuq/weserv)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/weserv)，来自官方仓库
- **官方网站**: [https://images.weserv.nl/](https://images.weserv.nl/)
- **API 文档**: [https://images.weserv.nl/docs/](https://images.weserv.nl/docs/)

> ⚠️ 注意：官方有一个镜像 `weserv/images`，和官方的区别在于支持 `arm64` 架构和 `alpine` 镜像

```bash
docker run -d --name weserv -p 8080:80 aliuq/weserv:latest
# 测试
docker run --rm --name weserv -p 8080:80 aliuq/weserv:latest
```

访问 `http://localhost:8080` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: weserv
services:
  weserv:
    image: aliuq/weserv:latest
    container_name: weserv
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
      # Optional: Custom deny IP list (comma-separated)
      # - WESERV_DENY_IP=127.0.0.0/8,::1/128,10.0.0.0/8
    ports:
      - '8080:80'
```

运行服务：

```bash
docker-compose up -d
```

### 配置拒绝访问的 IP 地址

可以通过 `WESERV_DENY_IP` 环境变量自定义禁止访问的 IP 地址列表，使用逗号分隔多个 IP 段：

```bash
# 启动时指定自定义 IP 黑名单
docker run -d --name weserv -p 8080:80 \
  -e WESERV_DENY_IP="127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12" \
  aliuq/weserv:latest

# 设置为空值以禁用 IP 黑名单功能
docker run -d --name weserv -p 8080:80 \
  -e WESERV_DENY_IP="" \
  aliuq/weserv:latest
```

**行为说明**:

- 如果**不设置** `WESERV_DENY_IP` 环境变量，将使用默认的 IP 黑名单
- 如果设置为**空字符串**（`WESERV_DENY_IP=""`），将不启用任何 IP 黑名单限制
- 如果设置为**具体值**，将使用自定义的 IP 黑名单

**默认拒绝的 IP 范围**（未设置 `WESERV_DENY_IP` 时）:

- `127.0.0.0/8` - 回环地址
- `::1/128` - IPv6 回环地址
- `169.254.0.0/16` - 链路本地地址
- `224.0.0.0/4` - 多播地址
- `fe80::/64` - IPv6 链路本地地址
- `ff00::/8` - IPv6 多播地址
- `10.0.0.0/8` - 私有网络
- `172.16.0.0/12` - 私有网络
- `192.168.0.0/16` - 私有网络
- `fc00::/7` - IPv6 唯一本地地址

### Alpine 版本

如需更小的镜像体积，可使用 Alpine 版本：

```bash
docker run -d --name weserv -p 8080:80 aliuq/weserv:alpine
```

或在 docker-compose.yml 中使用：

```yaml
services:
  weserv:
    image: aliuq/weserv:alpine
    environment:
      - TZ=Asia/Shanghai
    # ...其他配置
```

## 使用示例

### 基本图片处理

```bash
# 调整图片大小
http://localhost:8080/?url=example.com/image.jpg&w=300&h=200

# 裁剪图片
http://localhost:8080/?url=example.com/image.jpg&w=300&h=300&fit=cover

# 转换格式
http://localhost:8080/?url=example.com/image.jpg&output=webp

# 调整质量
http://localhost:8080/?url=example.com/image.jpg&q=80

# 应用滤镜
http://localhost:8080/?url=example.com/image.jpg&filt=greyscale
```

## 功能特性

- 🖼️ **图片处理**: 支持调整大小、裁剪、旋转、翻转等操作
- 🎨 **格式转换**: 支持 JPEG、PNG、WebP、AVIF 等多种格式互转
- ⚡ **高性能**: 基于 libvips 构建，提供极速的图片处理能力
- 🌐 **CDN 友好**: 设计用于与 CDN 配合使用，支持全球缓存
- 🔒 **安全**: 内置防滥用机制和速率限制
- 🎯 **智能裁剪**: 支持智能识别重点区域进行裁剪
- 🔧 **丰富参数**: 提供大量参数用于精细化控制图片输出

## 可用标签

- `latest`, `5.x` - 最新的 5.x 版本（基于 Rocky Linux）
- `alpine`, `5.x-alpine` - Alpine 版本（更小的镜像体积）
- `<version>` - 特定版本，如 `0f029b4`
- `<version>-alpine` - 特定版本的 Alpine 版本

## 常用参数说明

参数请参考 [官方文档](https://images.weserv.nl/docs/)

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/weserv

# 构建标准版本
docker buildx build -f ./Dockerfile -t weserv:local --load .

# 构建 Alpine 版本
docker buildx build -f ./Dockerfile.alpine -t weserv:alpine-local --load .

# 运行测试
docker run --rm --name weserv-local -p 8080:80 weserv:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t weserv:debug --load .
```

## 相关链接

- [weserv.nl 官方网站](https://images.weserv.nl/)
- [API 文档](https://images.weserv.nl/docs/)
- [GitHub 仓库](https://github.com/weserv/images)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
