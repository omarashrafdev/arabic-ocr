#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const pdf2pic = require("pdf2pic");

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
  console.log(`Image format: ${imageFormat.toUpperCase()}`);
  console.log(`Density: ${density} DPI`);

  try {
    // Configure pdf2pic
    const convert = pdf2pic.fromPath(pdfPath, {
      density: density, // DPI
      saveFilename: "page", // Base filename
      savePath: finalOutputFolder, // Output directory
      format: imageFormat.toLowerCase(), // Image format
      width: undefined, // Let it auto-calculate based on DPI
      height: undefined, // Let it auto-calculate based on DPI
      quality: quality, // Image quality (for JPEG)
    });

    console.log("Converting pages...");

    // Convert all pages and save them to files
    const results = await convert.bulk(-1);

    const savedImages = [];
    const totalPages = results.length;

    console.log(`Processing ${totalPages} converted pages...`);

    // Process and rename files to have proper zero-padded numbering
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pageNumber = i + 1;
      const paddedNumber = pageNumber.toString().padStart(3, "0");

      console.log(`Processing page ${pageNumber}...`);

      // Handle case where files are saved or need to be saved from base64
      let savedPath;

      if (result.path && fs.existsSync(result.path)) {
        // File was saved, just rename it
        const newFilename = `page_${paddedNumber}.${imageFormat.toLowerCase()}`;
        const newPath = path.join(finalOutputFolder, newFilename);

        if (result.path !== newPath) {
          try {
            fs.renameSync(result.path, newPath);
            console.log(
              `Renamed: ${path.basename(result.path)} -> ${newFilename}`
            );
          } catch (error) {
            console.error(`Error renaming file: ${error.message}`);
            savedPath = result.path;
          }
        }

        savedPath = newPath;
      } else if (result.base64) {
        // File needs to be saved from base64 data
        const newFilename = `page_${paddedNumber}.${imageFormat.toLowerCase()}`;
        const newPath = path.join(finalOutputFolder, newFilename);

        try {
          // Remove the data URL prefix if present
          let base64Data = result.base64;
          if (base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1];
          }

          // Write the base64 data to file
          fs.writeFileSync(newPath, Buffer.from(base64Data, "base64"));
          savedPath = newPath;
          console.log(`Saved base64 data to: ${newFilename}`);
        } catch (error) {
          console.error(
            `Error saving base64 data for page ${pageNumber}: ${error.message}`
          );
          continue;
        }
      } else {
        console.error(`No valid data found for page ${pageNumber}`);
        console.log(`Available result properties:`, Object.keys(result));
        continue;
      }

      if (savedPath) {
        savedImages.push(savedPath);
        console.log(
          `✓ Saved page ${pageNumber}/${totalPages}: ${path.basename(
            savedPath
          )}`
        );
      }
    }

    console.log(
      `\nConversion completed! ${totalPages} pages saved to '${finalOutputFolder}'`
    );
    return savedImages;
  } catch (error) {
    console.error(`Error during conversion: ${error.message}`);
    return [];
  }
}

// Command line interface
program
  .name("pdf-to-images")
  .description("Convert PDF pages to images")
  .argument("<pdf-path>", "Path to the PDF file")
  .option("-o, --output <folder>", "Output folder (default: PDF_name_images)")
  .option(
    "-f, --format <format>",
    "Image format: png, jpeg, jpg (default: png)",
    "png"
  )
  .option("-d, --density <dpi>", "DPI for image quality (default: 300)", "300")
  .option(
    "-q, --quality <quality>",
    "Image quality 1-100 for JPEG (default: 100)",
    "100"
  )
  .action(async (pdfPath, options) => {
    try {
      // Validate format
      const validFormats = ["png", "jpeg", "jpg"];
      if (!validFormats.includes(options.format.toLowerCase())) {
        console.error(
          `Invalid format: ${
            options.format
          }. Must be one of: ${validFormats.join(", ")}`
        );
        process.exit(1);
      }

      // Convert string options to numbers
      const density = parseInt(options.density);
      const quality = parseInt(options.quality);

      // Validate numeric options
      if (isNaN(density) || density < 72 || density > 600) {
        console.error("DPI must be a number between 72 and 600");
        process.exit(1);
      }

      if (isNaN(quality) || quality < 1 || quality > 100) {
        console.error("Quality must be a number between 1 and 100");
        process.exit(1);
      }

      await convertPdfToImages(pdfPath, {
        outputFolder: options.output,
        imageFormat: options.format,
        density: density,
        quality: quality,
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Export for programmatic use
module.exports = { convertPdfToImages };

// Run CLI if called directly
if (require.main === module) {
  program.parse();
}
