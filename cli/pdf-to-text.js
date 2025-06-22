#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const pdf2pic = require("pdf2pic");
const Tesseract = require("tesseract.js");

async function convertPdfToImages(pdfPath, options = {}) {
  const {
    outputFolder = null,
    imageFormat = "png",
    density = 300,
    quality = 100,
  } = options;

  // Validate PDF file exists
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  // Get PDF filename without extension
  const pdfName = path.basename(pdfPath, path.extname(pdfPath));

  // Set default output folder if not provided
  const finalOutputFolder = outputFolder || `${pdfName}_images`;

  // Create output directory if it doesn't exist
  if (!fs.existsSync(finalOutputFolder)) {
    fs.mkdirSync(finalOutputFolder, { recursive: true });
  }

  console.log(`Converting PDF: ${pdfPath}`);
  console.log(`Output folder: ${finalOutputFolder}`);
  console.log(`Image format: ${imageFormat}`);
  console.log(`DPI: ${density}`);

  try {
    // Configure pdf2pic
    const convert = pdf2pic.fromPath(pdfPath, {
      density: density,
      saveFilename: "page",
      savePath: finalOutputFolder,
      format: imageFormat.toLowerCase(),
      width: 2000,
      height: 2000,
      quality: quality,
    });

    // Convert all pages
    const results = await convert.bulk(-1);

    const savedImages = [];
    const totalPages = results.length;

    console.log(`Processing ${totalPages} converted pages...`);

    // Process and rename files to have proper zero-padded numbering
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pageNumber = i + 1;
      const paddedNumber = pageNumber.toString().padStart(3, "0");

      // Get the original file path from pdf2pic result
      let originalPath = result.path;

      if (originalPath && fs.existsSync(originalPath)) {
        // New filename with proper numbering
        const newFilename = `page_${paddedNumber}.${imageFormat.toLowerCase()}`;
        const newPath = path.join(finalOutputFolder, newFilename);

        // Rename the file if needed
        if (originalPath !== newPath) {
          fs.renameSync(originalPath, newPath);
        }

        savedImages.push(newPath);
        console.log(`✓ Saved page ${pageNumber}/${totalPages}: ${newFilename}`);
      } else {
        console.warn(`⚠ Warning: Could not find file for page ${pageNumber}`);
      }
    }

    console.log(
      `\nPDF conversion completed! ${totalPages} pages saved to '${finalOutputFolder}'`
    );
    return { images: savedImages, folder: finalOutputFolder };
  } catch (error) {
    console.error(`Error during PDF conversion: ${error.message}`);
    throw error;
  }
}

async function ocrImages(imagesFolder, options = {}) {
  const {
    outputFile = "ocr_results.txt",
    language = "ara",
    pagePrefix = "page_",
    pageSeparator = "\n\n=== PAGE {pageNumber} ===\n\n",
  } = options;

  // Validate images folder exists
  if (!fs.existsSync(imagesFolder)) {
    throw new Error(`Images folder not found: ${imagesFolder}`);
  }

  console.log(`\nStarting OCR process...`);
  console.log(`Images folder: ${imagesFolder}`);
  console.log(`Output file: ${outputFile}`);
  console.log(`Language: ${language}`);

  try {
    // Get all image files from the folder
    const files = fs
      .readdirSync(imagesFolder)
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".png", ".jpg", ".jpeg", ".tiff", ".bmp"].includes(ext);
      })
      .filter((file) => file.startsWith(pagePrefix))
      .sort(); // Sort to ensure proper page order

    if (files.length === 0) {
      throw new Error(`No image files found in ${imagesFolder}`);
    }

    console.log(`Found ${files.length} image files to process`);

    let allText = "";
    const totalFiles = files.length;

    // Initialize Tesseract worker
    console.log("Initializing Tesseract worker...");
    const worker = await Tesseract.createWorker(language);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(imagesFolder, file);
      const pageNumber = i + 1;

      console.log(`Processing ${pageNumber}/${totalFiles}: ${file}`);

      try {
        // Perform OCR on the image
        const {
          data: { text },
        } = await worker.recognize(filePath);

        // Add page separator and text
        const separator = pageSeparator.replace("{pageNumber}", pageNumber);
        allText += separator + text.trim() + "\n";

        console.log(`✓ Completed page ${pageNumber}/${totalFiles}`);
      } catch (error) {
        console.error(`Error processing ${file}: ${error.message}`);
        const separator = pageSeparator.replace("{pageNumber}", pageNumber);
        allText +=
          separator +
          `[ERROR: Could not process this page - ${error.message}]\n`;
      }
    }

    // Terminate the worker
    await worker.terminate();

    // Write results to output file
    fs.writeFileSync(outputFile, allText, "utf8");

    console.log(`\nOCR completed! Results saved to '${outputFile}'`);
    console.log(`Processed ${totalFiles} pages`);

    return outputFile;
  } catch (error) {
    console.error(`Error during OCR process: ${error.message}`);
    throw error;
  }
}

async function convertPdfToText(pdfPath, options = {}) {
  const {
    outputText = null,
    tempImagesFolder = null,
    keepImages = false,
    imageFormat = "png",
    density = 300,
    language = "ara",
  } = options;

  try {
    // Step 1: Convert PDF to images
    console.log("STEP 1: Converting PDF to images...");
    const { images, folder } = await convertPdfToImages(pdfPath, {
      outputFolder: tempImagesFolder,
      imageFormat,
      density,
    });

    // Step 2: OCR the images
    console.log("\nSTEP 2: Performing OCR on images...");
    const pdfName = path.basename(pdfPath, path.extname(pdfPath));
    const finalOutputText = outputText || `${pdfName}_ocr_results.txt`;

    const resultFile = await ocrImages(folder, {
      outputFile: finalOutputText,
      language,
    });

    // Step 3: Clean up images if requested
    if (!keepImages) {
      console.log("\nSTEP 3: Cleaning up temporary images...");
      try {
        fs.rmSync(folder, { recursive: true, force: true });
        console.log(`✓ Removed temporary images folder: ${folder}`);
      } catch (error) {
        console.warn(
          `⚠ Warning: Could not remove temporary folder: ${error.message}`
        );
      }
    } else {
      console.log(`\nImages kept in: ${folder}`);
    }

    console.log(`\n🎉 SUCCESS! PDF converted to text:`);
    console.log(`📄 Input PDF: ${pdfPath}`);
    console.log(`📝 Output text: ${resultFile}`);
    console.log(`📊 Pages processed: ${images.length}`);

    return resultFile;
  } catch (error) {
    console.error(`Error in PDF to text conversion: ${error.message}`);
    throw error;
  }
}

// Command line interface
program
  .name("pdf-to-text")
  .description("Convert PDF to text using OCR with Arabic language support")
  .argument("<pdf-file>", "PDF file to convert")
  .option(
    "-o, --output <file>",
    "Output text file (default: [pdf-name]_ocr_results.txt)"
  )
  .option(
    "-i, --images-folder <folder>",
    "Temporary images folder (default: [pdf-name]_images)"
  )
  .option("-k, --keep-images", "Keep the extracted images after OCR", false)
  .option("-f, --format <format>", "Image format (png, jpeg)", "png")
  .option("-d, --density <dpi>", "Image DPI quality (default: 300)", "300")
  .option(
    "-l, --language <lang>",
    "OCR language code (default: ara for Arabic)",
    "ara"
  )
  .action(async (pdfFile, options) => {
    try {
      await convertPdfToText(pdfFile, {
        outputText: options.output,
        tempImagesFolder: options.imagesFolder,
        keepImages: options.keepImages,
        imageFormat: options.format,
        density: parseInt(options.density),
        language: options.language,
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Export for programmatic use
module.exports = { convertPdfToText, convertPdfToImages, ocrImages };

// Run CLI if called directly
if (require.main === module) {
  program.parse();
}
