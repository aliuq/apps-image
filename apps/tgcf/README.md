# tgcf

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/tgcf)
+ 上游仓库: <https://github.com/aahnik/tgcf.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t tgcf:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t tgcf:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name tgcf -p 8501:8501 tgcf:0.0.1
```
