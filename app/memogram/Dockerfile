FROM alpine:3.19.1 as base
WORKDIR /app
RUN apk add git && git clone https://github.com/usememos/telegram-integration.git .

FROM golang:1.22.2-alpine AS builder
WORKDIR /app
COPY --from=base /app/go.mod ./
COPY --from=base /app/go.sum ./
RUN go mod download
COPY --from=base /app ./
RUN CGO_ENABLED=0 go build -o memogram ./bin/memogram
RUN chmod +x memogram

# Run stage
FROM alpine:latest

LABEL version="0.0.1"
LABEL repository="https://github.com/usememos/telegram-integration"

WORKDIR /app
ENV SERVER_ADDR=dns:localhost:5230
ENV BOT_TOKEN=your_telegram_bot_token
COPY --from=base /app/.env.example .env
COPY --from=builder /app/memogram .
CMD ["./memogram"]
