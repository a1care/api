# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code and config
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files (for runtime reference)
COPY package*.json ./

# Copy PRE-PRUNED node_modules and built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
