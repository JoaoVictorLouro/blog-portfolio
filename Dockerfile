FROM denoland/deno:alpine AS theme-assets
WORKDIR /build
RUN apk add --no-cache bash curl file
COPY scripts/ghost-cdn-manifest.json scripts/sync-ghost-cdn-assets.mjs scripts/
COPY scripts/build-material-symbols-subset.sh scripts/build-material-symbols-subset.mjs scripts/
RUN mkdir -p content/themes/neon-protocol/assets \
    && deno run -A scripts/sync-ghost-cdn-assets.mjs \
    && bash scripts/build-material-symbols-subset.sh

FROM ghost:6-alpine

COPY scripts/docker-entrypoint.sh /usr/local/bin/ghost-vendor-entrypoint.sh
RUN chmod +x /usr/local/bin/ghost-vendor-entrypoint.sh

COPY content/themes /var/lib/ghost/content/themes
COPY --from=theme-assets /build/content/themes/neon-protocol/assets/js/vendor \
    /ghostassets/js/vendor
COPY --from=theme-assets /build/content/themes/neon-protocol/assets/css/vendor \
    /ghostassets/css/vendor
COPY --from=theme-assets /build/content/themes/neon-protocol/assets/fonts \
    /ghostassets/fonts
COPY content/settings /var/lib/ghost/content/settings
COPY content/settings/redirects.yaml /var/lib/ghost/content/data/redirects.yaml
COPY content/public /var/lib/ghost/content/public

ENTRYPOINT ["/usr/local/bin/ghost-vendor-entrypoint.sh"]
CMD ["node", "current/index.js"]
