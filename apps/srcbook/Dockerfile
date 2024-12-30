FROM node:22.7.0-alpine3.20 AS builder
WORKDIR /app

RUN yarn add srcbook && \
  rm -rf package* yarn* && \
  cp -R ./node_modules/srcbook/dist . && \
  cp -R ./node_modules/srcbook/public . && \
  cp -R ./node_modules/srcbook/package.json . && \
  rm -rf ./node_modules && \
  yarn install --prod

RUN echo "#!/usr/bin/env node" > /srcbook && \
  echo "import program from '/app/dist/src/cli.mjs';" >> /srcbook && \
  echo "program();" >> /srcbook

FROM node:22.7.0-alpine3.20

WORKDIR /app
COPY --from=builder /app .
COPY --from=builder /srcbook /usr/local/bin/srcbook

RUN chmod +x /usr/local/bin/srcbook

CMD ["srcbook", "start"]

EXPOSE 2150
VOLUME /root/.srcbook
VOLUME /root/.npm
