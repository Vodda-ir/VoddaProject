FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
ENV GOPROXY=https://goproxy.io,direct
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /backend .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /backend .
CMD ["/app/backend"]
