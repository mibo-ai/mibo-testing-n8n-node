FROM node:20-alpine AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production
FROM n8nio/n8n:latest
USER root
RUN mkdir -p /opt/n8n/custom-nodes
COPY --from=builder /build /opt/n8n/custom-nodes/n8n-nodes-mibo-testing
WORKDIR /opt/n8n/custom-nodes/n8n-nodes-mibo-testing
RUN npm link
WORKDIR /home/node
RUN chown -R node:node /home/node
USER node
ENV N8N_PORT=5678
ENV N8N_LISTEN_ADDRESS=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_CUSTOM_EXTENSIONS=/opt/n8n/custom-nodes/n8n-nodes-mibo-testing
