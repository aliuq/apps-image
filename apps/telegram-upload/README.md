# telegram-upload

+ [Dockerfile](./Dockerfile)
+ 上游仓库: <https://github.com/Nekmo/telegram-upload.git>

## 使用

```bash
docker run -it --rm --name telegram-upload aliuq/telegram-upload upload --help
```

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t telegram-upload:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t telegram-upload:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name telegram-upload telegram-upload:0.0.1 upload --help
```
