# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
# Copy any other necessary files (like assets if they're not in dist)
COPY --from=builder /app/src/modules/Admin/config ./src/modules/Admin/config

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
