# 衣姿 PoseWear

> 姿势、深度姿势、服装、动画服装和人像参考图库，附中英文提示词；可在浏览器中使用自备 API Key 进行 AI 试穿

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/posewear)](https://hub.docker.com/r/aliuq/posewear)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/posewear)](https://hub.docker.com/r/aliuq/posewear)

## 项目信息

- **上游仓库**: [atuizz/posewear](https://github.com/atuizz/posewear)
- **Docker 镜像**: [aliuq/posewear](https://hub.docker.com/r/aliuq/posewear)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/blob/master/apps/posewear/Dockerfile)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name posewear --restart unless-stopped -p 8080:80 aliuq/posewear:latest
# 临时运行（与上面的命令二选一）
docker run --rm --name posewear-test -p 8080:80 aliuq/posewear:latest
```

访问 `http://localhost:8080` 即可使用。容器内监听 80；宿主机端口可按需调整

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: posewear
services:
  posewear:
    image: aliuq/posewear:latest
    container_name: posewear
    restart: unless-stopped
    ports:
      - '8080:80'
```

运行服务：

```bash
docker compose up -d
```

## 功能特性

- 🧍 **姿势参考**：浏览姿势与深度姿势图库
- 👗 **服装参考**：包含服装、动画服装和人像素材
- 🌐 **双语提示词**：素材配有中文和英文提示词
- ✨ **AI 试穿**：支持 OpenAI、Gemini、豆包 Seedream 和 OpenAI 兼容服务
- 🔑 **自备 API Key**：Key 保存在浏览器 `localStorage`，不会写入容器
- 📦 **内置素材**：镜像约 8 GB，深度姿势图库仍从原站加载

## 开发与构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/posewear

# 生成站点并构建镜像
bash pre.sh
docker buildx build -f ./Dockerfile -t posewear:local --load .

# 运行本地镜像
docker run --rm --name posewear-local -p 8080:80 posewear:local
```

构建需要 Docker、Git、Bash、[mise](https://mise.jdx.dev/) 和可访问 GitHub 与素材源的网络。完整构建会下载约 7.2 GB 素材并生成 `app/dist`，建议预留至少 30 GB 磁盘空间

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t posewear:debug --load .
```

### 构建参数

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `POSEWEAR_RAW` | `./assets-raw` | 原始素材缓存目录。设为自定义目录时构建完成后会保留缓存；目录必须位于临时 `app/` 目录之外 |
| `POSEWEAR_KEEP_RAW` | `0` | 设为 `1` 可在构建完成后保留默认素材缓存 |
| `POSEWEAR_SITE` | 上游默认域名 | 设置站点域名，影响详情页、sitemap 和分享卡片；首页 canonical 仍由上游模板固定 |

保留默认缓存以供后续构建复用：

```bash
POSEWEAR_KEEP_RAW=1 bash pre.sh
```

设置自定义缓存目录或站点域名：

```bash
POSEWEAR_RAW=/data/posewear-assets POSEWEAR_SITE=https://posewear.example.com bash pre.sh
```

## 使用说明

1. 浏览姿势、服装或人像分类，打开所需参考素材
2. 查看素材附带的中文或英文提示词
3. 使用 AI 试穿时，在应用中选择服务并填写自备 API Key；试穿及深度姿势图片需要网络连接

## 配置

### AI 试穿代理

镜像内置同源接口 `/api/proxy`，用于转发 AI API 请求和下载生成结果。代理允许 OpenAI、Google Gemini、火山方舟及 BytePlus 官方接口域名；自定义中转支持公网 HTTPS 与局域网地址（内网允许 HTTP、任意端口），路径需符合受支持的 API 格式；局域网地址即使不带自定义标记也可转发，公网非官方地址仍需在应用设置中选择「自定义」。图片下载仅允许来自指定服务域名，并按来源 IP 限流

反向代理需要保留访问站点时的 `Host` 请求头，否则 `/api/proxy` 的同源校验会拒绝请求。Nginx 配置示例：

```nginx
proxy_set_header Host $host;
```

## 素材与许可

> [!WARNING]
> 姿势、服装、动画服装图片及原始数据版权归原作者 [@giaaibusi](https://x.com/giaaibusi) 所有。原站未声明开放许可，并明确禁止批量自动下载和再分发（包括加工后的版本）。公开镜像包含这些素材；使用前需确认已获授权。自行构建时也需遵守原站的素材条款

- 人像库：CC0 1.0，作者 [@agi_aibusi](https://x.com/agi_aibusi)
- 深度姿势：热链 [AI Pose Depth Gallery](https://ai-pose-depth-gallery.pages.dev/)，图片不打包进镜像；原站同样禁止批量下载和再分发
- 上游代码与文案：[MIT](https://github.com/atuizz/posewear/blob/41f3dc3/LICENSE)；MIT 不覆盖图片或原始数据

## 相关链接

- [PoseWear 在线体验](https://posewear.pages.dev)
- [上游项目](https://github.com/atuizz/posewear)
- [Docker Hub](https://hub.docker.com/r/aliuq/posewear)
