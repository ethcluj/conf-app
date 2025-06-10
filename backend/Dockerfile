FROM node:22-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Verify the build output
RUN echo "Verifying build output..." && \
    ls -la dist || echo "dist directory not found" && \
    ls -la dist/src || echo "dist/src directory not found" && \
    ls -la dist/src/index.js || echo "dist/src/index.js not found"

# Remove source files for production
RUN if [ -f dist/src/index.js ]; then \
      echo "Build successful, removing source files..." && \
      rm -rf src __tests__ tsconfig.json; \
    else \
      echo "Build failed, dist/src/index.js not found" && \
      exit 1; \
    fi

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/src/index.js"]