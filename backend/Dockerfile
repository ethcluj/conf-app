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

# Remove source files and keep only compiled files
RUN rm -rf src tsconfig.json

EXPOSE 3001

CMD ["npm", "start"] 