# telemirror

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/telemirror)
上游仓库: <https://github.com/khoben/telemirror.git>

## 使用

```bash
docker run -it --rm --name telemirror -p 8081:8000 aliuq/telemirror
```

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t telemirror:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t telemirror:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name telemirror -p 8081:8000 telemirror:0.0.1
```
