# Arabic OCR Web App - Production Deployment Guide

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone <your-repository-url>
   cd arabic-ocr-web-app
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Build and run with Docker Compose**

   ```bash
   # Development
   docker-compose up --build

   # Production with nginx
   docker-compose --profile production up --build -d
   ```

### Manual Installation

1. **Prerequisites**

   - Node.js 16+ and npm 8+
   - Tesseract OCR with Arabic language data
   - ImageMagick or GraphicsMagick
   - Poppler utilities

2. **Install system dependencies (Ubuntu/Debian)**

   ```bash
   sudo apt-get update
   sudo apt-get install -y \
     tesseract-ocr \
     tesseract-ocr-ara \
     tesseract-ocr-eng \
     poppler-utils \
     imagemagick \
     graphicsmagick
   ```

3. **Install Node.js dependencies**

   ```bash
   npm ci --only=production
   ```

4. **Set up directories**

   ```bash
   mkdir -p uploads temp output logs ssl
   ```

5. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env file with your settings
   ```

6. **Start the application**
   ```bash
   npm start
   ```

## 📋 Configuration

### Environment Variables

| Variable                  | Description                          | Default           |
| ------------------------- | ------------------------------------ | ----------------- |
| `NODE_ENV`                | Environment (production/development) | `production`      |
| `PORT`                    | Server port                          | `3000`            |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window              | `15`              |
| `MAX_FILE_SIZE`           | Max upload size in bytes             | `52428800` (50MB) |
| `DEFAULT_OCR_LANGUAGE`    | Default OCR language                 | `ara`             |
| `CLEANUP_DELAY_MS`        | File cleanup delay                   | `600000` (10 min) |

### Security Features

- **Helmet.js**: Security headers
- **Rate limiting**: Configurable request limits
- **File validation**: Only PDF files allowed
- **Size limits**: Configurable file size limits
- **CSRF protection**: Built-in protection
- **Content Security Policy**: Configured for security

## 🔧 CLI Tools

The application includes several CLI tools in the `cli/` directory:

```bash
# Convert PDF to images
npm run cli:pdf-to-images -- input.pdf

# Extract text from PDF
npm run cli:pdf-to-text -- input.pdf

# Batch process multiple PDFs
npm run cli:batch-processing -- /path/to/pdfs/

# OCR images directly
npm run cli:ocr-images -- image.png
```

## 🧹 File Cleanup System

The application includes an automatic file cleanup system to prevent disk space issues:

### Automatic Cleanup

The server runs automatic cleanup based on environment variables:

```bash
# Default retention periods
FILE_CLEANER_UPLOADS_RETENTION_DAYS=1      # Upload files
FILE_CLEANER_OUTPUT_RETENTION_DAYS=7       # OCR output files
FILE_CLEANER_TEMP_RETENTION_HOURS=2        # Temporary files
FILE_CLEANER_LOGS_RETENTION_DAYS=30        # Log files
FILE_CLEANER_AUTO_CLEANUP_ENABLED=true     # Enable auto cleanup
FILE_CLEANER_AUTO_CLEANUP_INTERVAL_HOURS=6 # Cleanup frequency
```

### Manual Cleanup Commands

```bash
# Run cleanup with current settings
npm run clean

# Preview what would be deleted (dry run)
npm run clean:dry-run

# Clean all uploads immediately
npm run clean:uploads

# Force clean everything (dangerous!)
npm run clean:force

# Check disk usage
npm run disk-usage
```

### Advanced Cleanup Options

```bash
# Custom retention periods
node cli/file-cleaner.js --uploads-retention 2 --output-retention 14 --verbose

# Clean specific directories only
node cli/file-cleaner.js --temp-retention 1 --logs-retention 7

# Dry run with custom settings
node cli/file-cleaner.js --dry-run --verbose --uploads-retention 0
```

### API Endpoints

```bash
# Manual cleanup via API
curl -X POST http://localhost:3000/cleanup \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# Check disk usage
curl http://localhost:3000/disk-usage
```

### Cron Setup

For system-level scheduling:

```bash
# Copy and customize the crontab
cp config/crontab.example config/crontab.conf
# Edit paths and schedules
nano config/crontab.conf
# Install crontab
crontab config/crontab.conf
```

## 📊 Monitoring

### Health Check

- Endpoint: `GET /health`
- Returns: `{"status": "OK", "timestamp": "..."}`

### Logs

```bash
# View application logs
npm run logs

# Docker logs
docker-compose logs -f arabic-ocr
```

### Log Files

- Application logs: `logs/app.log`
- Nginx logs: `logs/nginx/`

## 🚦 Reverse Proxy Setup

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 SSL/TLS Setup

1. **Obtain SSL certificates** (Let's Encrypt recommended)

   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. **Update environment variables**
   ```bash
   SSL_CERT_PATH=/path/to/cert.pem
   SSL_KEY_PATH=/path/to/private.key
   PROTOCOL=https
   DOMAIN=your-domain.com
   ```

## 🐳 Production Docker Setup

### Multi-stage Build

The Dockerfile uses multi-stage builds for optimization:

- System dependencies installation
- Node.js dependencies
- Security hardening (non-root user)
- Health checks

### Volumes

- `./uploads:/app/uploads` - File uploads
- `./output:/app/output` - OCR results
- `./temp:/app/temp` - Temporary files
- `./logs:/app/logs` - Application logs

## 🔄 Maintenance

### Cleanup

```bash
# Clean temporary files
npm run clean

# Clean Docker volumes
docker-compose down -v
```

### Updates

```bash
# Update dependencies
npm update

# Rebuild Docker image
docker-compose build --no-cache
```

### Backup

Important directories to backup:

- Configuration files (`.env`)
- SSL certificates (`ssl/`)
- Logs (`logs/`)
- Persistent data if any

## 🚨 Troubleshooting

### Common Issues

1. **OCR not working**

   - Check Tesseract installation: `tesseract --version`
   - Verify Arabic language data: `tesseract --list-langs`

2. **File upload fails**

   - Check file size limits
   - Verify disk space in upload directory
   - Check file permissions

3. **High memory usage**
   - Reduce concurrent OCR operations
   - Implement queue system for heavy loads
   - Monitor with `docker stats` or `htop`

### Performance Optimization

1. **CPU intensive operations**

   - Use worker threads for OCR
   - Implement job queue (Redis/Bull)
   - Scale horizontally with load balancer

2. **Memory optimization**
   - Cleanup temporary files promptly
   - Monitor memory usage
   - Set appropriate Node.js memory limits

## 📈 Scaling

For high-traffic deployments:

1. Use a load balancer (nginx, HAProxy)
2. Implement Redis for session storage
3. Use a job queue for OCR processing
4. Consider microservices architecture
5. Use CDN for static assets

## 🔐 Security Checklist

- ✅ Environment variables configured
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ File validation in place
- ✅ Non-root Docker user
- ✅ SSL/TLS configured
- ✅ Regular security updates
- ✅ Monitoring and logging

## 📞 Support

For issues and questions:

1. Check the logs: `npm run logs`
2. Review this deployment guide
3. Check the main README.md
4. Open an issue on GitHub
