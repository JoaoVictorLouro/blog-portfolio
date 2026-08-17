FROM ghost:6-alpine

COPY content/themes /var/lib/ghost/content/themes
COPY content/settings /var/lib/ghost/content/settings
COPY content/public /var/lib/ghost/content/public
