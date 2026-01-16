#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const INSTANCE_FILE = path.join(__dirname, "instance.json");
const OUTPUT_FILE = path.join(__dirname, "manifest.json");

// ---- Load instance.json ----
if (!fs.existsSync(INSTANCE_FILE)) {
  console.error("❌ instance.json not found");
  process.exit(1);
}

const instance = JSON.parse(fs.readFileSync(INSTANCE_FILE, "utf-8"));

// ---- Extract core metadata ----
const packName = instance.launcher.name || "Unnamed Modpack";
const packVersion = instance.version || "0.1.0";
const mcVersion = instance.launcher.version;
const forgeVersion = instance.launcher.loaderVersion.version;

if (!mcVersion || !forgeVersion) {
  console.error(
    "❌ Missing minecraftVersion or loaderVersion in instance.json"
  );
  process.exit(1);
}

console.log("Generating CurseForge manifest:");
console.log(`  Pack:   ${packName}`);
console.log(`  Ver:    ${packVersion}`);
console.log(`  MC:     ${mcVersion}`);
console.log(`  Forge:  ${forgeVersion}`);
console.log("");

// ---- Build files array ----
const files = [];
const modlistFiles = [];

for (const mod of instance.launcher.mods || []) {
  if (mod.disabled) {
    console.log(`⚠ Skipping disabled mod: ${mod.name}`);
    continue;
  }

  const projectID = mod.curseForgeProjectId;
  const fileID = mod.curseForgeFileId;

  if (!projectID || !fileID) {
    console.warn(`⚠ Skipping non-CurseForge mod: ${mod.name}`);
    continue;
  }

  files.push({
    projectID,
    fileID,
    required: true,
  });

  console.log(
    `✔ Added mod: ${mod.name} (Project ID: ${projectID}, File ID: ${fileID})`
  );

  modlistFiles.push(
    `${mod.name} (CurseForge Project ID: ${projectID}, CurseForge File ID: ${fileID})`
  );
}

if (files.length === 0) {
  console.error("❌ No CurseForge mods found — manifest would be empty");
  process.exit(1);
}

// --- Build human readable modlist.html ---
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mod List</title>
    </head>
<body>
    <h1>Mod List</h1>
    <ul>
        ${modlistFiles.map((mod) => `<li>${mod}</li>`).join("\n        ")}
    </ul>
</body>
</html>`;

// ---- Build manifest ----
const manifest = {
  manifestType: "minecraftModpack",
  manifestVersion: 1,

  name: packName,
  version: packVersion,
  author: "doooburt",

  minecraft: {
    version: mcVersion,
    modLoaders: [
      {
        id: `forge-${forgeVersion}`,
        primary: true,
      },
    ],
  },

  files,
  overrides: "overrides",
};

// ---- Write manifest.json ----
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), "utf-8");

// ---- Write modlist.html ----
fs.writeFileSync(path.join(__dirname, "modlist.html"), html, "utf-8");

console.log("✔ manifest.json generated successfully");
console.log("✔ modlist.html generated successfully");
console.log(`✔ Mods included: ${files.length}`);
