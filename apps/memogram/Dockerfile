FROM alpine/git AS base
WORKDIR /app
RUN git clone --branch v0.2.2 https://github.com/usememos/telegram-integration.git .

# Build stage
FROM cgr.dev/chainguard/go:latest AS builder
WORKDIR /app
COPY --from=base /app/go.mod ./
COPY --from=base /app/go.sum ./
RUN go mod download
COPY --from=base /app .
RUN CGO_ENABLED=0 go build -o memogram ./bin/memogram
RUN chmod +x memogram

# Run stage
FROM cgr.dev/chainguard/static:latest-glibc
WORKDIR /app
ENV SERVER_ADDR=dns:localhost:5230
ENV BOT_TOKEN=your_telegram_bot_token
COPY --from=base /app/.env.example .env
COPY --from=builder /app/memogram .
CMD ["./memogram"]
