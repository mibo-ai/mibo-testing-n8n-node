FROM node:20-alpine AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY nodes/ ./nodes/
COPY credentials/ ./credentials/
COPY scripts/ ./scripts/
RUN npm run build

FROM n8nio/n8n:latest

USER root
ARG NODE_PATH=/home/node/custom-nodes/node_modules/n8n-nodes-mibo-testing
RUN mkdir -p ${NODE_PATH}
COPY --from=builder /build/dist ${NODE_PATH}/dist
COPY --from=builder /build/package.json ${NODE_PATH}/

RUN chown -R node:node /home/node/custom-nodes /home/node/.n8n

# --- STARTUP SCRIPT ---
# We need to run as root initially to fix volume permissions, then switch to node
USER root
RUN echo '#!/bin/sh\nchown -R node:node /home/node/.n8n\nexec su-exec node n8n' > /home/node/start.sh && \
    chmod +x /home/node/start.sh

# --- CONFIGURATION ---
ENV N8N_CUSTOM_EXTENSIONS=/home/node/custom-nodes
ENV N8N_PORT=${PORT:-5678}
ENV N8N_LISTEN_ADDRESS=0.0.0.0
ENV N8N_PROTOCOL=https

EXPOSE ${N8N_PORT}

CMD ["/home/node/start.sh"]
