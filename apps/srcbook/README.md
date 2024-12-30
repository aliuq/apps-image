# srcbook

上游仓库: <https://github.com/srcbookdev/srcbook.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t srcbook:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t srcbook:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name srcbook -p 2150:2150 srcbook:0.0.1
```
