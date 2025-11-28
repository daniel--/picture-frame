# Multi-stage build for production

# Stage 1: Build frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
COPY index.html ./

# Build the frontend
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS production

WORKDIR /app

# Install all dependencies (tsx is needed to run TypeScript)
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.html ./

# Copy server source files
COPY src/server ./src/server
COPY src/scripts ./src/scripts
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Create directories for uploads (will be mounted as volume in docker-compose)
RUN mkdir -p public/uploads/thumbnails

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the production server
CMD ["node", "--import", "tsx/esm", "src/server/main.ts"]

