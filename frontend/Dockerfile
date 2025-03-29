FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Create necessary directories if they don't exist
RUN mkdir -p src public

EXPOSE 3000

# Use development mode for hot reloading
CMD ["npm", "start"] 