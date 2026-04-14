#Dockerfile
# Build stage
FROM golang:1.26 AS builder

WORKDIR /app
COPY . .

RUN go mod tidy
RUN go build -o main .

# Run stage
FROM gcr.io/distroless/base-debian12

WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]