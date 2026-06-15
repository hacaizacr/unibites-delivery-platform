# --- Stage 1: Build binary ---
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy dependency and source files
COPY go.mod main.go ./

# Explicitly download packages to resolve go.sum
RUN go get github.com/gorilla/websocket
RUN go get github.com/lib/pq

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chat-service main.go

# --- Stage 2: Run container ---
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from the builder
COPY --from=builder /app/chat-service .

# Expose port
EXPOSE 8003

# Run service
CMD ["./chat-service"]
