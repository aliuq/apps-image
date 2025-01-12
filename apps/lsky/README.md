# Lsky 兰空图床

test19

+ 文档: <https://docs.lsky.pro/>
+ 仓库: <https://github.com/lsky-org/lsky-pro>

## 构建镜像

```bash
docker buildx build -f ./Dockerfile -t lsky:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t lsky:0.0.1 --no-cache --load .
```

## 使用

```shell
docker run --rm --name lsky -p 8089:80 aliuq/lsky:latest

# 挂载目录
docker run --rm --name lsky -v ./data:/app -p 8089:80 aliuq/lsky:latest
```

环境变量

+ `UPLOAD_MAX_FILESIZE`: 文件上传限制, 默认 `10M`
+ `POST_MAX_SIZE`: POST 数据最大限制, 默认 `10M`

### docker-compose

```yaml
services:
  lsky:
    image: aliuq/lsky:latest
    container_name: lsky
    restart: unless-stopped
    ports:
      - 8089:80
    environment:
      - UPLOAD_MAX_FILESIZE=20M
      - POST_MAX_SIZE=15M
    volumes:
      - ./data:/app
    depends_on:
      - lsky-db
  lsky-db:
    image: postgres:15-alpine
    container_name: lsky-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: lsky
      POSTGRES_PASSWORD: lsky
      POSTGRES_DB: lsky
      PGDATA: /pg-data
    ports:
      - 5432:5432
    volumes:
      - ./db_data:/pg-data
```

数据库配置

![screenshot](/app/lsky/assets/screenshot.png)
