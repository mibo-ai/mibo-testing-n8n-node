FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY nodes/ ./nodes/
COPY credentials/ ./credentials/
COPY scripts/copy-icons.mjs ./scripts/

RUN npm run build
RUN npm prune --production

FROM n8nio/n8n:latest

USER root
ARG NODE_PATH=/usr/local/lib/node_modules/n8n-nodes-mibo-testing
RUN mkdir -p ${NODE_PATH}

COPY --from=builder /build/dist ${NODE_PATH}/dist
COPY --from=builder /build/package.json ${NODE_PATH}/
COPY --from=builder /build/node_modules ${NODE_PATH}/node_modules

WORKDIR ${NODE_PATH}
RUN npm link

ENV N8N_LISTEN_ADDRESS=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_USER_FOLDER=/home/node/.n8n
ENV N8N_CUSTOM_EXTENSIONS=${NODE_PATH}
