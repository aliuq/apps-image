# Lsky 兰空图床

> 一个开源、轻量级的图片云存储系统，支持多种云存储平台，提供完善的图床管理功能

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/lsky)](https://hub.docker.com/r/aliuq/lsky)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/lsky)](https://hub.docker.com/r/aliuq/lsky)

## 项目信息

- **上游仓库**: [lsky-org/lsky-pro](https://github.com/lsky-org/lsky-pro)
- **Docker 镜像**: [aliuq/lsky](https://hub.docker.com/r/aliuq/lsky)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/lsky)
- **官方文档**: [docs.lsky.pro](https://docs.lsky.pro/)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name lsky -p 8080:80 aliuq/lsky:latest
# 挂载目录
docker run -d --name lsky -p 8080:80 -v ./data:/app aliuq/lsky:latest
# 测试
docker run --rm --name lsky -p 8080:80 aliuq/lsky:latest
```

访问 `http://localhost:8080` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件

```yaml
name: lsky
services:
  lsky:
    image: aliuq/lsky:latest
    container_name: lsky
    restart: unless-stopped
    ports:
      - '8080:80'
    environment:
      - UPLOAD_MAX_FILESIZE=20M
      - POST_MAX_SIZE=20M
    volumes:
      - ./data:/app
    depends_on:
      - lsky-db

  lsky-db:
    image: postgres:15-alpine
    container_name: lsky-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: lsky
      POSTGRES_PASSWORD: lsky
      POSTGRES_DB: lsky
      PGDATA: /pg-data
    volumes:
      - ./db_data:/pg-data
```

运行服务

```bash
docker-compose up -d
```

## 功能特性

- 🖼️ **多格式支持**: 支持 JPG、PNG、GIF、WebP 等常见图片格式
- ☁️ **多云存储**: 支持本地、阿里云 OSS、腾讯云 COS、七牛云等多种存储方式
- 👥 **用户管理**: 支持多用户注册、登录、权限管理
- 📊 **统计分析**: 提供图片上传统计、存储空间使用情况
- 🔗 **链接管理**: 支持多种图片链接格式，方便分享和使用
- 🛡️ **安全防护**: 支持图片水印、防盗链、访问控制等安全功能
- 📱 **响应式设计**: 完美适配桌面和移动设备

## 配置选项

### 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `UPLOAD_MAX_FILESIZE` | `10M` | 单个文件上传大小限制 |
| `POST_MAX_SIZE` | `10M` | POST 数据最大限制 |

### 数据持久化

```bash
# 挂载数据目录
docker run -d --name lsky -p 8080:80 -v ./data:/app aliuq/lsky:latest
```

### 端口映射

```bash
# 映射到其他端口
docker run -p 3000:80 aliuq/lsky:latest
```

## 使用方法

### 初始化配置

1. **访问安装页面**: 首次访问会进入安装向导
2. **配置数据库**: 根据提示配置数据库连接信息
3. **创建管理员账户**: 设置管理员用户名和密码
4. **完成安装**: 按照向导完成初始化配置

### 数据库配置示例

使用 PostgreSQL 数据库：

- **数据库类型**: PostgreSQL
- **服务器地址**: `lsky-db:5432`
- **数据库名**: `lsky`
- **用户名**: `lsky`
- **密码**: `lsky`

![截图](https://raw.githubusercontent.com/aliuq/apps-image/refs/heads/master/apps/lsky/assets/screenshot.png)

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/lsky

# 构建镜像
docker buildx build -f ./Dockerfile -t lsky:local --load .

# 运行测试
docker run --rm --name lsky-local -p 8080:80 -v ./data:/app lsky:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t lsky:debug --no-cache --load .
```

## 注意事项

- 首次运行需要进行安装配置，请按照安装向导操作
- 建议使用外部数据库（如 PostgreSQL、MySQL）以确保数据安全
- 生产环境建议配置 HTTPS 和域名访问
- 定期备份数据目录和数据库

## 相关链接

- [Lsky Pro 官网](https://www.lsky.pro/)
- [演示站点](https://v2.lskypro.com/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
