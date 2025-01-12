# yulegeyu

羊了个羊纯前端实现版【鱼了个鱼】，自定义关卡 + 图案 + 无限道具

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/yulegeyu/Dockerfile)
+ 上游仓库: <https://github.com/liyupi/yulegeyu.git>

## Usage

```bash
docker run -it --rm --name yulegeyu -p 8081:80 aliuq/yulegeyu
```

## Build Image

```bash
docker buildx build -f ./Dockerfile -t yulegeyu:0.0.1 --no-cache --load .
# docker buildx build --progress=plain -f ./Dockerfile -t yulegeyu:0.0.1 --no-cache --load .
```

## Test Image

```bash
docker run -it --rm --name yulegeyu -p 8081:80 yulegeyu:0.0.1
```
