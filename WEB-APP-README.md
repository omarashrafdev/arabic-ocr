# Arabic PDF OCR Web Application

A secure and user-friendly web application for extracting Arabic text from PDF documents using OCR technology. Built with Express.js and featuring a modern, responsive interface.

## 🌟 Features

- **🔒 Secure**: File validation, rate limiting, and proper security headers
- **📱 Responsive**: Modern UI that works on desktop and mobile devices
- **🚀 Fast**: Efficient OCR processing with progress indicators
- **📄 Multiple Formats**: Download results as TXT or DOCX files
- **🌍 Multi-language**: Support for Arabic, English, and other languages
- **🧹 Auto-cleanup**: Automatic temporary file cleanup
- **⚡ Real-time**: Live progress updates and file preview

## 🛠️ Prerequisites

### System Requirements

You need **GraphicsMagick** or **ImageMagick** installed on your system:

**For Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install graphicsmagick
# OR
sudo apt-get install imagemagick
```

**For macOS:**

```bash
brew install graphicsmagick
# OR
brew install imagemagick
```

**For Windows:**

- Download GraphicsMagick from: http://www.graphicsmagick.org/download.html
- Or download ImageMagick from: https://imagemagick.org/script/download.php#windows

## 📦 Installation

1. **Clone or navigate to the project directory**

2. **Install Node.js dependencies:**

```bash
npm install
```

3. **Create required directories:**

```bash
mkdir -p uploads temp output public
```

## 🚀 Usage

### Development Mode

```bash
npm run dev
```

This starts the server with nodemon for automatic restarts during development.

### Production Mode

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🎯 How to Use

1. **Open your browser** and go to `http://localhost:3000`

2. **Upload a PDF file** by:

   - Clicking the upload area and selecting a file
   - Or dragging and dropping a PDF file onto the upload area

3. **Select the OCR language** (default is Arabic)

4. **Click "Extract Text"** to start processing

5. **Wait for processing** - you'll see a progress bar and live updates

6. **Download your results** in either:
   - **TXT format** - Plain text file
   - **DOCX format** - Microsoft Word document

## ⚙️ Configuration

### Environment Variables

You can customize the application using environment variables:

```bash
# Port (default: 3000)
PORT=3000

# File size limit in bytes (default: 50MB)
MAX_FILE_SIZE=52428800

# Rate limit per IP (default: 10 requests per 15 minutes)
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=900000
```

### Supported Languages

- `ara` - Arabic (العربية) - Default
- `eng` - English
- `ara+eng` - Arabic + English
- `fra` - French
- `deu` - German
- `spa` - Spanish
- And more Tesseract-supported languages

## 🔒 Security Features

- **File Type Validation**: Only PDF files are accepted
- **File Size Limits**: Maximum 50MB per file
- **Rate Limiting**: 10 requests per IP per 15 minutes
- **Security Headers**: Helmet.js for security headers
- **Input Sanitization**: Proper file validation and cleanup
- **Temporary File Cleanup**: Automatic cleanup after processing
- **Session Management**: Secure session handling for downloads

## 📁 API Endpoints

### `POST /upload`

Upload and process a PDF file.

**Request:**

- `pdf` (file): PDF file to process
- `language` (string): OCR language code (optional, default: 'ara')

**Response:**

```json
{
  "success": true,
  "message": "PDF processed successfully",
  "sessionId": "uuid-string",
  "preview": "Text preview...",
  "originalFilename": "document.pdf"
}
```

### `GET /download/:sessionId/:format`

Download processed text file.

**Parameters:**

- `sessionId`: Session ID from upload response
- `format`: Either 'txt' or 'docx'

### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🏗️ Project Structure

```
arabic-ocr/
├── server.js              # Main Express server
├── pdf-to-text.js         # OCR processing logic
├── pdf-to-images.js       # PDF to images conversion
├── ocr-images.js          # Image OCR processing
├── batch-pdf-to-text.js   # Batch processing (CLI)
├── package.json           # Dependencies and scripts
├── public/
│   └── index.html         # Web interface
├── uploads/               # Temporary uploaded files
├── temp/                  # Temporary processing files
├── output/                # Processed output files
└── README.md              # CLI tools documentation
```

## 🚀 Deployment

### Docker Deployment (Recommended)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install GraphicsMagick
RUN apk add --no-cache graphicsmagick

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directories
RUN mkdir -p uploads temp output

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t arabic-ocr-app .
docker run -p 3000:3000 arabic-ocr-app
```

### Traditional Deployment

1. **Install dependencies on server**
2. **Set environment variables**
3. **Use PM2 for process management:**

```bash
npm install -g pm2
pm2 start server.js --name "arabic-ocr"
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### Common Issues

1. **"gm/convert not found"**

   - Install GraphicsMagick or ImageMagick on your system

2. **"File too large"**

   - Check file size limit (50MB default)
   - Increase limit via environment variable if needed

3. **OCR accuracy issues**

   - Ensure PDF has good quality text/images
   - Try different OCR languages
   - Higher DPI images generally give better results

4. **Memory issues**
   - Large PDFs may consume significant memory
   - Consider processing smaller files or increasing server memory

### Debug Mode

Run with debug logging:

```bash
DEBUG=* npm start
```

## 📝 License

MIT License - see the original README.md for full license text.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues related to:

- **Web application**: Check server logs and browser console
- **OCR accuracy**: Ensure input PDFs have clear text
- **Performance**: Monitor server resources during processing
- **Installation**: Verify all system dependencies are installed
