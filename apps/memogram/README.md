# memogram

上游仓库: <https://github.com/usememos/telegram-integration.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t memogram:0.0.1 --no-cache --load .
docker buildx build -f ./Dockerfile.official -t memogram:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t memogram:0.0.1 --no-cache --load .
```
