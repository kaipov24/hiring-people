FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache dumb-init

USER node

ENTRYPOINT ["dumb-init", "--"]
