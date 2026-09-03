FROM denoland/deno:alpine

WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

COPY .npmrc .npmrc
COPY content-api/ content-api/
COPY scripts/i18n/ scripts/i18n/

RUN deno cache content-api/main.ts

EXPOSE 8080

CMD ["deno", "run", "-A", "content-api/main.ts"]
