# filecodebox

**弃用**: 不再更新，请使用官方镜像 [`lanol/filecodebox:beta`](https://hub.docker.com/r/lanol/filecodebox/tags)

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/filecodebox)
+ 上游仓库: <https://github.com/vastsa/FileCodeBox.git>

> 官方 beta 镜像已经包含有最新主题，请使用官方镜像

+ 镜像地址: <https://hub.docker.com/r/lanol/filecodebox>
+ 最新版本: `lanol/filecodebox:beta`
+ 默认密码: `FileCodeBox2023`

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t filecodebox:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t filecodebox:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name filecodebox -p 12345:12345 filecodebox:0.0.1
```
