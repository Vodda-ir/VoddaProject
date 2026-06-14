# ── build stage ──
FROM golang:1.24-bullseye AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG SERVER_PORT=3420
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/vodda-backend ./cmd/server

# ── runtime stage ──
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -u 10001 vodda
WORKDIR /app
COPY --from=build /out/vodda-backend /app/vodda-backend

USER vodda
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3420
EXPOSE 3420
ENTRYPOINT ["/app/vodda-backend"]
