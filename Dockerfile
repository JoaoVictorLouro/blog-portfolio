FROM denoland/deno:alpine AS theme-assets
WORKDIR /build
RUN apk add --no-cache bash curl file
COPY scripts/ghost-cdn-manifest.json scripts/sync-ghost-cdn-assets.mjs scripts/
COPY scripts/build-material-symbols-subset.sh scripts/build-material-symbols-subset.mjs scripts/
COPY scripts/build-theme-i18n.mjs scripts/
COPY scripts/i18n/locales.mjs scripts/i18n/locales.mjs
COPY content/themes/neon-protocol/locales content/themes/neon-protocol/locales
RUN mkdir -p content/themes/neon-protocol/assets content/themes/neon-protocol/partials \
    && deno run -A scripts/sync-ghost-cdn-assets.mjs \
    && bash scripts/build-material-symbols-subset.sh \
    && deno run -A scripts/build-theme-i18n.mjs

FROM ghost:6-alpine

COPY scripts/docker-entrypoint.sh /usr/local/bin/ghost-vendor-entrypoint.sh
RUN chmod +x /usr/local/bin/ghost-vendor-entrypoint.sh

COPY content/themes /var/lib/ghost/content/themes
COPY --from=theme-assets /build/content/themes/neon-protocol/partials/np-t.hbs \
    /var/lib/ghost/content/themes/neon-protocol/partials/np-t.hbs
COPY --from=theme-assets /build/content/themes/neon-protocol/partials/np-locale-options.hbs \
    /var/lib/ghost/content/themes/neon-protocol/partials/np-locale-options.hbs
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
