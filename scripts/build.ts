import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

interface ModuleManifest {
  name: string;
  type: "shared" | "feature";
  description: string;
  version: string;
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
  [key: string]: any;
}

interface MasterIndex {
  shared: IndexEntry[];
  features: IndexEntry[];
}

function collectFiles(dir: string, baseDir: string = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      // Ignore tests and hidden folders
      if (entry.name === "__tests__" || entry.name.startsWith(".")) {
        continue;
      }
      files.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      // Ignore registry.json, test files, hidden files
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

function processDirectory(type: "shared" | "feature"): IndexEntry[] {
  const targetDir = path.join(rootDir, type === "shared" ? "shared" : "features");
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

    // Auto-discover files
    const files = collectFiles(modDir);
    manifest.files = files;

    // Ensure manifest name and type are set properly
    manifest.name = manifest.name || mod.name;
    manifest.type = type;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
    console.log(`[${type}] ${manifest.name}: ${files.length} files`);

    indexEntries.push({
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
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
