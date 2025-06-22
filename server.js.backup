const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const { Document, Packer, Paragraph, TextRun } = require("docx");
const { convertPdfToText } = require("./cli/pdf-to-text.js");
const FileCleaner = require("./cli/file-cleaner.js");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Environment-based configuration
const isProduction = NODE_ENV === "production";

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// Rate limiting (more restrictive in production)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 15 : 50, // More restrictive in production
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Create uploads and temp directories
const uploadsDir = path.join(__dirname, "uploads");
const tempDir = path.join(__dirname, "temp");
const outputDir = path.join(__dirname, "output");

[uploadsDir, tempDir, outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

// Serve static files
app.use(express.static("public"));

// Helper function to clean up temporary files
function cleanUpFiles(files) {
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        if (fs.statSync(file).isDirectory()) {
          fs.rmSync(file, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.error(`Error cleaning up ${file}:`, error.message);
      }
    }
  });
}

// Helper function to create DOCX from text
async function createDocxFromText(text, filename) {
  const paragraphs = text.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line)],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const docxPath = path.join(outputDir, `${filename}.docx`);
  fs.writeFileSync(docxPath, buffer);
  return docxPath;
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const pdfPath = req.file.path;
  const filename = path.basename(
    req.file.filename,
    path.extname(req.file.filename)
  );
  const tempImagesFolder = path.join(tempDir, `${filename}_images`);
  const outputTextFile = path.join(outputDir, `${filename}_ocr.txt`);

  let filesToCleanup = [pdfPath, tempImagesFolder];

  try {
    if (!isProduction) {
      console.log(`Processing PDF: ${req.file.originalname}`);
    }

    // Perform OCR
    const resultFile = await convertPdfToText(pdfPath, {
      outputText: outputTextFile,
      tempImagesFolder: tempImagesFolder,
      keepImages: false,
      imageFormat: "png",
      density: 300,
      language: req.body.language || "ara",
    });

    // Read the OCR result
    const ocrText = fs.readFileSync(resultFile, "utf8");

    // Store result in session/memory for download
    const sessionId = uuidv4();

    // Store the result temporarily (in production, use a proper session store)
    global.results = global.results || {};
    global.results[sessionId] = {
      text: ocrText,
      filename: filename,
      timestamp: Date.now(),
    };

    // Clean up after a delay to allow downloads
    setTimeout(() => {
      cleanUpFiles([...filesToCleanup, resultFile]);
      if (global.results && global.results[sessionId]) {
        delete global.results[sessionId];
      }
    }, 10 * 60 * 1000); // Clean up after 10 minutes

    res.json({
      success: true,
      message: "PDF processed successfully",
      sessionId: sessionId,
      preview: ocrText.substring(0, 500) + (ocrText.length > 500 ? "..." : ""),
      originalFilename: req.file.originalname,
    });
  } catch (error) {
    if (!isProduction) {
      console.error("OCR processing error:", error);
    }
    cleanUpFiles(filesToCleanup);
    res.status(500).json({
      error: "Failed to process PDF",
      details: isProduction ? "Processing failed" : error.message,
    });
  }
});

app.get("/download/:sessionId/:format", async (req, res) => {
  const { sessionId, format } = req.params;

  if (!global.results || !global.results[sessionId]) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  const result = global.results[sessionId];
  const { text, filename } = result;

  try {
    if (format === "txt") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}_ocr.txt"`
      );
      res.send(text);
    } else if (format === "docx") {
      const docxPath = await createDocxFromText(text, `${filename}_ocr`);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}_ocr.docx"`
      );

      const fileStream = fs.createReadStream(docxPath);
      fileStream.pipe(res);

      fileStream.on("end", () => {
        // Clean up the docx file after sending
        setTimeout(() => {
          cleanUpFiles([docxPath]);
        }, 1000);
      });
    } else {
      res.status(400).json({ error: "Invalid format. Use txt or docx" });
    }
  } catch (error) {
    if (!isProduction) {
      console.error("Download error:", error);
    }
    res.status(500).json({ error: "Failed to generate download" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Manual cleanup endpoint
app.post("/cleanup", async (req, res) => {
  try {
    const fileCleaner = new FileCleaner({
      uploadsRetentionDays: parseInt(
        req.body.uploadsRetentionDays ||
          process.env.FILE_CLEANER_UPLOADS_RETENTION_DAYS ||
          "1"
      ),
      outputRetentionDays: parseInt(
        req.body.outputRetentionDays ||
          process.env.FILE_CLEANER_OUTPUT_RETENTION_DAYS ||
          "7"
      ),
      tempRetentionHours: parseInt(
        req.body.tempRetentionHours ||
          process.env.FILE_CLEANER_TEMP_RETENTION_HOURS ||
          "2"
      ),
      logsRetentionDays: parseInt(
        req.body.logsRetentionDays ||
          process.env.FILE_CLEANER_LOGS_RETENTION_DAYS ||
          "30"
      ),
      dryRun: req.body.dryRun === "true" || req.body.dryRun === true,
      verbose: false,
      baseDir: __dirname,
    });

    const stats = await fileCleaner.runCleanup();

    res.json({
      success: true,
      message: "Cleanup completed successfully",
      stats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (!isProduction) {
      console.error("Manual cleanup failed:", error);
    }
    res.status(500).json({
      success: false,
      error: "Cleanup failed",
      details: isProduction ? "Internal error" : error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Disk usage endpoint
app.get("/disk-usage", async (req, res) => {
  try {
    const fileCleaner = new FileCleaner({
      baseDir: __dirname,
      verbose: false,
    });

    const usage = await fileCleaner.getDiskUsage();

    res.json({
      success: true,
      usage: usage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (!isProduction) {
      console.error("Disk usage check failed:", error);
    }
    res.status(500).json({
      success: false,
      error: "Failed to check disk usage",
      details: isProduction ? "Internal error" : error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 50MB." });
    }
  }

  if (error.message === "Only PDF files are allowed!") {
    return res.status(400).json({ error: "Only PDF files are allowed!" });
  }

  if (!isProduction) {
    console.error("Unhandled error:", error);
  }
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Cleanup old results periodically
setInterval(() => {
  if (global.results) {
    const now = Date.now();
    Object.keys(global.results).forEach((sessionId) => {
      const result = global.results[sessionId];
      if (now - result.timestamp > 10 * 60 * 1000) {
        // 10 minutes
        delete global.results[sessionId];
      }
    });
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Initialize file cleaner for automatic cleanup
const fileCleanerEnabled =
  process.env.FILE_CLEANER_AUTO_CLEANUP_ENABLED === "true";
const fileCleanerInterval = parseInt(
  process.env.FILE_CLEANER_AUTO_CLEANUP_INTERVAL_HOURS || "6"
);

if (fileCleanerEnabled) {
  const fileCleaner = new FileCleaner({
    uploadsRetentionDays: parseInt(
      process.env.FILE_CLEANER_UPLOADS_RETENTION_DAYS || "1"
    ),
    outputRetentionDays: parseInt(
      process.env.FILE_CLEANER_OUTPUT_RETENTION_DAYS || "7"
    ),
    tempRetentionHours: parseInt(
      process.env.FILE_CLEANER_TEMP_RETENTION_HOURS || "2"
    ),
    logsRetentionDays: parseInt(
      process.env.FILE_CLEANER_LOGS_RETENTION_DAYS || "30"
    ),
    dryRun: false,
    verbose: !isProduction,
    baseDir: __dirname,
  });

  // Run cleanup on startup (after a delay)
  setTimeout(async () => {
    try {
      if (!isProduction) {
        console.log("Running initial file cleanup...");
      }
      await fileCleaner.runCleanup();
    } catch (error) {
      if (!isProduction) {
        console.error("Initial cleanup failed:", error.message);
      }
    }
  }, 30000); // Wait 30 seconds after startup

  // Run cleanup periodically
  setInterval(async () => {
    try {
      if (!isProduction) {
        console.log("Running scheduled file cleanup...");
      }
      await fileCleaner.runCleanup();
    } catch (error) {
      if (!isProduction) {
        console.error("Scheduled cleanup failed:", error.message);
      }
    }
  }, fileCleanerInterval * 60 * 60 * 1000); // Convert hours to milliseconds

  if (!isProduction) {
    console.log(
      `🧹 File cleaner enabled: cleanup every ${fileCleanerInterval} hours`
    );
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Arabic OCR Web App running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🗂️  Temp directory: ${tempDir}`);
  console.log(`📄 Output directory: ${outputDir}`);
});

module.exports = app;
