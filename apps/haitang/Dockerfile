FROM alpine/git AS source
WORKDIR /app
ARG VERSION=3d5ff9c
RUN git clone https://github.com/javayhu/haitang . && git checkout ${VERSION}
    # Analytics: Umami + Google Analytics
RUN echo "" > src/layouts/Analytics.astro && \
    # Comment: Giscus
    echo "" > src/components/Giscus.astro

FROM node:20.19.4-alpine3.22 AS base
WORKDIR /app

FROM base AS build
COPY --from=source /app .
RUN corepack enable && corepack prepare --activate
RUN yarn && yarn astro add node -y && yarn add @astrojs/node@8
RUN yarn build

FROM base AS deps
COPY --from=build /app/package.json /app/yarn.lock* ./
RUN corepack enable && corepack prepare --activate
RUN yarn install --production --frozen-lockfile

FROM base
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
