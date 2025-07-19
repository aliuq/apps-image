# 鱼了个鱼

> 羊了个羊纯前端实现版，支持自定义关卡、图案和无限道具的休闲益智游戏

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/yulegeyu)](https://hub.docker.com/r/aliuq/yulegeyu)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/yulegeyu)](https://hub.docker.com/r/aliuq/yulegeyu)

## 项目信息

- **上游仓库**: [liyupi/yulegeyu](https://github.com/liyupi/yulegeyu)
- **Docker 镜像**: [aliuq/yulegeyu](https://hub.docker.com/r/aliuq/yulegeyu)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/yulegeyu/Dockerfile)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name yulegeyu -p 8000:80 aliuq/yulegeyu:latest
```

访问 `http://localhost:8000` 即可开始游戏

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: yulegeyu
services:
  yulegeyu:
    image: aliuq/yulegeyu:latest
    container_name: yulegeyu
    restart: unless-stopped
    ports:
      - '8000:80'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🎮 **经典玩法**: 完整还原羊了个羊的核心游戏机制
- 🛠️ **自定义关卡**: 支持创建和编辑自定义游戏关卡
- 🎨 **自定义图案**: 可以替换游戏中的图案和主题
- ⚡ **无限道具**: 提供无限的游戏道具，降低游戏难度
- 💻 **纯前端实现**: 基于 Web 技术开发，无需后端服务
- 📱 **响应式设计**: 支持在各种设备上流畅游戏

## 游戏玩法

1. **游戏目标**: 将相同的三个图案消除，直到清空所有方块
2. **操作方式**: 点击方块将其移动到底部卡槽
3. **消除规则**: 当三个相同图案聚集在卡槽时自动消除
4. **胜利条件**: 成功清空所有方块即可过关

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/yulegeyu

# 构建镜像
docker buildx build -f ./Dockerfile -t yulegeyu:local --load .

# 运行测试
docker run --rm --name yulegeyu-local -p 8000:80 yulegeyu:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t yulegeyu:debug --no-cache --load .
```

## 相关链接

- [在线体验](https://yulegeyu.yupi.icu/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
