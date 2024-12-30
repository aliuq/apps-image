# yulegeyu

上游仓库: <https://github.com/liyupi/yulegeyu.git>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t yulegeyu:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t yulegeyu:0.0.1 --no-cache --load .
```

## 运行

```bash
docker run -it --rm --name yulegeyu -p 8081:80 yulegeyu:0.0.1
```
