FROM golang:1.24-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o PROJECTNAME ./cmd/PROJECTNAME

FROM alpine:3.21

RUN adduser -D -u 1001 -g 0 -s /sbin/nologin -h /app appuser

WORKDIR /app

COPY --from=builder --chown=1001:0 /build/PROJECTNAME .

USER 1001

EXPOSE 8080

ENTRYPOINT ["./PROJECTNAME"]
