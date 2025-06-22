#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Command } = require("commander");
const { convertPdfToText } = require("./pdf-to-text.js");

async function batchProcessPdfs(inputPath, options = {}) {
  const {
    outputFolder = "batch_ocr_results",
    keepImages = false,
    imageFormat = "png",
    density = 300,
    language = "ara",
    filePattern = "*.pdf",
    concurrent = 1,
  } = options;

  console.log("🚀 Starting batch PDF to text conversion...");
  console.log(`Input: ${inputPath}`);
  console.log(`Output folder: ${outputFolder}`);
  console.log(`Language: ${language}`);
  console.log(`Concurrent processes: ${concurrent}`);

  try {
    // Create output directory
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      console.log(`✓ Created output folder: ${outputFolder}`);
    }

    // Get list of PDF files
    let pdfFiles = [];

    if (fs.statSync(inputPath).isDirectory()) {
      // Process directory
      console.log("\n📁 Scanning directory for PDF files...");
      const files = fs.readdirSync(inputPath);
      pdfFiles = files
        .filter((file) => path.extname(file).toLowerCase() === ".pdf")
        .map((file) => ({
          fullPath: path.join(inputPath, file),
          filename: file,
          basename: path.basename(file, ".pdf"),
        }));
    } else if (path.extname(inputPath).toLowerCase() === ".pdf") {
      // Single PDF file
      pdfFiles = [
        {
          fullPath: inputPath,
          filename: path.basename(inputPath),
          basename: path.basename(inputPath, ".pdf"),
        },
      ];
    } else {
      throw new Error(
        "Input must be a PDF file or directory containing PDF files"
      );
    }

    if (pdfFiles.length === 0) {
      throw new Error("No PDF files found in the specified location");
    }

    console.log(`\n📋 Found ${pdfFiles.length} PDF files to process:`);
    pdfFiles.forEach((pdf, index) => {
      console.log(`  ${index + 1}. ${pdf.filename}`);
    });

    // Process PDFs
    const results = [];
    const errors = [];
    let completed = 0;

    console.log("\n🔄 Starting conversion process...\n");

    // Process files with controlled concurrency
    for (let i = 0; i < pdfFiles.length; i += concurrent) {
      const batch = pdfFiles.slice(i, i + concurrent);

      const batchPromises = batch.map(async (pdf) => {
        const startTime = Date.now();

        try {
          console.log(`📄 Processing: ${pdf.filename}`);

          // Create output text filename using PDF name
          const outputTextFile = path.join(
            outputFolder,
            `${pdf.basename}_ocr.txt`
          );

          // Create temporary images folder
          const tempImagesFolder = path.join(
            outputFolder,
            `${pdf.basename}_temp_images`
          );

          // Convert PDF to text
          const resultFile = await convertPdfToText(pdf.fullPath, {
            outputText: outputTextFile,
            tempImagesFolder: tempImagesFolder,
            keepImages: keepImages,
            imageFormat: imageFormat,
            density: density,
            language: language,
          });

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          completed++;

          console.log(
            `✅ Completed ${completed}/${pdfFiles.length}: ${pdf.filename} (${duration}s)`
          );
          console.log(`   → Output: ${path.basename(resultFile)}\n`);

          results.push({
            input: pdf.filename,
            output: resultFile,
            duration: duration,
            success: true,
          });
        } catch (error) {
          completed++;
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          console.error(
            `❌ Failed ${completed}/${pdfFiles.length}: ${pdf.filename} (${duration}s)`
          );
          console.error(`   Error: ${error.message}\n`);

          errors.push({
            input: pdf.filename,
            error: error.message,
            duration: duration,
            success: false,
          });
        }
      });

      // Wait for current batch to complete
      await Promise.all(batchPromises);
    }

    // Generate summary report
    const summaryFile = path.join(outputFolder, "batch_processing_summary.txt");
    const summary = generateSummary(results, errors, options);
    fs.writeFileSync(summaryFile, summary, "utf8");

    // Print final results
    console.log("🎉 Batch processing completed!\n");
    console.log("📊 SUMMARY:");
    console.log(`   ✅ Successful: ${results.length}`);
    console.log(`   ❌ Failed: ${errors.length}`);
    console.log(`   📁 Output folder: ${outputFolder}`);
    console.log(`   📄 Summary report: ${path.basename(summaryFile)}`);

    if (results.length > 0) {
      console.log("\n✅ Successfully processed files:");
      results.forEach((result) => {
        console.log(`   • ${result.input} → ${path.basename(result.output)}`);
      });
    }

    if (errors.length > 0) {
      console.log("\n❌ Failed files:");
      errors.forEach((error) => {
        console.log(`   • ${error.input}: ${error.error}`);
      });
    }

    return { results, errors, summary: summaryFile };
  } catch (error) {
    console.error(`Fatal error in batch processing: ${error.message}`);
    throw error;
  }
}

function generateSummary(results, errors, options) {
  const totalFiles = results.length + errors.length;
  const successRate =
    totalFiles > 0 ? ((results.length / totalFiles) * 100).toFixed(1) : 0;
  const totalDuration = [...results, ...errors].reduce(
    (sum, item) => sum + parseFloat(item.duration),
    0
  );

  let summary = `BATCH PDF TO TEXT CONVERSION SUMMARY\n`;
  summary += `=====================================\n\n`;
  summary += `Processing Date: ${new Date().toLocaleString()}\n`;
  summary += `Total Files: ${totalFiles}\n`;
  summary += `Successful: ${results.length}\n`;
  summary += `Failed: ${errors.length}\n`;
  summary += `Success Rate: ${successRate}%\n`;
  summary += `Total Duration: ${totalDuration.toFixed(1)} seconds\n`;
  summary += `Average per file: ${
    totalFiles > 0 ? (totalDuration / totalFiles).toFixed(1) : 0
  } seconds\n\n`;

  summary += `SETTINGS:\n`;
  summary += `---------\n`;
  summary += `Language: ${options.language || "ara"}\n`;
  summary += `Image Format: ${options.imageFormat || "png"}\n`;
  summary += `DPI: ${options.density || 300}\n`;
  summary += `Keep Images: ${options.keepImages ? "Yes" : "No"}\n`;
  summary += `Concurrent: ${options.concurrent || 1}\n\n`;

  if (results.length > 0) {
    summary += `SUCCESSFUL CONVERSIONS:\n`;
    summary += `----------------------\n`;
    results.forEach((result, index) => {
      summary += `${index + 1}. ${result.input}\n`;
      summary += `   Output: ${path.basename(result.output)}\n`;
      summary += `   Duration: ${result.duration}s\n\n`;
    });
  }

  if (errors.length > 0) {
    summary += `FAILED CONVERSIONS:\n`;
    summary += `------------------\n`;
    errors.forEach((error, index) => {
      summary += `${index + 1}. ${error.input}\n`;
      summary += `   Error: ${error.error}\n`;
      summary += `   Duration: ${error.duration}s\n\n`;
    });
  }

  return summary;
}

// Command line interface
const program = new Command();
program
  .name("batch-pdf-to-text")
  .description("Batch convert multiple PDF files to Arabic text using OCR")
  .argument("<input>", "PDF file or directory containing PDF files")
  .option(
    "-O, --output-folder <folder>",
    "Output folder for results (default: batch_ocr_results)",
    "batch_ocr_results"
  )
  .option("-K, --keep-images", "Keep extracted images after OCR", false)
  .option("-F, --format <format>", "Image format (png, jpeg)", "png")
  .option("-D, --density <dpi>", "Image DPI quality (default: 300)", "300")
  .option("-L, --language <lang>", "OCR language code (default: ara)", "ara")
  .option(
    "-C, --concurrent <num>",
    "Number of concurrent processes (default: 1)",
    "1"
  )
  .action(async (input, options) => {
    try {
      await batchProcessPdfs(input, {
        outputFolder: options.outputFolder,
        keepImages: options.keepImages,
        imageFormat: options.format,
        density: parseInt(options.density),
        language: options.language,
        concurrent: parseInt(options.concurrent),
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Export for programmatic use
module.exports = { batchProcessPdfs };

// Run CLI if called directly
if (require.main === module) {
  program.parse();
}
