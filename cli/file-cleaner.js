#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

class FileCleaner {
  constructor(options = {}) {
    this.options = {
      uploadsRetentionDays: options.uploadsRetentionDays || 1,
      outputRetentionDays: options.outputRetentionDays || 7,
      tempRetentionHours: options.tempRetentionHours || 2,
      logsRetentionDays: options.logsRetentionDays || 30,
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.baseDir = options.baseDir || path.join(__dirname, '..');
    this.stats = {
      uploadsCleaned: 0,
      outputsCleaned: 0,
      tempsCleaned: 0,
      logsCleaned: 0,
      totalSizeFreed: 0,
      errors: []
    };
  }

  log(message, level = 'info') {
    if (this.options.verbose || level === 'error') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  async getFileStats(filePath) {
    try {
      return await fs.promises.stat(filePath);
    } catch (error) {
      return null;
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    try {
      const files = await fs.promises.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await this.getFileStats(filePath);
        if (stats) {
          if (stats.isDirectory()) {
            totalSize += await this.getDirectorySize(filePath);
          } else {
            totalSize += stats.size;
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    return totalSize;
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async cleanDirectory(dirPath, maxAgeMs, filePattern = null) {
    const cleaned = { count: 0, size: 0 };
    
    try {
      if (!fs.existsSync(dirPath)) {
        this.log(`Directory ${dirPath} does not exist, skipping.`);
        return cleaned;
      }

      const files = await fs.promises.readdir(dirPath);
      this.log(`Checking ${files.length} items in ${dirPath}`);

      for (const file of files) {
        // Skip .gitkeep files
        if (file === '.gitkeep') continue;
        
        const filePath = path.join(dirPath, file);
        const stats = await this.getFileStats(filePath);
        
        if (!stats) continue;

        // Check if file matches pattern (if specified)
        if (filePattern && !filePattern.test(file)) {
          continue;
        }

        const fileAge = Date.now() - stats.mtime.getTime();
        
        if (fileAge > maxAgeMs) {
          const fileSize = stats.isDirectory() ? await this.getDirectorySize(filePath) : stats.size;
          
          this.log(`Found old ${stats.isDirectory() ? 'directory' : 'file'}: ${file} (${this.formatFileSize(fileSize)}, ${Math.round(fileAge / (1000 * 60 * 60))} hours old)`);
          
          if (!this.options.dryRun) {
            try {
              if (stats.isDirectory()) {
                await fs.promises.rmdir(filePath, { recursive: true });
              } else {
                await fs.promises.unlink(filePath);
              }
              this.log(`Deleted: ${file}`);
            } catch (error) {
              this.log(`Error deleting ${file}: ${error.message}`, 'error');
              this.stats.errors.push(`${file}: ${error.message}`);
              continue;
            }
          }
          
          cleaned.count++;
          cleaned.size += fileSize;
        }
      }
    } catch (error) {
      this.log(`Error processing directory ${dirPath}: ${error.message}`, 'error');
      this.stats.errors.push(`${dirPath}: ${error.message}`);
    }

    return cleaned;
  }

  async cleanUploads() {
    const uploadsDir = path.join(this.baseDir, 'uploads');
    const maxAge = this.options.uploadsRetentionDays * 24 * 60 * 60 * 1000;
    
    this.log(`Cleaning uploads older than ${this.options.uploadsRetentionDays} days`);
    const result = await this.cleanDirectory(uploadsDir, maxAge);
    
    this.stats.uploadsCleaned = result.count;
    this.stats.totalSizeFreed += result.size;
    
    return result;
  }

  async cleanOutputs() {
    const outputDir = path.join(this.baseDir, 'output');
    const maxAge = this.options.outputRetentionDays * 24 * 60 * 60 * 1000;
    
    this.log(`Cleaning outputs older than ${this.options.outputRetentionDays} days`);
    const result = await this.cleanDirectory(outputDir, maxAge);
    
    this.stats.outputsCleaned = result.count;
    this.stats.totalSizeFreed += result.size;
    
    return result;
  }

  async cleanTemp() {
    const tempDir = path.join(this.baseDir, 'temp');
    const maxAge = this.options.tempRetentionHours * 60 * 60 * 1000;
    
    this.log(`Cleaning temp files older than ${this.options.tempRetentionHours} hours`);
    const result = await this.cleanDirectory(tempDir, maxAge);
    
    this.stats.tempsCleaned = result.count;
    this.stats.totalSizeFreed += result.size;
    
    return result;
  }

  async cleanLogs() {
    const logsDir = path.join(this.baseDir, 'logs');
    const maxAge = this.options.logsRetentionDays * 24 * 60 * 60 * 1000;
    
    this.log(`Cleaning logs older than ${this.options.logsRetentionDays} days`);
    
    const logPattern = /\.log$/;
    const result = await this.cleanDirectory(logsDir, maxAge, logPattern);
    
    this.stats.logsCleaned = result.count;
    this.stats.totalSizeFreed += result.size;
    
    return result;
  }

  async runCleanup() {
    const startTime = Date.now();
    
    this.log(`Starting file cleanup ${this.options.dryRun ? '(DRY RUN)' : ''}`);
    this.log(`Base directory: ${this.baseDir}`);
    this.log(`Retention periods: uploads=${this.options.uploadsRetentionDays}d, outputs=${this.options.outputRetentionDays}d, temp=${this.options.tempRetentionHours}h, logs=${this.options.logsRetentionDays}d`);

    try {
      await Promise.all([
        this.cleanUploads(),
        this.cleanOutputs(),
        this.cleanTemp(),
        this.cleanLogs()
      ]);

      const duration = Date.now() - startTime;
      
      this.log('\n=== CLEANUP SUMMARY ===');
      this.log(`Uploads cleaned: ${this.stats.uploadsCleaned} files`);
      this.log(`Outputs cleaned: ${this.stats.outputsCleaned} files`);
      this.log(`Temp files cleaned: ${this.stats.tempsCleaned} files`);
      this.log(`Log files cleaned: ${this.stats.logsCleaned} files`);
      this.log(`Total size freed: ${this.formatFileSize(this.stats.totalSizeFreed)}`);
      this.log(`Duration: ${duration}ms`);
      
      if (this.stats.errors.length > 0) {
        this.log(`\nErrors encountered: ${this.stats.errors.length}`);
        this.stats.errors.forEach(error => this.log(`  - ${error}`, 'error'));
      }
      
      if (this.options.dryRun) {
        this.log('\nDRY RUN: No files were actually deleted');
      }

      return this.stats;
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async getDiskUsage() {
    const directories = ['uploads', 'output', 'temp', 'logs'];
    const usage = {};

    for (const dir of directories) {
      const dirPath = path.join(this.baseDir, dir);
      usage[dir] = {
        size: await this.getDirectorySize(dirPath),
        exists: fs.existsSync(dirPath)
      };
    }

    return usage;
  }

  async reportDiskUsage() {
    this.log('\n=== DISK USAGE REPORT ===');
    const usage = await this.getDiskUsage();
    
    for (const [dir, info] of Object.entries(usage)) {
      if (info.exists) {
        this.log(`${dir}/: ${this.formatFileSize(info.size)}`);
      } else {
        this.log(`${dir}/: Directory does not exist`);
      }
    }
  }
}

// CLI Interface
if (require.main === module) {
  program
    .name('file-cleaner')
    .description('Clean old files from Arabic OCR application directories')
    .version('1.0.0')
    .option('-u, --uploads-retention <days>', 'Retention period for uploads in days', '1')
    .option('-o, --output-retention <days>', 'Retention period for outputs in days', '7')
    .option('-t, --temp-retention <hours>', 'Retention period for temp files in hours', '2')
    .option('-l, --logs-retention <days>', 'Retention period for logs in days', '30')
    .option('-d, --dry-run', 'Show what would be deleted without actually deleting')
    .option('-v, --verbose', 'Show detailed logging')
    .option('-r, --report', 'Show disk usage report only')
    .option('--base-dir <path>', 'Base directory path', path.join(__dirname, '..'));

  program.parse();

  const options = program.opts();
  
  const cleaner = new FileCleaner({
    uploadsRetentionDays: parseInt(options.uploadsRetention),
    outputRetentionDays: parseInt(options.outputRetention),
    tempRetentionHours: parseInt(options.tempRetention),
    logsRetentionDays: parseInt(options.logsRetention),
    dryRun: options.dryRun,
    verbose: options.verbose,
    baseDir: options.baseDir
  });

  async function main() {
    try {
      if (options.report) {
        await cleaner.reportDiskUsage();
      } else {
        await cleaner.runCleanup();
      }
      process.exit(0);
    } catch (error) {
      console.error('Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = FileCleaner;
