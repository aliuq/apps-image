# Icones

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/icones)
+ 上游仓库: <https://github.com/antfu-collective/icones.git>

## 使用

```bash
docker run -it --rm --name icones -p 8081:80 aliuq/icones
```

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t icones:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t icones:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name icones -p 8081:80 icones:0.0.1
```
