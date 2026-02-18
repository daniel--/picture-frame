# Multi-stage build for production

# Stage 1: Build frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Accept git hash and app name as build arguments
ARG GIT_HASH=unknown
ENV GIT_HASH=${GIT_HASH}
ARG APP_NAME="Family Photos"
ENV APP_NAME=${APP_NAME}

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./
COPY vite.config.ts ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
COPY index.html ./

# Copy public directory (contains static assets including PWA icons)
COPY public ./public

# Build the frontend and compile the server
RUN npm run build && npm run build:server

# Stage 2: Production runtime
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built files from builder (frontend + compiled server)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.html ./
COPY --from=builder /app/public ./public

# Copy only what drizzle-kit needs at startup (schema source + config)
COPY src/server/db ./src/server/db
COPY drizzle.config.ts ./

# Copy and set up entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories for uploads (will be mounted as volume in docker-compose)
RUN mkdir -p public/uploads/thumbnails

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ARG APP_NAME="Family Photos"
ENV APP_NAME=${APP_NAME}

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint script to run migrations and start server
ENTRYPOINT ["./docker-entrypoint.sh"]

