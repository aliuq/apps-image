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
      - POST_MAX_SIZE=25M
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
| `POST_MAX_SIZE` | `15M` | 整个 POST 请求的大小限制；镜像默认 nginx server 的 `client_max_body_size` 同步此值 |

`POST_MAX_SIZE` 应大于 `UPLOAD_MAX_FILESIZE`，为 multipart 表单字段和封装开销留出空间。例如，单文件上限为 `20M` 时，可将请求总量上限设为 `25M`

环境变量未设置或为空时使用默认值，显式非空值优先。应用角色组的上传大小限制仍需单独配置。

### 自定义 nginx 配置

入口会在 `/tmp/lsky-nginx` 生成运行时配置，nginx 使用该副本启动，不原地改写 `/etc/nginx`，因此支持只读配置目录及单文件挂载 `nginx.conf`。可用 `nginx -t -c /tmp/lsky-nginx/nginx.conf` 检查实际生效的配置。

镜像自带的 `default.conf` 会在 `server` 作用域设置上传限制，避免与已有 `http` 级指令重复。若替换或修改了该 server 配置，入口会保留自定义指令和 include，由用户在自定义 server 中配置 `client_max_body_size`。旧入口生成的 `00-upload-limit.conf` 不会载入运行时副本。原始配置和挂载文件保持不变。

### 数据持久化

```bash
# 挂载数据目录
docker run -d --name lsky -p 8080:80 -v ./data:/app aliuq/lsky:latest
```

### 升级已有稳定版数据卷

`/app` 非空时不会自动覆盖应用或 `vendor`。稳定版 2.1 的旧 Carbon 2.61.0 不兼容 PHP 8.2，已有数据卷不能只换新镜像而保留旧依赖，否则日期构造和页面请求可能返回 500。

在维护窗口先备份 `.env`、上传目录和数据库。在仓库根目录构建新镜像：

```bash
docker buildx build -f apps/lsky/Dockerfile -t lsky:local --load apps/lsky
```

**随后回到原部署目录，使用原 Compose 文件和相同项目名**，仅更新镜像引用并保留所有原挂载。若原部署使用了 `-f` / `-p`，以下每条 Compose 命令也必须沿用这些参数；不要用仓库示例替换用户的原配置。重建前用 `docker compose config` 和 `docker inspect` 核对 `/app` 的挂载来源一致。依赖更新完成前，使用旧 vendor 的实例可能暂时返回 500：

```bash
docker compose up -d --no-deps --force-recreate lsky
docker compose exec -T lsky composer update \
  nesbot/carbon:2.73.0 laminas/laminas-diactoros:2.24.2 \
  nette/schema:1.4.0 nette/utils:4.1.6 phpspec/prophecy:1.22.0 \
  --with-dependencies --minimal-changes \
  --no-dev --optimize-autoloader --no-interaction --no-progress
docker compose restart lsky
```

原配置不变时，上述重建会复用原数据卷，依赖更新不初始化数据库。不要使用 `down -v` 或 `--renew-anon-volumes`。对于 `docker run` 部署，不要套用 Compose 重建命令：先记录并显式复用原 `/app` 绑定目录或命名卷，以原环境变量重建原服务，再对实际容器使用 `docker exec` 执行相同的 `composer update` 命令并重启；匿名卷也必须显式复用原卷名，不能新建空卷。上述依赖版本针对稳定版 2.1；定制源码或 dev 变体应先核对自身锁文件，不应直接套用。

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
