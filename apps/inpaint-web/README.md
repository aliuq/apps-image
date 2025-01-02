# inpaint-web

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/inpaint-web)
+ 上游仓库: <https://github.com/lxfater/inpaint-web.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t inpaint-web:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t inpaint-web:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name inpaint-web -p 8081:80 inpaint-web:0.0.1
```
