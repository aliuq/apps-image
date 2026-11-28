# 衣姿 PoseWear

> 姿势、深度姿势、服装、动画服装、人像、发型、表情、历代服饰、场景、光影、道具和家具参考图库，附中英文提示词；可在浏览器中使用自备 API Key 进行 AI 试穿

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
- 🗂️ **扩展栏目**：表情、历代服饰、场景、光影、道具和家具六个栏目随镜像内置
- 💇 **发型与 CharaDB 服装**：122 个发型和 440 套 CharaDB 动画服装随元数据内置，图片从 CharaDB 原站加载
- 🌐 **双语提示词**：素材配有中文和英文提示词
- ✨ **AI 试穿**：支持 OpenAI、Gemini、豆包 Seedream 和 OpenAI 兼容服务
- 🔑 **自备 API Key**：Key 保存在浏览器 `localStorage`，不会写入容器
- 📦 **内置素材**：镜像约 8 GB，深度姿势与 CharaDB 图片仍从原站加载

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

构建需要 Docker、Git、Bash、[mise](https://mise.jdx.dev/) 和可访问 GitHub、素材源与上游部署站的网络。完整构建会下载约 7.2 GB 基础素材和约 45 MB 扩展栏目素材，并生成 `app/dist`，建议预留至少 30 GB 磁盘空间

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t posewear:debug --load .
```

### 构建参数

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `POSEWEAR_RAW` | `./assets-raw` | 原始素材缓存目录，构建后保留以供下次构建复用；目录必须位于临时 `app/` 目录之外 |
| `POSEWEAR_SITE` | 上游默认域名 | 设置站点域名，影响详情页、sitemap 和分享卡片；首页 canonical 仍由上游模板固定 |
| `POSEWEAR_MODULES_BASE` | `https://posewear.pages.dev` | 六个扩展栏目与 CharaDB 元数据的数据来源，仅构建时使用 |
| `POSEWEAR_MODULES_IMG` | `https://pwimg.0vo.pro` | 六个扩展栏目的缩略图来源，仅构建时使用 |

默认会保留 `assets-raw` 缓存，下次运行 `bash pre.sh` 时可复用。需要清理时手动删除：

```bash
rm -rf assets-raw
```

设置自定义缓存目录或站点域名：

```bash
POSEWEAR_RAW=/data/posewear-assets POSEWEAR_SITE=https://posewear.example.com bash pre.sh
```

## 使用说明

1. 浏览姿势、服装、发型、人像或扩展栏目分类，打开所需参考素材
2. 查看素材附带的中文或英文提示词
3. 使用 AI 试穿时，在应用中选择服务并填写自备 API Key；试穿、深度姿势和 CharaDB 图片需要网络连接

## 配置

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `80` | 容器内监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `POSEWEAR_API_TIMEOUT` | `300000` | AI 接口转发超时（毫秒），含响应体下载，并同步覆盖浏览器端 3 分钟的生成等待；`0` 表示两侧都不超时 |
| `POSEWEAR_IMAGE_TIMEOUT` | `120000` | 结果图片下载超时（毫秒）；`0` 表示永不超时 |
| `POSEWEAR_PRIVATE_HOSTS` | 空 | 逗号分隔的额外内网域名/后缀（如 `relay.corp.example.com`）；命中的目标允许 HTTP |
| `POSEWEAR_TRUST_PROXY` | 自动 | `1` 强制信任 `cf-connecting-ip`/`x-forwarded-for`/`x-real-ip`，`0` 从不信任；未设置时仅当直连对端是内网地址才信任 |

超时设为空、负数或非整数时按默认值处理。`POSEWEAR_API_TIMEOUT` 未设置时，浏览器仍使用站点自带的 3 分钟上限；只要设置了该变量（包括空值），首页就会加载 `/__tmo.js` 并同步服务端的有效超时。客户端断开连接仍会中止上游请求。生成耗时较长时可调大或设为 `0`，例如：

```yaml
environment:
  - POSEWEAR_API_TIMEOUT=0
```

### AI 试穿代理

镜像内置同源接口 `/api/proxy`，用于转发 AI API 请求和下载生成结果。代理允许 OpenAI、Google Gemini、火山方舟及 BytePlus 官方接口域名；自定义中转支持公网 HTTPS 与局域网地址（内网允许 HTTP、任意端口），路径需符合受支持的 API 格式；局域网地址即使不带自定义标记也可转发，公网非官方地址仍需在应用设置中选择「自定义」。单标签主机名（Docker Compose/K8s 服务名，如 `relay`）以及 `*.local`、`*.internal`、`*.lan`、`*.home.arpa`、`*.localdomain`、`*.svc` 会自动识别为内网，其他内网域名通过 `POSEWEAR_PRIVATE_HOSTS` 声明。图片下载仅允许来自指定服务域名，并按真实客户端 IP 限流

> [!WARNING]
> 允许内网目标会扩大 SSRF 面。不要把未加认证的实例直接暴露在公网；生产部署建议在反向代理层增加访问控制

反向代理需要保留访问站点时的 `Host` 请求头，否则 `/api/proxy` 的同源校验会拒绝请求。对端是内网地址时默认信任转发头；如果代理在公网侧（例如 Cloudflare），需设置 `POSEWEAR_TRUST_PROXY=1`。Nginx 配置示例：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

> `POSEWEAR_TRUST_PROXY=1` 时，任何能直连服务的人都可以伪造客户端 IP 绕过限流；只应在服务确实位于可信反向代理之后时开启

## 素材与许可

> [!WARNING]
> 姿势、服装、动画服装图片及原始数据版权归原作者 [@giaaibusi](https://x.com/giaaibusi) 所有。原站未声明开放许可，并明确禁止批量自动下载和再分发（包括加工后的版本）。公开镜像包含这些素材；使用前需确认已获授权。自行构建时也需遵守原站的素材条款
>
> 表情、历代服饰、场景、光影、道具和家具图片来自上游公开发布的素材站；公开分发镜像前请自行确认各来源的许可条款
>
> CharaDB 发型与动画服装图片只能从原站热链加载，镜像不包含这些图片；请勿下载或再分发

- 人像库：CC0 1.0，作者 [@agi_aibusi](https://x.com/agi_aibusi)
- 表情：WaveSpeed AI Emotion Gallery，头模为 ICT FaceKit（© USC Institute for Creative Technologies，MIT）
- 历代服饰、场景、光影、道具、家具：Shisei（wquguru），CC0 1.0
- 发型与部分动画服装：たき AI / CharaDB，标签数据 CC0；图片仅热链 [CharaDB](https://charadb-2fi.pages.dev/)，禁止下载与再分发
- 深度姿势：热链 [AI Pose Depth Gallery](https://ai-pose-depth-gallery.pages.dev/)，图片不打包进镜像；原站同样禁止批量下载和再分发
- 上游代码与文案：[MIT](https://github.com/atuizz/posewear/blob/41f3dc3/LICENSE)；MIT 不覆盖图片或原始数据

## 相关链接

- [PoseWear 在线体验](https://posewear.pages.dev)
- [上游项目](https://github.com/atuizz/posewear)
- [Docker Hub](https://hub.docker.com/r/aliuq/posewear)
