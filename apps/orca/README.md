# Orca

> 在桌面、移动设备和远程工作区运行多种编码 Agent 的开源应用，提供 Docker 镜像部署方式

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/orca)](https://hub.docker.com/r/aliuq/orca)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/orca/latest)](https://hub.docker.com/r/aliuq/orca)

## 项目信息

- **上游仓库**: [stablyai/orca](https://github.com/stablyai/orca)
- **Docker 镜像**: [aliuq/orca](https://hub.docker.com/r/aliuq/orca)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/orca)

## 快速开始

将 `ORCA_PAIRING_ADDRESS` 替换为客户端可访问的 Docker 主机 IP 或域名，例如局域网 IP、Tailscale IP 或已配置的域名

```bash
docker run -d \
  --name orca \
  --restart unless-stopped \
  --hostname orca-node \
  -p 6768:6768 \
  -e ORCA_PAIRING_ADDRESS=192.168.1.20 \
  -v orca-data:/root/.config/orca \
  -v orca-workspace:/root/orca \
  aliuq/orca:latest
```

容器默认以 `serve` 模式启动 Orca，监听 `0.0.0.0:6768`；端口映射负责转发连接，`ORCA_PAIRING_ADDRESS` 用于提供客户端连接地址；没有设置配对地址且没有启用容器内 Tailscale 时，服务会在启动时报错

配置和工作区分别保存在 `/root/.config/orca` 与 `/root/orca`，示例使用 Docker volume 持久化这两个目录，也可以将 volume 替换为宿主机目录挂载

### 使用 Docker Compose

创建 `compose.yaml`，并将示例地址改为客户端可访问的主机地址

```yaml
services:
  orca:
    image: aliuq/orca:latest
    container_name: orca
    hostname: orca-node
    restart: unless-stopped
    ports:
      - '6768:6768'
    environment:
      ORCA_PAIRING_ADDRESS: 192.168.1.20
    volumes:
      - orca-data:/root/.config/orca
      - orca-workspace:/root/orca

volumes:
  orca-data:
  orca-workspace:
```

启动服务：

```bash
docker compose up -d
```

## 通过 Tailscale 连接

镜像默认不启动 Tailscale；容器需要加入 tailnet 时，需开放 TUN 设备和网络权限，并持久化 `/var/lib/tailscale` 中的设备状态

### 使用预认证密钥

预认证模式适合自动化部署；首次注册时在宿主 shell 中设置 `TAILSCALE_AUTH_KEY`，已有状态卷可在后续启动时复用设备身份

```bash
export TAILSCALE_AUTH_KEY=tskey-auth-example

docker run -d \
  --name orca \
  --restart unless-stopped \
  --device=/dev/net/tun \
  --cap-add=NET_ADMIN \
  --cap-add=NET_RAW \
  -p 6768:6768 \
  -e TAILSCALE_KEY_TYPE=pre-auth \
  -e TAILSCALE_AUTH_KEY \
  -v tailscale-state:/var/lib/tailscale \
  -v orca-data:/root/.config/orca \
  -v orca-workspace:/root/orca \
  aliuq/orca:latest
```

成功连接后，若没有设置 `ORCA_PAIRING_ADDRESS`，入口脚本会使用容器的 Tailscale IPv4 地址作为配对地址

### 交互式登录或使用 Headscale

将 `TAILSCALE_KEY_TYPE` 设为 `machine` 可通过交互式登录加入 tailnet；首次启动时，认证链接会显示在容器日志中；完成认证后，设备状态保存在 `tailscale-state` 卷中

```bash
docker run -d \
  --name orca \
  --device=/dev/net/tun \
  --cap-add=NET_ADMIN \
  --cap-add=NET_RAW \
  -p 6768:6768 \
  -e TAILSCALE_KEY_TYPE=machine \
  -e TAILSCALE_LOGIN_SERVER=https://headscale.example.com \
  -v tailscale-state:/var/lib/tailscale \
  -v orca-data:/root/.config/orca \
  -v orca-workspace:/root/orca \
  aliuq/orca:latest
```

使用 Tailscale 官方控制服务器时，省略 `TAILSCALE_LOGIN_SERVER`；使用 Headscale 时填写控制服务器 URL

## 配置参考

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `RUN_MODE` | `serve` | `serve` 启动 Orca 服务，`cli` 运行 Orca CLI，其他值将容器参数作为命令执行 |
| `ORCA_BIND` | `0.0.0.0` | `serve` 模式的监听地址；可用命令行 `--bind` 覆盖 |
| `ORCA_PORT` | `6768` | `serve` 模式的监听端口；可用命令行 `--port` 覆盖 |
| `ORCA_PAIRING_ADDRESS` | 无 | 客户端可访问的配对地址；可用命令行 `--pairing-address` 覆盖；容器内 Tailscale 连接成功时，未设置该变量会回退到 Tailscale IPv4 地址 |
| `TAILSCALE_KEY_TYPE` | `none` | `none` 不启动 Tailscale；`pre-auth` 使用预认证密钥；`machine` 等待交互式登录 |
| `TAILSCALE_AUTH_KEY` | 无 | `pre-auth` 首次注册使用的密钥；已有设备状态时可复用注册信息 |
| `TAILSCALE_LOGIN_SERVER` | 无 | 可选的 Tailscale 控制服务器地址，用于 Headscale 等自建服务 |

`serve` 模式也接受 `--bind`、`--port` 和 `--pairing-address` 参数，命令行参数优先于对应的 `ORCA_*` 环境变量

## CLI 与容器命令

通过 `RUN_MODE=cli` 执行 Orca CLI，例如查看服务参数：

```bash
docker run --rm -e RUN_MODE=cli aliuq/orca:latest serve --help
```

也可以在运行中的容器里启动 shell：

```bash
docker exec -it orca sh
```

`RUN_MODE` 设置为 `custom` 等其他值时，入口脚本会直接执行容器参数；该模式必须提供命令

```bash
docker run --rm -e RUN_MODE=custom aliuq/orca:latest sh
```

## 本地构建

```bash
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/orca
docker buildx build -f ./Dockerfile -t orca:local --load .
```
