JSON Hero is an open-source, beautiful JSON explorer for the web that lets you browse, search and navigate your JSON files at speed. 🚀. Built with 💜 by the Trigger.dev team.

JSON Hero 是一款开源、美观的 Web JSON 浏览器，可让您快速浏览、搜索和导航 JSON 文件。 🚀。由 Trigger.dev 团队使用 💜 构建。

+ [Dockerfile](https://github.com/aliuq/apps-image/tree/master/apps/jsonhero-web)
+ Upstream: <https://github.com/triggerdotdev/jsonhero-web>

## Usage

```bash
docker run -it --rm --name jsonhero -p 8787:8787 -e SESSION_SECRET=your-secret aliuq/jsonhero-web

docker rm -f jsonhero
```

## Build Image

```bash
docker buildx build -f ./Dockerfile -t jsonhero:0.0.1 --no-cache --load .
docker buildx build --progress=plain -f ./Dockerfile -t jsonhero:0.0.1 --no-cache --load .
```

## Run

```bash
docker run -it --rm -e  --name jsonhero -p 8787:8787 jsonhero:0.0.1
```
