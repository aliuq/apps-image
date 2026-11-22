# 衣姿 PoseWear

> 姿势、服装、人像参考图库，附中英文提示词，可在浏览器里用自备 API Key 进行 AI 试穿

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/posewear)](https://hub.docker.com/r/aliuq/posewear)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/posewear)](https://hub.docker.com/r/aliuq/posewear)

## 项目信息

- **上游仓库**: [atuizz/posewear](https://github.com/atuizz/posewear)
- **Docker 镜像**: [aliuq/posewear](https://hub.docker.com/r/aliuq/posewear)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/posewear/Dockerfile)
- **在线体验**: [https://posewear.pages.dev](https://posewear.pages.dev)

## 快速开始

```bash
docker run -d --name posewear -p 8080:80 aliuq/posewear:latest
```

访问 `http://localhost:8080`。容器内监听 80；如果希望直接使用 80，可改为 `-p 80:80`。

> 镜像约 8.2GB，内置姿势、服装、动画服装和人像素材；深度姿势按上游设计热链原站，AI 试穿需要联网。

### 使用 Docker Compose

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

```bash
docker compose up -d
```

## 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `80` | 容器内监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |

### AI 试穿

支持 OpenAI、Gemini、豆包 Seedream 和 OpenAI 兼容中转。API Key 只保存在浏览器 localStorage，不会写入容器。

镜像内置 `/api/proxy`，用于火山方舟等跨域接口、结果图片下载和自定义中转；只转发官方接口域名，自定义中转需显式选择，拒绝内网地址，并有简单的分钟级限流。

> 反向代理请保留原始 `Host` 请求头（例如 Nginx 的 `proxy_set_header Host $host;`），否则 `/api/proxy` 的同源校验会拒绝请求。

## 素材与许可

> [!WARNING]
> 姿势、服装、动画服装图片及原始数据版权归原作者 [@giaaibusi](https://x.com/giaaibusi) 所有。原站未声明开放许可，并明确禁止批量自动下载和再分发（包括加工后的版本）。把素材打进公开镜像属于再分发，请仅在**已获原作者授权**或**仅私有部署**的前提下使用；否则请改用不内置图片的热链构建。

- 人像库：CC0 1.0，作者 [@agi_aibusi](https://x.com/agi_aibusi)
- 深度姿势：热链 [AI Pose Depth Gallery](https://ai-pose-depth-gallery.pages.dev/)，图片不进镜像；原站同样禁止批量下载和再分发
- 上游代码与文案：[MIT](https://github.com/atuizz/posewear/blob/main/LICENSE)；MIT 不覆盖图片或原始数据

## 开发

### 本地构建

```bash
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/posewear
bash pre.sh
docker build -t posewear:local .
docker run --rm -p 8080:80 posewear:local
```

构建依赖 [mise](https://mise.jdx.dev/)：`pre.sh` 会执行 `mise use python@3.12 -g`，在构建机的全局配置中固定 Python 3.12。上游 `build.py` 在模块顶层创建进程池，依赖 3.14 之前的 `fork` 启动方式；随即用 `mise exec` 选用该版本。

`pre.sh` 会下载约 7.2GB 素材并生成 `dist/`，建议至少准备 30GB 磁盘。重复构建可加 `POSEWEAR_KEEP_RAW=1` 保留 `assets-raw`：

```bash
POSEWEAR_KEEP_RAW=1 bash pre.sh
```

自定义站点域名（影响生成的详情页、sitemap 和分享卡片；首页 canonical 由上游模板固定）：

```bash
POSEWEAR_SITE=https://posewear.example.com bash pre.sh
```
