#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const Tesseract = require("tesseract.js");

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

  console.log(`Starting OCR process...`);
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

// Command line interface
program
  .name("ocr-images")
  .description(
    "Perform Arabic OCR on image files and save results to text file"
  )
  .argument("<images-folder>", "Folder containing image files")
  .option(
    "-o, --output <file>",
    "Output text file (default: ocr_results.txt)",
    "ocr_results.txt"
  )
  .option(
    "-l, --language <lang>",
    "OCR language code (default: ara for Arabic)",
    "ara"
  )
  .option(
    "-p, --prefix <prefix>",
    "Image file prefix to filter (default: page_)",
    "page_"
  )
  .option(
    "-s, --separator <separator>",
    "Page separator template (default: \\n\\n=== PAGE {pageNumber} ===\\n\\n)",
    "\n\n=== PAGE {pageNumber} ===\n\n"
  )
  .action(async (imagesFolder, options) => {
    try {
      await ocrImages(imagesFolder, {
        outputFile: options.output,
        language: options.language,
        pagePrefix: options.prefix,
        pageSeparator: options.separator,
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Export for programmatic use
module.exports = { ocrImages };

// Run CLI if called directly
if (require.main === module) {
  program.parse();
}
