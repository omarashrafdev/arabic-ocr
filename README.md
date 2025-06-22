# Arabic PDF OCR Toolkit (Node.js)

A comprehensive Node.js toolkit for converting PDF files to text using Arabic OCR. Includes four specialized tools:

1. **PDF to Images** - Convert PDF pages to numbered image files
2. **Images to Text** - Perform Arabic OCR on image files
3. **PDF to Text** - Complete pipeline: PDF → Images → OCR Text (all-in-one)
4. **Batch PDF to Text** - Process multiple PDFs in bulk with progress tracking

## Features

- ✅ **PDF to Images**: Convert each PDF page to numbered images (page_001.png, etc.)
- ✅ **Arabic OCR**: Extract Arabic text from images using Tesseract.js
- ✅ **Page Separators**: Clear separators between pages in text output
- ✅ **Multiple Formats**: Support for PNG, JPEG image formats
- ✅ **Quality Control**: Adjustable DPI and image quality settings
- ✅ **Error Handling**: Robust error handling with detailed logging
- ✅ **All-in-One**: Complete PDF to text conversion in one command
- ✅ **Cleanup Options**: Keep or remove temporary images after OCR
- ✅ **Batch Processing**: Process multiple PDFs with progress tracking and summary reports
- ✅ **Concurrent Processing**: Process multiple files simultaneously for faster results

## Prerequisites

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

## Installation

1. **Install Node.js dependencies:**

```bash
npm install
```

2. **Make the script executable (Linux/macOS):**

```bash
chmod +x pdf-to-images.js
```

## Usage

### 🚀 Quick Start (All-in-One Solution)

**Convert PDF directly to Arabic text:**

```bash
# Simple conversion
node pdf-to-text.js your-document.pdf

# Output: your-document_ocr_results.txt with Arabic text and page separators
```

**Advanced options:**

```bash
# Keep images after OCR + custom output
node pdf-to-text.js document.pdf -o arabic_text.txt --keep-images

# High quality conversion
node pdf-to-text.js document.pdf -d 600 -f png
```

### 🔄 Batch Processing (Multiple PDFs)

**Process entire directory:**

```bash
# Process all PDFs in a directory
node batch-pdf-to-text.js /path/to/pdf/folder/

# Output: batch_ocr_results/ with [filename]_ocr.txt for each PDF
```

**Advanced batch options:**

```bash
# Custom output folder + keep images
node batch-pdf-to-text.js pdf_folder/ -O my_results -K

# Process 3 PDFs simultaneously (faster)
node batch-pdf-to-text.js pdf_folder/ -C 3

# High quality batch processing
node batch-pdf-to-text.js pdf_folder/ -D 600 -F png
```

### 📋 Individual Tools

**1. PDF to Images Only:**

```bash
# Basic conversion
node pdf-to-images.js document.pdf

# Custom folder and format
node pdf-to-images.js document.pdf -o my_images -f jpeg -d 600
```

**2. Images to Text Only:**

```bash
# OCR existing images
node ocr-images.js image_folder/

# Custom output file
node ocr-images.js image_folder/ -o my_results.txt
```

### 📝 Command Line Options

**pdf-to-text.js (All-in-One):**

- `<pdf-file>`: PDF file to convert (required)
- `-o, --output <file>`: Output text file (default: [pdf-name]\_ocr_results.txt)
- `-k, --keep-images`: Keep extracted images after OCR
- `-f, --format <format>`: Image format - png, jpeg (default: png)
- `-d, --density <dpi>`: Image DPI quality (default: 300)
- `-l, --language <lang>`: OCR language code (default: ara)

**pdf-to-images.js:**

- `<pdf-path>`: Path to PDF file (required)
- `-o, --output <folder>`: Output folder (default: {PDF_name}\_images)
- `-f, --format <format>`: Image format - png, jpeg (default: png)
- `-d, --density <dpi>`: DPI quality (default: 300)
- `-q, --quality <quality>`: JPEG quality 1-100 (default: 100)

**ocr-images.js:**

- `<images-folder>`: Folder containing images (required)
- `-o, --output <file>`: Output text file (default: ocr_results.txt)
- `-l, --language <lang>`: OCR language (default: ara)
- `-p, --prefix <prefix>`: Image file prefix filter (default: page\_)

**batch-pdf-to-text.js:**

- `<input>`: PDF file or directory containing PDFs (required)
- `-O, --output-folder <folder>`: Output folder (default: batch_ocr_results)
- `-K, --keep-images`: Keep extracted images after OCR
- `-F, --format <format>`: Image format - png, jpeg (default: png)
- `-D, --density <dpi>`: Image DPI quality (default: 300)
- `-L, --language <lang>`: OCR language (default: ara)
- `-C, --concurrent <num>`: Number of concurrent processes (default: 1)

### 📄 Example Output

**Text file with page separators:**

```
=== PAGE 1 ===

نموذج | 5 نماذج استرشاديه " فيزياء " للصف الثالث الثانوي
الأسئلة الموضوعية (اختيار من متعدد)

=== PAGE 2 ===

تابع الأسئلة الموضوعية...
```

**Image files:**

```
document_images/
├── page_001.png
├── page_002.png
├── page_003.png
└── ...
```

**Batch processing output:**

```
batch_ocr_results/
├── document1_ocr.txt
├── document2_ocr.txt
├── document3_ocr.txt
├── batch_processing_summary.txt
└── (temp image folders - removed if not --keep-images)
```

## Programmatic Usage

You can also use the converter in your own Node.js scripts:

```javascript
const { convertPdfToImages } = require("./pdf-to-images.js");

async function example() {
  try {
    // Convert PDF to images
    const imagePaths = await convertPdfToImages("document.pdf", {
      outputFolder: "my_images",
      imageFormat: "png",
      density: 300,
      quality: 100,
    });

    console.log(`Converted ${imagePaths.length} pages`);
    console.log("Saved files:", imagePaths);
  } catch (error) {
    console.error("Conversion failed:", error.message);
  }
}

example();
```

## Global Installation (Optional)

To use the command globally:

```bash
npm install -g .
```

Then you can use it anywhere:

```bash
pdf-to-images document.pdf
```

## Troubleshooting

1. **"gm/convert not found"**: Install GraphicsMagick or ImageMagick on your system
2. **"Cannot find module 'pdf2pic'"**: Run `npm install` to install dependencies
3. **Low image quality**: Increase the DPI value (e.g., 600 or higher)
4. **Large file sizes**: Use JPEG format with lower quality (e.g., -q 85)
5. **Permission errors**: Make sure you have write permissions in the output directory
6. **Memory issues with large PDFs**: Reduce DPI or process smaller PDFs

### System-Specific Issues

**Linux/macOS:**

- Make sure GraphicsMagick/ImageMagick is in your PATH
- Try: `gm version` or `convert -version` to verify installation

**Windows:**

- Ensure GraphicsMagick/ImageMagick is properly installed and in PATH
- You may need to restart your terminal after installation

## Performance Tips

- **PNG**: Best quality, larger files
- **JPEG**: Smaller files, adjustable quality
- **DPI 150-300**: Good for most documents
- **DPI 600+**: High quality for print/detailed work
