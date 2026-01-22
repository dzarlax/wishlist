FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend package files and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend and built frontend
COPY server.js ./
COPY --from=builder /app/frontend/dist ./public

# Create directory for database
RUN mkdir -p /app/data && \
    chown -R node:node /app

USER node

EXPOSE 3000

ENV ADMIN_PASSWORD=wishlist2025
ENV PORT=3000

CMD ["node", "server.js"]
