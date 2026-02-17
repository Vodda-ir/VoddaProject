# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
# ENV GOPROXY=https://goproxy.io,direct
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o /backend .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /backend .
CMD ["/app/backend"]
