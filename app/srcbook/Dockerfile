FROM node:22.7.0-alpine3.20 AS builder
WORKDIR /app

RUN yarn add srcbook && \
  mv node_modules/srcbook . && \
  rm node_modules yarn.lock package.json -rf && \
  mv srcbook/* . && \
  rm node_modules -rf && \
  yarn install --prod && \
  find ./node_modules -type f \( -name "*.d.ts" -o -name "*.log" -o -name "*.bak" -o -name "DS_Store" -o -name "LICENSE" -o -name "*.d.mts" -o -name "*.txt" \) -delete

RUN echo "#!/usr/bin/env node" > /srcbook && \
  echo "import program from '/app/src/cli.mjs';" >> /srcbook && \
  echo "program();" >> /srcbook

FROM node:22.7.0-alpine3.20 AS runner

LABEL version="0.0.2"
LABEL repository="https://github.com/srcbookdev/srcbook"

WORKDIR /app
COPY --from=builder /app .
COPY --from=builder /srcbook /usr/local/bin/srcbook

RUN chmod +x /usr/local/bin/srcbook

CMD [ "srcbook", "start" ]

EXPOSE 2150
VOLUME /root/.srcbook
VOLUME /root/.npm
