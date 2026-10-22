FROM alpine/git AS source
WORKDIR /app
ARG VERSION=3d5ff9c
RUN git clone https://github.com/aliuq/haitang . && git checkout ${VERSION}
    # Analytics: Umami + Google Analytics
RUN echo "" > src/layouts/Analytics.astro && \
    # Comment: Giscus
    echo "" > src/components/Giscus.astro

FROM node:24.22.1-alpine3.24 AS runtime
WORKDIR /app

# 构建环境使用 Debian，生产环境保持 Alpine
FROM node:24.22.1-bookworm AS build
WORKDIR /app
COPY --from=source /app .
# 固定 Yarn 1，并移除将被 Node 适配器替换的 Vercel 依赖
RUN node -e 'const fs = require("node:fs"); const file = "package.json"; const pkg = JSON.parse(fs.readFileSync(file, "utf8")); pkg.packageManager = "yarn@1.22.22"; delete pkg.dependencies["@astrojs/vercel"]; fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");'
RUN corepack enable && corepack prepare --activate
# 首次安装即替换旧 SQLite，按构建平台下载 Node 24 预编译包
RUN yarn add --exact better-sqlite3@12.11.1 @astrojs/sitemap@3.2.1 @astrojs/node@8.3.4
# Astro 4 不会自动覆盖已有适配器，显式切换为独立 Node 服务
RUN node -e 'const fs = require("node:fs"); const file = "astro.config.mjs"; fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("import vercel from \"@astrojs/vercel/serverless\";", "import node from \"@astrojs/node\";").replace("adapter: vercel()", "adapter: node({ mode: \"standalone\" })"));'
RUN yarn build

# 原生依赖必须在与生产环境相同的 Alpine/musl 平台安装
FROM runtime AS deps
COPY --from=build /app/package.json /app/yarn.lock ./
RUN corepack enable && corepack prepare --activate
RUN yarn install --production --frozen-lockfile

FROM runtime
ENV TZ=Asia/Shanghai
ENV HOST=0.0.0.0

COPY --from=build /app/dist ./dist/
COPY --from=deps /app/node_modules ./node_modules/
COPY --from=deps /app/package.json ./

# 清理 node_modules 中不必要的文件
RUN find ./node_modules -name "*.md" -type f -delete && \
    find ./node_modules -name "*.ts" -type f -delete && \
    find ./node_modules -name "*.map" -type f -delete && \
    find ./node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "examples" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
