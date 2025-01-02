# cobalt

cobalt 的 web 端容器

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/cobalt)
+ 上游仓库: <https://github.com/imputnet/cobalt>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t cobalt:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t cobalt:0.0.1 --no-cache --load .
```

## 运行

使用 docker-compose 进行运行，高级配置请参考上游仓库

```bash
services:
  cobalt-api:
    image: ghcr.io/imputnet/cobalt:10
    restart: always
    container_name: cobalt-api
    ports:
      - 9000:9000
    environment:
      - API_URL=http://localhost:9000

  cobalt-web:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    container_name: cobalt-web
    ports:
      - 8080:80
    environment:
      - BASE_API=http://localhost:9000
```

## 使用

环境变量

+ `BASE_API`: cobalt API 地址, 默认 `https://api.cobalt.tools`
