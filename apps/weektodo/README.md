# weektodo

上游仓库: <https://github.com/manuelernestog/weektodo.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t weektodo:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t weektodo:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name weektodo -p 8081:80 weektodo:0.0.1
```
