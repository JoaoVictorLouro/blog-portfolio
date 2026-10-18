FROM golang:1.23-alpine AS build

WORKDIR /src
COPY content-api/ content-api/

RUN cd content-api && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /content-api ./cmd/content-api

FROM alpine:3.21

RUN apk add --no-cache wget

COPY --from=build /content-api /usr/local/bin/content-api

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1

CMD ["content-api"]
