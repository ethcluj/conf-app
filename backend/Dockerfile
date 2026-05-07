FROM node:22-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install yarn
RUN corepack enable && corepack prepare yarn@4.10.3 --activate

# Configure yarn to use node_modules instead of PnP
ENV YARN_NODE_LINKER=node-modules

# Copy package files
COPY package*.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

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