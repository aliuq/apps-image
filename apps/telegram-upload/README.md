# telegram-upload

上游仓库: <https://github.com/Nekmo/telegram-upload.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t telegram-upload:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t telegram-upload:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name telegram-upload telegram-upload:0.0.1 upload --help
```
