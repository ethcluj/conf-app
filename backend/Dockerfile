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

# Build TypeScript
RUN npm run build

# Verify the build output exists
RUN ls -la dist/

# Verify dist directory exists before removing source files
RUN ls -la dist/ && echo "Dist directory verified"

# Remove source files and keep only compiled files for production
RUN rm -rf src tsconfig.json

EXPOSE 3001

# Start the application in production mode
CMD ["npm", "start"]