# Use node:20-alpine as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install production dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy application source code
COPY . .

# Expose port 5000
EXPOSE 5000

# Set environment to production by default
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]
