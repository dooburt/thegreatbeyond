#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Get file path from command line
const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node extract-mod-names.js <instance.json>");
  process.exit(1);
}

const resolvedPath = path.resolve(inputFile);

try {
  const rawData = fs.readFileSync(resolvedPath, "utf8");
  const json = JSON.parse(rawData);

  if (!json.launcher || !Array.isArray(json.launcher.mods)) {
    throw new Error("Invalid format: expected a 'launcher.mods' array");
  }

  const modNames = json.launcher.mods
    .map((mod) => mod.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  modNames.forEach((name) => console.log(name));
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
