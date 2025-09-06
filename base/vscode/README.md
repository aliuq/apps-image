# VSCode

> 基于 VS Code CLI 的容器化开发环境，预装了现代化开发工具和终端体验

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/vscode)](https://hub.docker.com/r/aliuq/vscode)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/vscode)](https://hub.docker.com/r/aliuq/vscode)

## 镜像变体

本项目提供两个镜像变体以满足不同的使用需求：

### 标准版（`latest`）- 推荐

- 基于非特权用户 `coder` (UID 1000)
- 遵循 Docker 安全最佳实践
- 适合生产环境和安全敏感场景
- SSH 禁用 root 登录，仅允许指定用户访问

### 稳定版（`stable`）

- 基于 `root` 用户运行
- 简化权限管理，便于快速部署
- 适合开发和测试环境
- 减少权限相关的配置复杂性

```bash
# 使用标准版（推荐）
docker run -d --name vscode -p 8000:8000 aliuq/vscode:latest

# 使用稳定版
docker run -d --name vscode-stable -p 8000:8000 aliuq/vscode:stable
```

## 项目信息

- **官方仓库**: [microsoft/vscode](https://github.com/microsoft/vscode)
- **Docker 镜像**: [`aliuq/vscode`](https://hub.docker.com/r/aliuq/vscode)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/blob/master/base/vscode/Dockerfile)

## 快速开始

### Web IDE 模式（默认）

```bash
# 基础使用
docker run -d --name vscode -p 8000:8000 aliuq/vscode:latest

# 带访问令牌
docker run -d --name vscode -p 8000:8000 -e TOKEN=your-secret-token aliuq/vscode:latest

# 映射工作目录
docker run -d --name vscode -p 8000:8000 -v $(pwd):/home/workspace aliuq/vscode:latest
```

访问 `http://localhost:8000` 即可使用 Web IDE

### 隧道模式

> 暂时无法直连，只能通过官方的中继服务器进行通信

```bash
docker run -it --rm -e RUN_MODE=tunnel aliuq/vscode:latest
```

### SSH 模式

```bash
# 使用公钥认证
docker run -d --name vscode-ssh -p 2222:22 \
  -e RUN_MODE=ssh \
  -e PUBLIC_KEY="$(cat ~/.ssh/id_rsa.pub)" \
  -v $(pwd):/home/workspace \
  aliuq/vscode:latest

# 使用公钥文件
docker run -d --name vscode-ssh -p 2222:22 \
  -e RUN_MODE=ssh \
  -e PUBLIC_KEY_FILE=/tmp/id_rsa.pub \
  -v ~/.ssh/id_rsa.pub:/tmp/id_rsa.pub \
  -v $(pwd):/home/workspace \
  aliuq/vscode:latest

# SSH 连接
ssh -i /tmp/id_rsa -p 2222 coder@localhost
```

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: vscode
services:
  vscode:
    image: aliuq/vscode:latest
    container_name: vscode
    hostname: aliuq-vscode # 可选，设置容器主机名，更清晰
    restart: unless-stopped
    ports:
      - '8000:8000'
    volumes:
      - ./workspace:/home/workspace
    environment:
      - TOKEN=your-secret-token # 可选，设置访问令牌
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

### 🛠️ 预装开发工具

- **VS Code CLI** - 最新版本的 Visual Studio Code 命令行界面
- **eza** - 现代化的 ls 替代品，提供彩色文件列表
- **fzf** - 强大的模糊搜索工具
- **zoxide** - 智能的 cd 命令替代品
- **mise** - 现代化的运行时管理器

### 🎨 终端体验

- **Zsh** 作为默认 Shell
- **Oh My Zsh** 配置框架
- **Starship** 跨 Shell 的提示符
- **CascadiaCode Nerd Font** 编程字体
- 预配置的插件：
  - `zsh-autosuggestions` - 命令自动建议
  - `zsh-syntax-highlighting` - 语法高亮
  - `extract` - 智能解压缩
  - `fzf`, `eza`, `zoxide`, `mise` 集成

### 🔒 安全特性

- 非 root 用户运行（`coder` 用户）
- 支持 sudo 权限
- 可选的访问令牌保护
- SSH 密钥认证（SSH 模式）
- 禁用密码认证和 root 登录

## 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `RUN_MODE` | `serve-web` | 运行模式：`serve-web`, `tunnel`, `custom`, `empty`, `ssh` |
| `HOST` | `0.0.0.0` | 绑定的主机地址 |
| `PORT` | `8000` | 监听端口 |
| `TOKEN` | - | 访问令牌（可选） |
| `STARSHIP_CONFIG` | - | Starship 配置文件路径或 URL |
| `PUBLIC_KEY` | - | SSH 公钥内容（SSH 模式） |
| `PUBLIC_KEY_FILE` | - | SSH 公钥文件路径（SSH 模式） |

## 运行模式

### serve-web（默认）

启动 VS Code Web 服务器，可通过浏览器访问

```bash
docker run -p 8000:8000 aliuq/vscode:latest
```

### tunnel

启动 VS Code 隧道模式，可通过 vscode.dev 远程访问

```bash
docker run -it -e RUN_MODE=tunnel aliuq/vscode:latest
```

### custom

自定义 VS Code 命令

```bash
# code --version
docker run -e RUN_MODE=custom aliuq/vscode:latest --version
```

### empty

不启动 VS Code，直接进入容器

```bash
docker run -it -e RUN_MODE=empty aliuq/vscode:latest /bin/zsh
```

### ssh

启动 SSH 服务器，可通过 SSH 远程连接

```bash
# 使用公钥认证
docker run -d -p 2222:22 -e RUN_MODE=ssh -e PUBLIC_KEY="$(cat ~/.ssh/id_rsa.pub)" aliuq/vscode:latest

# 连接到容器
ssh -p 2222 coder@localhost
```

## 自定义配置

### Starship 提示符配置

可以通过以下方式自定义 Starship 配置：

1. **本地文件**：

```bash
docker run -v /path/to/starship.toml:/tmp/starship.toml aliuq/vscode:latest
```

1. **环境变量指定路径**：

```bash
docker run -e STARSHIP_CONFIG=/path/to/custom.toml -v /path/to/custom.toml:/path/to/custom.toml aliuq/vscode:latest
```

1. **远程 URL**：

```bash
docker run -e STARSHIP_CONFIG=https://example.com/starship.toml aliuq/vscode:latest
```

### 工作目录持久化

```bash
# 映射当前目录作为工作空间
docker run -v $(pwd):/home/workspace aliuq/vscode:latest

# 映射特定目录
docker run -v /path/to/your/project:/home/workspace aliuq/vscode:latest
```

## 使用示例

### 开发 Node.js 项目

```bash
docker run -d \
  --name vscode-nodejs \
  -p 8000:8000 \
  -v $(pwd):/home/workspace \
  -e TOKEN=my-secret-token \
  aliuq/vscode:latest
```

### 临时开发环境

```bash
docker run -it --rm \
  -p 8000:8000 \
  -v $(pwd):/home/workspace \
  aliuq/vscode:latest
```

### 远程开发（隧道模式）

```bash
docker run -it --rm \
  -e RUN_MODE=tunnel \
  -v $(pwd):/home/workspace \
  aliuq/vscode:latest
```

### SSH 远程开发

```bash
# 启动 SSH 服务
docker run -d \
  --name vscode-ssh \
  -p 2222:22 \
  -e RUN_MODE=ssh \
  -e PUBLIC_KEY="$(cat ~/.ssh/id_rsa.pub)" \
  -v $(pwd):/home/workspace \
  aliuq/vscode:latest

# 通过 SSH 连接
ssh -p 2222 coder@localhost
```

## 网络访问

- **Web IDE**: `http://localhost:8000`
- **带令牌**: `http://localhost:8000/?tkn=your-token`
- **SSH 连接**: `ssh -p 2222 coder@localhost`

## 注意事项

1. 首次启动可能需要一些时间来初始化 VS Code 服务
2. 建议设置访问令牌以提高安全性
3. 工作目录默认为 `/home/workspace`
4. **latest**以非特权用户 `coder` 运行，**stable**以 `root` 运行
5. 隧道模式需要登录 GitHub/Microsoft 账户
6. SSH 模式仅支持公钥认证，已禁用密码认证
7. SSH 服务监听 22 端口，Web IDE 监听 8000 端口
8. **推荐使用latest**以获得更好的安全性

## 参考引用

1. <https://github.com/ahmadnassri/docker-vscode-server>
2. <https://github.com/nerasse/my-code-server>
3. <https://github.com/gitpod-io/openvscode-server>
