# ray.so

> Create beautiful images of your code - Turn your code into stunning visuals

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/rayso)](https://hub.docker.com/r/aliuq/rayso)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/rayso)](https://hub.docker.com/r/aliuq/rayso)

## 项目信息

- **官方仓库**: [raycast/ray-so](https://github.com/raycast/ray-so)
- **Docker 镜像**: [aliuq/rayso](https://hub.docker.com/r/aliuq/rayso)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/blob/master/apps/rayso/Dockerfile)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name rayso -p 3000:3000 aliuq/rayso:latest
# 测试
docker run --rm --name rayso -p 3000:3000 aliuq/rayso:latest
```

访问 `http://localhost:3000` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: rayso
services:
  rayso:
    image: aliuq/rayso:latest
    container_name: rayso
    restart: unless-stopped
    ports:
      - '3000:3000'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 🎨 **代码美化**: 将代码转换为精美的图像
- 🌈 **多种主题**: 支持多种配色方案和样式
- 💻 **语言支持**: 支持多种编程语言高亮
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🖼️ **自定义背景**: 支持自定义背景颜色和图案
- 📐 **灵活尺寸**: 可自定义代码片段的尺寸和边距
- 🔤 **字体选择**: 多种等宽字体可选
- 💾 **快速导出**: 一键导出为 PNG、SVG 格式

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/rayso

# 构建镜像
docker buildx build -f ./Dockerfile -t rayso:local --load .

# 运行测试
docker run --rm --name rayso-local -p 3000:3000 rayso:local
```

### 调试模式

```bash
# 以开发模式运行（显示构建日志）
docker buildx build --progress=plain -f ./Dockerfile -t rayso:debug --load .
```

## 使用说明

1. 在代码编辑区域粘贴或输入你的代码
2. 选择编程语言以启用语法高亮
3. 自定义主题、背景和样式
4. 调整代码片段的尺寸和外观
5. 点击导出按钮保存为图片

## 相关链接

- [https://ray.so](https://ray.so)
- [GitHub Repository](https://github.com/raycast/ray-so)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
