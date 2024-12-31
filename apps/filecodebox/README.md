# filecodebox

上游仓库: <https://github.com/vastsa/FileCodeBox.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t filecodebox:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t filecodebox:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name filecodebox -p 12345:12345 filecodebox:0.0.1
```
