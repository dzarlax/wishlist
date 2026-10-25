FROM node:24-alpine AS builder

WORKDIR /app

# Copy frontend package files and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Development stage
FROM node:24-alpine AS dev

WORKDIR /app

# Install root and frontend dependencies once in the image. Source code is bind-mounted by docker-compose.dev.yml.
COPY package*.json ./
RUN npm ci
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

EXPOSE 3000 5173

CMD ["npm", "run", "dev"]

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend and built frontend
COPY server.js ./
COPY server ./server
COPY --from=builder /app/frontend/dist ./public

# Setup permissions
RUN chown -R node:node /app

USER node

EXPOSE 3000

ENV ADMIN_PASSWORD=wishlist2025
ENV PORT=3000
# Multi-user setup: USERS="slug:Name:password:emoji,slug:Name:password:emoji"
# ENV USERS="dima:Dima:password1:🎮,anna:Anna:password2:💅"

CMD ["node", "server.js"]
