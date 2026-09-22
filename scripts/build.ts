import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
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
	integrity?: string;
	commit?: string;
	dependencies: {
		npm: string[];
		shared: string[];
		features: string[];
	};
	files: string[];
	[key: string]: unknown;
}

interface IndexEntry {
	name: string;
	description: string;
	version?: string;
	integrity?: string;
	commit?: string;
	[key: string]: unknown;
}

interface MasterIndex {
	shared: IndexEntry[];
	features: IndexEntry[];
}

interface MasonConfig {
	paths?: {
		shared?: string;
		features?: string;
	};
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
	let config: MasonConfig | null = null;
	const configPath = path.join(rootDir, "mason.config.json");
	if (fs.existsSync(configPath)) {
		try {
			config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as MasonConfig;
		} catch {}
	}
	const configured =
		type === "shared" ? config?.paths?.shared : config?.paths?.features;
	if (configured) return path.resolve(rootDir, configured);
	const inSrc = path.join(
		rootDir,
		"src",
		type === "shared" ? "shared" : "features",
	);
	if (fs.existsSync(inSrc)) return inSrc;
	return path.join(rootDir, type === "shared" ? "shared" : "features");
}

function checkGitStatusForDir(dirPath: string): {
	hasChanges: boolean;
	filesCount: number;
} {
	try {
		const relPath = path.relative(rootDir, dirPath);
		const output = execSync(`git status --porcelain -- "${relPath}"`, {
			cwd: rootDir,
			stdio: ["ignore", "pipe", "ignore"],
			encoding: "utf-8",
		}).trim();

		if (!output) {
			return { hasChanges: false, filesCount: 0 };
		}

		const lines = output
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.length > 0 && !l.endsWith("registry.json"));
		return { hasChanges: lines.length > 0, filesCount: lines.length };
	} catch {
		return { hasChanges: false, filesCount: 0 };
	}
}

function getLatestCommitForDir(dirPath: string): string | undefined {
	try {
		const relPath = path.relative(rootDir, dirPath);
		const regJsonPath = path.join(relPath, "registry.json").replace(/\\/g, "/");
		const output = execSync(
			`git log -n 1 --format="%H" -- "${relPath}" ":(exclude)${regJsonPath}"`,
			{
				cwd: rootDir,
				stdio: ["ignore", "pipe", "ignore"],
				encoding: "utf-8",
			},
		).trim();

		return output || undefined;
	} catch {
		return undefined;
	}
}

function checkModuleLinting(dirPath: string): void {
	const relPath = path.relative(rootDir, dirPath);
	try {
		execSync(`pnpm exec biome check --error-on-warnings "${relPath}"`, {
			cwd: rootDir,
			stdio: ["ignore", "pipe", "pipe"],
			encoding: "utf-8",
		});
	} catch (err: unknown) {
		const execErr = err as {
			stdout?: string;
			stderr?: string;
			message?: string;
		};
		const output = (
			execErr.stdout ||
			execErr.stderr ||
			execErr.message ||
			""
		).trim();
		throw new Error(`Biome check failed for module '${relPath}':\n${output}`);
	}
}

function processDirectory(type: "shared" | "feature"): IndexEntry[] {
	const targetDir = getTargetDir(type);
	if (!fs.existsSync(targetDir)) return [];

	const modules = fs
		.readdirSync(targetDir, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !d.name.startsWith("."));

	const indexEntries: IndexEntry[] = [];

	for (const mod of modules) {
		const modDir = path.join(targetDir, mod.name);
		const manifestPath = path.join(modDir, "registry.json");

		// 1. Verify working directory is clean in git
		const gitStatus = checkGitStatusForDir(modDir);
		if (gitStatus.hasChanges) {
			throw new Error(
				`Cannot build registry: Module '${type}/${mod.name}' has ${gitStatus.filesCount} uncommitted git change(s). Please commit changes first.`,
			);
		}

		// 2. Lint check for this module
		checkModuleLinting(modDir);

		// 3. Git commit hash check
		const commitHash = getLatestCommitForDir(modDir);
		if (!commitHash) {
			throw new Error(
				`Cannot build registry: Module '${type}/${mod.name}' has no git commit history. Please commit the module to git before registering.`,
			);
		}

		let manifest: ModuleManifest;
		if (fs.existsSync(manifestPath)) {
			manifest = JSON.parse(
				fs.readFileSync(manifestPath, "utf-8"),
			) as ModuleManifest;
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
		manifest.commit = commitHash;

		// Ensure manifest name and type are set properly
		manifest.name = manifest.name || mod.name;
		manifest.type = type;

		fs.writeFileSync(
			manifestPath,
			`${JSON.stringify(manifest, null, 2)}\n`,
			"utf-8",
		);
		console.log(
			`[${type}] ${manifest.name}: ${files.length} files (commit: ${commitHash.slice(0, 7)}, ${integrity.slice(0, 18)}...)`,
		);

		indexEntries.push({
			name: manifest.name,
			description: manifest.description,
			version: manifest.version,
			integrity,
			commit: commitHash,
		});
	}

	return indexEntries.sort((a, b) => a.name.localeCompare(b.name));
}

function build() {
	console.log("🔨 Building Mason Registry...");

	// 1. Verify TypeScript types
	console.log("🔍 Verifying TypeScript typecheck...");
	try {
		execSync("pnpm exec tsc --noEmit", {
			cwd: rootDir,
			stdio: ["ignore", "pipe", "pipe"],
			encoding: "utf-8",
		});
	} catch (err: unknown) {
		const execErr = err as {
			stdout?: string;
			stderr?: string;
			message?: string;
		};
		const output = (
			execErr.stdout ||
			execErr.stderr ||
			execErr.message ||
			""
		).trim();
		console.error(`❌ TypeScript typecheck failed:\n${output}`);
		process.exit(1);
	}

	// 2. Verify architectural rules
	console.log("🔍 Verifying Mason architectural dependency rules...");
	try {
		execSync("pnpm exec mason lint --complete", {
			cwd: rootDir,
			stdio: ["ignore", "pipe", "pipe"],
			encoding: "utf-8",
		});
	} catch (err: unknown) {
		const execErr = err as {
			stdout?: string;
			stderr?: string;
			message?: string;
		};
		const output = (
			execErr.stdout ||
			execErr.stderr ||
			execErr.message ||
			""
		).trim();
		console.error(`❌ Mason architectural lint failed:\n${output}`);
		process.exit(1);
	}

	const sharedIndex = processDirectory("shared");
	const featuresIndex = processDirectory("feature");

	const masterIndex: MasterIndex = {
		shared: sharedIndex,
		features: featuresIndex,
	};

	const indexPath = path.join(rootDir, "index.json");
	fs.writeFileSync(
		indexPath,
		`${JSON.stringify(masterIndex, null, 2)}\n`,
		"utf-8",
	);

	console.log(
		"✅ Registry built successfully! Master index written to index.json",
	);
	console.log(`   Shared modules: ${sharedIndex.length}`);
	console.log(`   Features: ${featuresIndex.length}`);
}

build();
