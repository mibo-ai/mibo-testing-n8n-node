# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY nodes/ ./nodes/
COPY credentials/ ./credentials/
COPY scripts/ ./scripts/ 
RUN npm run build
RUN npm prune --production

# --- Stage 2: Runner ---
FROM n8nio/n8n:latest
USER root
COPY --from=builder /build /opt/n8n-nodes-mibo-testing
WORKDIR /usr/local/lib/node_modules/n8n
RUN npm install /opt/n8n-nodes-mibo-testing
WORKDIR /home/node

ENV N8N_LISTEN_ADDRESS=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_USER_FOLDER=/home/node/.n8n
ENV N8N_CUSTOM_EXTENSIONS=${NODE_PATH}
