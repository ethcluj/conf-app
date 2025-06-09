FROM node:18-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Debug: Show directory contents
RUN ls -la

# Debug: Show tsconfig.json content
RUN cat tsconfig.json

# Build TypeScript
RUN npm run build

# Debug: Show output directory
RUN ls -la

# Debug: Show dist directory if it exists
RUN ls -la dist || echo "dist directory not found"

# For production, we'll keep the source files for now to debug
# RUN rm -rf src tsconfig.json

EXPOSE 3001

# Start the application in production mode
CMD ["node", "dist/src/index.js"]