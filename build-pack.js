#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const ROOT = __dirname;
const MODLIST_FILE = path.join(ROOT, "modlist.html");
const MANIFEST_FILE = path.join(ROOT, "manifest.json");
const OVERRIDES_DIR = path.join(ROOT, "overrides");

// ---- Validate inputs ----
if (!fs.existsSync(MODLIST_FILE)) {
  console.error("❌ modlist.html not found");
  process.exit(1);
}

if (!fs.existsSync(MANIFEST_FILE)) {
  console.error("❌ manifest.json not found");
  process.exit(1);
}

if (!fs.existsSync(OVERRIDES_DIR)) {
  console.error("❌ overrides/ directory not found");
  process.exit(1);
}

// ---- Read manifest ----
const manifestData = fs.readFileSync(MANIFEST_FILE, "utf-8");
const manifest = JSON.parse(manifestData);

const packName = manifest.name || "modpack";
const packVersion = manifest.version || "1.0.0";

// ---- Create ZIP name ----
const zipName = `${packName.replace(/[^a-zA-Z0-9-_]/g, "")}-${packVersion}.zip`;
const zipPath = path.join(ROOT, zipName);

// ---- ZIP creation helpers ----
function shouldExclude(filePath) {
  const rel = path.relative(ROOT, filePath);

  return (
    rel === "build-pack.js" ||
    rel === "generate-manifest.js" ||
    rel === "instance.json" ||
    rel === "README.md" ||
    rel === "DEVELOPER.md" ||
    rel === "package.json" ||
    rel === "package-lock.json" ||
    rel === ".gitignore" ||
    rel === zipName || // Exclude the output ZIP file itself!
    rel.endsWith(".zip") || // Exclude all ZIP files to be safe
    rel.startsWith(".git" + path.sep) ||
    rel.startsWith("node_modules" + path.sep)
  );
}

// Delete existing ZIP if present
if (fs.existsSync(zipPath)) {
  console.log(`🗑️  Removing existing ${zipName}`);
  fs.unlinkSync(zipPath);
}

const output = fs.createWriteStream(zipPath);
const archive = archiver("zip", {
  store: true, // No compression - CurseForge compatible
});

let fileCount = 0;
let totalSize = 0;
const MAX_SIZE = 500 * 1024 * 1024; // 500MB safety limit

// Handle events
output.on("close", () => {
  const sizeInMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`\n✔ ZIP created: ${zipName}`);
  console.log(`  Files: ${fileCount}`);
  console.log(`  Size: ${sizeInMB} MB`);
});

archive.on("error", (err) => {
  console.error("❌ Archive error:", err);
  process.exit(1);
});

archive.on("warning", (err) => {
  if (err.code === "ENOENT") {
    console.warn("⚠️  Warning:", err);
  } else {
    throw err;
  }
});

// Safety check for size
archive.on("entry", (entry) => {
  totalSize += entry.stats.size;
  if (totalSize > MAX_SIZE) {
    console.error(
      `\n❌ Archive exceeds ${MAX_SIZE / (1024 * 1024)}MB safety limit!`,
    );
    console.error("   This likely means the ZIP is being added to itself.");
    archive.abort();
    output.close();
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    process.exit(1);
  }
});

archive.pipe(output);

// Add files with logging
console.log("\n📦 Building modpack ZIP...\n");

function addFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (shouldExclude(fullPath)) {
      const rel = path.relative(ROOT, fullPath);
      console.log(`⏭️  Skipping: ${rel}`);
      continue;
    }

    const relPath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      addFiles(fullPath);
    } else {
      const stats = fs.statSync(fullPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`➕ Adding: ${relPath} (${sizeKB} KB)`);
      archive.file(fullPath, { name: relPath });
      fileCount++;
    }
  }
}

addFiles(ROOT);
archive.finalize();
