# cobalt

cobalt 的 web 端容器

+ 仓库: <https://github.com/imputnet/cobalt>

## 使用

```bash
docker run --rm --name cobalt -p 8080:80 aliuq/cobalt:latest
```

环境变量

+ `BASE_API`: cobalt API 地址, 默认 `https://api.cobalt.tools`

docker-compose 示例

```yaml
version: "3.9"

services:
  cobalt-api:
    image: ghcr.io/imputnet/cobalt:10
    restart: unless-stopped
    container_name: cobalt-api
    ports:
      - 9000:9000
    environment:
      - API_URL=http://<Your Address>:9000
      - COOKIE_PATH=/cookies.json
    volumes:
      - ./cookies.json:/cookies.json

  cobalt-web:
    image: ghcr.io/aliuq/cobalt:latest
    restart: unless-stopped
    container_name: cobalt-web
    ports:
      - 8080:80
    environment:
      - BASE_API=http://<Your Address>:9000
```
