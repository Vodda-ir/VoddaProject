# ── build stage ──
FROM golang:1.25-bookworm AS build
WORKDIR /src

COPY go.mod go.sum ./
# GOPROXY قابل override است — در شبکه‌های محدود از میرور (مثلاً goproxy.cn) استفاده کنید.
ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}
RUN go mod download

COPY . .
ARG SERVER_PORT=3420
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/vodda-backend ./cmd/server

# ── runtime stage ──
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -u 10001 vodda && \
    mkdir -p /app/uploads && \
    chown -R vodda:vodda /app
WORKDIR /app
COPY --from=build /out/vodda-backend /app/vodda-backend

USER vodda
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3420
EXPOSE 3420
ENTRYPOINT ["/app/vodda-backend"]
