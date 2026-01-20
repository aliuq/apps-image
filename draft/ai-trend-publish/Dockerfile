FROM alpine/git AS git
WORKDIR /app
ARG VERSION=7a8ceb4
RUN git clone https://github.com/OpenAISpace/ai-trend-publish . && git checkout ${VERSION}

FROM denoland/deno:2.5.0

WORKDIR /app

COPY --from=git /app .

CMD [ "deno", "task", "start" ]

EXPOSE 8000
