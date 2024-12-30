# Icones

上游仓库: <https://github.com/antfu-collective/icones.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t icones:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile.another -t srcbook:0.0.2 --no-cache --load .
```
