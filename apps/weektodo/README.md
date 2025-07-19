# WeekTodo

> 一个简洁美观的每周任务管理工具，帮助您高效规划和管理一周的待办事项

[![Docker Pulls](https://img.shields.io/docker/pulls/aliuq/weektodo)](https://hub.docker.com/r/aliuq/weektodo)
[![Docker Image Size](https://img.shields.io/docker/image-size/aliuq/weektodo)](https://hub.docker.com/r/aliuq/weektodo)

## 项目信息

- **上游仓库**: [manuelernestog/weektodo](https://github.com/manuelernestog/weektodo)
- **Docker 镜像**: [aliuq/weektodo](https://hub.docker.com/r/aliuq/weektodo)
- **Dockerfile**: [查看构建文件](https://github.com/aliuq/apps-image/tree/master/apps/weektodo)

## 快速开始

### 使用 Docker 运行

```bash
docker run -d --name weektodo -p 8000:80 aliuq/weektodo:latest
```

访问 `http://localhost:8000` 即可使用

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
name: weektodo
services:
  weektodo:
    image: aliuq/weektodo:latest
    container_name: weektodo
    restart: unless-stopped
    ports:
      - '8000:80'
```

运行服务：

```bash
docker-compose up -d
```

## 功能特性

- 📅 **每周视图**: 以周为单位展示和管理待办事项
- ✅ **任务管理**: 支持添加、编辑、删除和标记完成任务
- 🎨 **简洁界面**: 现代化的用户界面设计，操作简单直观
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 💾 **本地存储**: 数据保存在浏览器本地，无需注册账户
- 🔄 **实时更新**: 任务状态实时更新和保存

## 开发

### 本地构建

```bash
# 克隆仓库
git clone https://github.com/aliuq/apps-image.git
cd apps-image/apps/weektodo

# 构建镜像
docker buildx build -f ./Dockerfile -t weektodo:local --load .

# 运行测试
docker run --rm --name weektodo-local -p 8000:80 weektodo:local
```

### 调试模式

```bash
# 显示详细构建日志
docker buildx build --progress=plain -f ./Dockerfile -t weektodo:debug --no-cache --load .
```

## 注意事项

- 数据存储在浏览器本地，清除浏览器数据会丢失任务
- 建议定期导出重要任务数据作为备份
- 使用现代浏览器以获得最佳体验

## 相关链接

- [项目演示](https://weektodo.me/)

---

> 📝 该文档由 AI 辅助生成并整理，如有问题请随时反馈
