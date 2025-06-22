# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for OCR and PDF processing
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-dev \
    tesseract-ocr-data-ara \
    tesseract-ocr-data-eng \
    ghostscript \
    poppler-utils \
    imagemagick \
    graphicsmagick \
    && rm -rf /var/cache/apk/*

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p uploads temp output logs

# Set proper permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"] 