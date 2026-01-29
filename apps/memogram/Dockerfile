FROM alpine/git AS source
WORKDIR /app
ARG VERSION=v0.3.1
RUN git clone --branch ${VERSION} https://github.com/usememos/telegram-integration .

# Build stage
FROM cgr.dev/chainguard/go:latest AS builder
WORKDIR /app
COPY --from=source /app/go.mod ./
COPY --from=source /app/go.sum ./
RUN go mod download
COPY --from=source /app .
RUN CGO_ENABLED=0 go build -o memogram ./bin/memogram
RUN chmod +x memogram

# Run stage
FROM cgr.dev/chainguard/static:latest-glibc
WORKDIR /app
COPY --from=source /app/.env.example .env
COPY --from=builder /app/memogram .
CMD ["./memogram"]
