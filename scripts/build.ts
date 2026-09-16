import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

interface ModuleManifest {
  name: string;
  type: "shared" | "feature";
  description: string;
  version: string;
  integrity?: string;
  dependencies: {
    npm: string[];
    shared: string[];
    features: string[];
  };
  files: string[];
  [key: string]: any;
}

interface IndexEntry {
  name: string;
  description: string;
  version?: string;
  integrity?: string;
  [key: string]: any;
}

interface MasterIndex {
  shared: IndexEntry[];
  features: IndexEntry[];
}

function collectAllModuleFiles(dir: string, baseDir: string = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      files.push(...collectAllModuleFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (entry.name === "registry.json" || entry.name.startsWith(".")) {
        continue;
      }
      files.push(relPath);
    }
  }

  return files.sort();
}

function collectSourceFiles(dir: string, baseDir: string = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name.startsWith(".")) {
        continue;
      }
      files.push(...collectSourceFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (
        entry.name === "registry.json" ||
        entry.name.endsWith(".test.ts") ||
        entry.name.endsWith(".spec.ts") ||
        entry.name.startsWith(".")
      ) {
        continue;
      }
      files.push(relPath);
    }
  }

  return files.sort();
}

function computeDirectoryHash(dirPath: string, files?: string[]): string {
  const hash = createHash("sha256");
  const fileList = (files ?? collectSourceFiles(dirPath)).sort();

  for (const relativePath of fileList) {
    const absolutePath = path.join(dirPath, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const content = fs.readFileSync(absolutePath, "utf8");
    const normalizedContent = content.replace(/\r\n/g, "\n");
    hash.update(relativePath);
    hash.update(normalizedContent);
  }

  return `sha256-${hash.digest("hex")}`;
}

function getTargetDir(type: "shared" | "feature"): string {
  let config: any = null;
  const configPath = path.join(rootDir, "mason.config.json");
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {}
  }
  const configured = type === "shared" ? config?.paths?.shared : config?.paths?.features;
  if (configured) return path.resolve(rootDir, configured);
  const inSrc = path.join(rootDir, "src", type === "shared" ? "shared" : "features");
  if (fs.existsSync(inSrc)) return inSrc;
  return path.join(rootDir, type === "shared" ? "shared" : "features");
}

function processDirectory(type: "shared" | "feature"): IndexEntry[] {
  const targetDir = getTargetDir(type);
  if (!fs.existsSync(targetDir)) return [];

  const modules = fs.readdirSync(targetDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  const indexEntries: IndexEntry[] = [];

  for (const mod of modules) {
    const modDir = path.join(targetDir, mod.name);
    const manifestPath = path.join(modDir, "registry.json");

    let manifest: ModuleManifest;
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } else {
      manifest = {
        name: mod.name,
        type,
        description: `${mod.name} ${type} module`,
        version: "1.0.0",
        dependencies: {
          npm: [],
          shared: [],
          features: [],
        },
        files: [],
      };
    }

    // Auto-discover all files (including test files)
    const files = collectAllModuleFiles(modDir);
    manifest.files = files;

    // Compute composite integrity hash on source files (excluding tests)
    const integrity = computeDirectoryHash(modDir);
    manifest.integrity = integrity;

    // Ensure manifest name and type are set properly
    manifest.name = manifest.name || mod.name;
    manifest.type = type;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
    console.log(`[${type}] ${manifest.name}: ${files.length} files (${integrity.slice(0, 18)}...)`);

    indexEntries.push({
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      integrity,
    });
  }

  return indexEntries.sort((a, b) => a.name.localeCompare(b.name));
}

function build() {
  console.log("🔨 Building Mason Registry...");

  const sharedIndex = processDirectory("shared");
  const featuresIndex = processDirectory("feature");

  const masterIndex: MasterIndex = {
    shared: sharedIndex,
    features: featuresIndex,
  };

  const indexPath = path.join(rootDir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(masterIndex, null, 2) + "\n", "utf-8");

  console.log(`✅ Registry built successfully! Master index written to index.json`);
  console.log(`   Shared modules: ${sharedIndex.length}`);
  console.log(`   Features: ${featuresIndex.length}`);
}

build();
