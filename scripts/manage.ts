import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export interface ModuleManifest {
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

export interface IndexEntry {
	name: string;
	description: string;
	version?: string;
	integrity?: string;
	[key: string]: any;
}

export interface MasterIndex {
	shared: IndexEntry[];
	features: IndexEntry[];
}

export interface RegistryModuleStatus {
	name: string;
	type: "shared" | "feature";
	isRegistered: boolean;
	existsOnDisk: boolean;
	hasUncommittedGitChanges: boolean;
	uncommittedFilesCount: number;
	hasIntegrityDrift: boolean;
	localIntegrity?: string | undefined;
	registeredIntegrity?: string | undefined;
}

export function handleCancel<T>(value: T): Exclude<T, symbol> {
	if (p.isCancel(value)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}
	return value as Exclude<T, symbol>;
}

export function collectFiles(dir: string, baseDir: string = dir): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

		if (entry.isDirectory()) {
			if (entry.name.startsWith(".")) {
				continue;
			}
			files.push(...collectFiles(fullPath, baseDir));
		} else if (entry.isFile()) {
			if (entry.name === "registry.json" || entry.name.startsWith(".")) {
				continue;
			}
			files.push(relPath);
		}
	}

	return files.sort();
}

export function collectSourceFiles(
	dir: string,
	baseDir: string = dir,
): string[] {
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

export function computeDirectoryHash(
	dirPath: string,
	files?: string[],
): string {
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

export function loadMasterIndex(): MasterIndex {
	const indexPath = path.join(rootDir, "index.json");
	if (!fs.existsSync(indexPath)) {
		const initialIndex: MasterIndex = { shared: [], features: [] };
		fs.writeFileSync(
			indexPath,
			JSON.stringify(initialIndex, null, 2) + "\n",
			"utf-8",
		);
		return initialIndex;
	}
	return JSON.parse(fs.readFileSync(indexPath, "utf-8")) as MasterIndex;
}

export function saveMasterIndex(index: MasterIndex): void {
	const indexPath = path.join(rootDir, "index.json");
	index.shared.sort((a, b) => a.name.localeCompare(b.name));
	index.features.sort((a, b) => a.name.localeCompare(b.name));
	fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

function getTargetFolder(type: "shared" | "feature"): string {
	let config: any = null;
	const configPath = path.join(rootDir, "mason.config.json");
	if (fs.existsSync(configPath)) {
		try {
			config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
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

export function discoverDiskModules(): Array<{
	name: string;
	type: "shared" | "feature";
	dir: string;
}> {
	const results: Array<{
		name: string;
		type: "shared" | "feature";
		dir: string;
	}> = [];

	const sharedDir = getTargetFolder("shared");
	if (fs.existsSync(sharedDir)) {
		const entries = fs.readdirSync(sharedDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory() && !entry.name.startsWith(".")) {
				results.push({
					name: entry.name,
					type: "shared",
					dir: path.join(sharedDir, entry.name),
				});
			}
		}
	}

	const featuresDir = getTargetFolder("feature");
	if (fs.existsSync(featuresDir)) {
		const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory() && !entry.name.startsWith(".")) {
				results.push({
					name: entry.name,
					type: "feature",
					dir: path.join(featuresDir, entry.name),
				});
			}
		}
	}

	return results;
}

export function checkGitStatusForDir(dirPath: string): {
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

		const lines = output.split("\n").filter((l) => l.trim().length > 0);
		return { hasChanges: true, filesCount: lines.length };
	} catch {
		return { hasChanges: false, filesCount: 0 };
	}
}

export function getRegistryDiff(): RegistryModuleStatus[] {
	const index = loadMasterIndex();
	const diskModules = discoverDiskModules();
	const diskMap = new Map<
		string,
		{ type: "shared" | "feature"; dir: string }
	>();

	for (const mod of diskModules) {
		diskMap.set(`${mod.type}:${mod.name}`, mod);
	}

	const allKeys = new Set<string>();
	for (const item of index.shared) {
		allKeys.add(`shared:${item.name}`);
	}
	for (const item of index.features) {
		allKeys.add(`feature:${item.name}`);
	}
	for (const mod of diskModules) {
		allKeys.add(`${mod.type}:${mod.name}`);
	}

	const statuses: RegistryModuleStatus[] = [];

	for (const key of allKeys) {
		const [typeStr, name] = key.split(":") as ["shared" | "feature", string];
		const type = typeStr;

		const registeredEntry = (
			type === "shared" ? index.shared : index.features
		).find((e) => e.name === name);
		const isRegistered = Boolean(registeredEntry);
		const diskInfo = diskMap.get(key);
		const existsOnDisk = Boolean(diskInfo && fs.existsSync(diskInfo.dir));

		let hasUncommittedGitChanges = false;
		let uncommittedFilesCount = 0;
		let hasIntegrityDrift = false;
		let localIntegrity: string | undefined;

		if (existsOnDisk && diskInfo) {
			const git = checkGitStatusForDir(diskInfo.dir);
			hasUncommittedGitChanges = git.hasChanges;
			uncommittedFilesCount = git.filesCount;

			localIntegrity = computeDirectoryHash(diskInfo.dir);
			if (isRegistered && registeredEntry?.integrity) {
				hasIntegrityDrift = localIntegrity !== registeredEntry.integrity;
			}
		}

		statuses.push({
			name,
			type,
			isRegistered,
			existsOnDisk,
			hasUncommittedGitChanges,
			uncommittedFilesCount,
			hasIntegrityDrift,
			localIntegrity,
			registeredIntegrity: registeredEntry?.integrity,
		});
	}

	return statuses.sort(
		(a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
	);
}

export function diffRegistry(): void {
	const diffs = getRegistryDiff();

	p.log.step(pc.bold("📋 Mason Registry Diff & Status Summary"));

	const unregistered = diffs.filter((d) => d.existsOnDisk && !d.isRegistered);
	const uncommitted = diffs.filter(
		(d) => d.existsOnDisk && d.hasUncommittedGitChanges,
	);
	const committedDrift = diffs.filter(
		(d) =>
			d.existsOnDisk &&
			d.isRegistered &&
			!d.hasUncommittedGitChanges &&
			d.hasIntegrityDrift,
	);
	const upToDate = diffs.filter(
		(d) =>
			d.existsOnDisk &&
			d.isRegistered &&
			!d.hasUncommittedGitChanges &&
			!d.hasIntegrityDrift,
	);
	const missing = diffs.filter((d) => !d.existsOnDisk && d.isRegistered);

	if (unregistered.length > 0) {
		p.log.message(
			pc.yellow(`\n📦 Unregistered Modules (${unregistered.length}):`),
		);
		for (const mod of unregistered) {
			p.log.message(
				`  ${pc.red("●")} ${pc.bold(`${mod.type}/${mod.name}`)} ${pc.dim("(not registered in index.json)")}`,
			);
		}
	}

	if (uncommitted.length > 0) {
		p.log.message(
			pc.yellow(`\n💾 Uncommitted Changes in Git (${uncommitted.length}):`),
		);
		for (const mod of uncommitted) {
			p.log.message(
				`  ${pc.yellow("▲")} ${pc.bold(`${mod.type}/${mod.name}`)} ${pc.dim(`(${mod.uncommittedFilesCount} modified/untracked files)`)}`,
			);
		}
	}

	if (committedDrift.length > 0) {
		p.log.message(
			pc.cyan(
				`\n🚀 Committed But Unregistered Changes (${committedDrift.length}):`,
			),
		);
		for (const mod of committedDrift) {
			p.log.message(
				`  ${pc.cyan("◆")} ${pc.bold(`${mod.type}/${mod.name}`)} ${pc.dim(
					`local: ${mod.localIntegrity?.slice(0, 16)}... != registered: ${mod.registeredIntegrity?.slice(0, 16)}...`,
				)}`,
			);
		}
	}

	if (missing.length > 0) {
		p.log.message(pc.red(`\n⚠️ Missing on Disk (${missing.length}):`));
		for (const mod of missing) {
			p.log.message(
				`  ${pc.red("✕")} ${pc.bold(`${mod.type}/${mod.name}`)} ${pc.dim("(in index.json, but folder missing)")}`,
			);
		}
	}

	if (upToDate.length > 0) {
		p.log.message(
			pc.green(`\n✓ Up to Date & Registered (${upToDate.length}):`),
		);
		for (const mod of upToDate) {
			p.log.message(
				`  ${pc.green("✔")} ${mod.type}/${mod.name} ${pc.dim(`(${mod.registeredIntegrity?.slice(0, 18)}...)`)}`,
			);
		}
	}

	p.log.message("");
}

export async function registerModule(
	typeArg?: string,
	nameArg?: string,
): Promise<void> {
	const index = loadMasterIndex();

	let type = typeArg?.trim() as "shared" | "feature" | undefined;
	if (!type) {
		type = handleCancel(
			await p.select({
				message: "Module type to register:",
				options: [
					{ value: "feature", label: "Feature" },
					{ value: "shared", label: "Shared Module" },
				],
			}),
		) as "shared" | "feature";
	}

	const diskModules = discoverDiskModules().filter((m) => m.type === type);
	const registeredNames = new Set(
		(type === "shared" ? index.shared : index.features).map((m) => m.name),
	);
	const unregistered = diskModules.filter((m) => !registeredNames.has(m.name));

	let name = nameArg?.trim();
	if (!name) {
		if (unregistered.length > 0) {
			const opts = unregistered.map((m) => ({
				value: m.name,
				label: m.name,
				hint: "unregistered on disk",
			}));
			opts.push({
				value: "__custom__",
				label: "✏️ Enter custom name...",
				hint: "",
			});

			const choice = handleCancel(
				await p.select({
					message: `Select a ${type} to register:`,
					options: opts,
				}),
			);
			if (choice === "__custom__") {
				name = handleCancel(
					await p.text({
						message: `Enter ${type} name:`,
						validate: (v) =>
							v && v.trim() ? undefined : "Name cannot be empty",
					}),
				).trim();
			} else {
				name = choice;
			}
		} else {
			name = handleCancel(
				await p.text({
					message: `Enter ${type} name to register:`,
					validate: (v) => (v && v.trim() ? undefined : "Name cannot be empty"),
				}),
			).trim();
		}
	}

	const folder = getTargetFolder(type);
	const modDir = path.join(folder, name);

	if (!fs.existsSync(modDir)) {
		p.log.error(
			pc.red(
				`Module directory does not exist: ${path.relative(rootDir, modDir)}`,
			),
		);
		process.exit(1);
	}

	const files = collectFiles(modDir);
	const integrity = computeDirectoryHash(modDir);

	const manifestPath = path.join(modDir, "registry.json");
	let manifest: ModuleManifest;

	if (fs.existsSync(manifestPath)) {
		manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
	} else {
		manifest = {
			name,
			type,
			description: `${name} ${type} module`,
			version: "1.0.0",
			dependencies: {
				npm: [],
				shared: [],
				features: [],
			},
			files: [],
		};
	}

	manifest.name = name;
	manifest.type = type;
	manifest.files = files;
	manifest.integrity = integrity;

	fs.writeFileSync(
		manifestPath,
		JSON.stringify(manifest, null, 2) + "\n",
		"utf-8",
	);

	const targetList = type === "shared" ? index.shared : index.features;
	const existingIdx = targetList.findIndex((item) => item.name === name);

	if (existingIdx >= 0) {
		targetList[existingIdx] = {
			name,
			description: manifest.description,
			version: manifest.version,
			integrity,
		};
	} else {
		targetList.push({
			name,
			description: manifest.description,
			version: manifest.version,
			integrity,
		});
	}

	saveMasterIndex(index);

	p.log.success(
		pc.green(
			`✓ Module '${type}/${name}' registered in index.json (${files.length} files, ${integrity.slice(0, 18)}...)`,
		),
	);
}

export async function commitModule(
	typeArg?: string,
	nameArg?: string,
	messageArg?: string,
): Promise<void> {
	let type = typeArg?.trim() as "shared" | "feature" | undefined;
	if (!type) {
		type = handleCancel(
			await p.select({
				message: "Module type to commit:",
				options: [
					{ value: "feature", label: "Feature" },
					{ value: "shared", label: "Shared Module" },
				],
			}),
		) as "shared" | "feature";
	}

	let name = nameArg?.trim();
	if (!name) {
		const diskModules = discoverDiskModules().filter((m) => m.type === type);
		const opts = diskModules.map((m) => {
			const git = checkGitStatusForDir(m.dir);
			return {
				value: m.name,
				label: m.name,
				hint: git.hasChanges
					? `${git.filesCount} uncommitted files`
					: "clean working tree",
			};
		});

		name = handleCancel(
			await p.select({
				message: `Select ${type} to commit:`,
				options: opts,
			}),
		);
	}

	const folder = getTargetFolder(type);
	const modDir = path.join(folder, name);

	if (!fs.existsSync(modDir)) {
		p.log.error(
			pc.red(
				`Module directory does not exist: ${path.relative(rootDir, modDir)}`,
			),
		);
		process.exit(1);
	}

	const relModDir = path.relative(rootDir, modDir);
	const gitStatus = checkGitStatusForDir(modDir);

	if (!gitStatus.hasChanges) {
		p.log.warn(
			pc.yellow(`No uncommitted git changes found in '${type}/${name}'.`),
		);
		return;
	}

	let message = messageArg?.trim();
	if (!message) {
		message = handleCancel(
			await p.text({
				message: `Commit message for ${type}/${name}:`,
				placeholder: `e.g. feat(${name}): update use cases and dependencies`,
				validate: (v) =>
					v && v.trim() ? undefined : "Commit message cannot be empty",
			}),
		).trim();
	}

	const s = p.spinner();
	s.start(`Committing '${type}/${name}' to git repository...`);

	try {
		execSync(`git add "${relModDir}"`, {
			cwd: rootDir,
			stdio: ["ignore", "pipe", "pipe"],
		});
		execSync(
			`git commit -m "${message.replace(/"/g, '\\"')}" -- "${relModDir}"`,
			{
				cwd: rootDir,
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		s.stop(`Changes for '${type}/${name}' committed to git.`);
		p.log.success(pc.green(`✓ Committed '${type}/${name}': "${message}"`));
	} catch (err: any) {
		s.stop(pc.red("Git commit failed."));
		p.log.error(pc.red(err.message || String(err)));
		process.exit(1);
	}
}

export async function registerModuleChanges(
	typeArg?: string,
	nameArg?: string,
	versionArg?: string,
): Promise<void> {
	const index = loadMasterIndex();

	let type = typeArg?.trim() as "shared" | "feature" | undefined;
	if (!type) {
		type = handleCancel(
			await p.select({
				message: "Module type to update:",
				options: [
					{ value: "feature", label: "Feature" },
					{ value: "shared", label: "Shared Module" },
				],
			}),
		) as "shared" | "feature";
	}

	let name = nameArg?.trim();
	if (!name) {
		const diskModules = discoverDiskModules().filter((m) => m.type === type);
		const diffs = getRegistryDiff().filter(
			(d) => d.type === type && d.isRegistered,
		);

		const opts = diskModules.map((m) => {
			const d = diffs.find((item) => item.name === m.name);
			return {
				value: m.name,
				label: m.name,
				hint: d?.hasIntegrityDrift
					? "drift detected (needs register)"
					: "up to date",
			};
		});

		name = handleCancel(
			await p.select({
				message: `Select ${type} to register changes:`,
				options: opts,
			}),
		);
	}

	const folder = getTargetFolder(type);
	const modDir = path.join(folder, name);

	if (!fs.existsSync(modDir)) {
		p.log.error(
			pc.red(
				`Module directory does not exist: ${path.relative(rootDir, modDir)}`,
			),
		);
		process.exit(1);
	}

	const files = collectFiles(modDir);
	const integrity = computeDirectoryHash(modDir);

	const manifestPath = path.join(modDir, "registry.json");
	let manifest: ModuleManifest;

	if (fs.existsSync(manifestPath)) {
		manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
	} else {
		manifest = {
			name,
			type,
			description: `${name} ${type} module`,
			version: "1.0.0",
			dependencies: { npm: [], shared: [], features: [] },
			files: [],
		};
	}

	manifest.files = files;
	manifest.integrity = integrity;
	if (versionArg) {
		manifest.version = versionArg;
	}

	fs.writeFileSync(
		manifestPath,
		JSON.stringify(manifest, null, 2) + "\n",
		"utf-8",
	);

	const targetList = type === "shared" ? index.shared : index.features;
	const existingIdx = targetList.findIndex((item) => item.name === name);

	if (existingIdx >= 0) {
		targetList[existingIdx] = {
			name,
			description: manifest.description,
			version: manifest.version,
			integrity,
		};
	} else {
		targetList.push({
			name,
			description: manifest.description,
			version: manifest.version,
			integrity,
		});
	}

	saveMasterIndex(index);

	p.log.success(
		pc.green(
			`✓ Registered changes for '${type}/${name}' (new integrity: ${integrity.slice(0, 18)}...)`,
		),
	);
}

export async function unregisterModule(
	typeArg?: string,
	nameArg?: string,
): Promise<void> {
	const index = loadMasterIndex();

	let type = typeArg?.trim() as "shared" | "feature" | undefined;
	if (!type) {
		type = handleCancel(
			await p.select({
				message: "Module type to unregister:",
				options: [
					{ value: "feature", label: "Feature" },
					{ value: "shared", label: "Shared Module" },
				],
			}),
		) as "shared" | "feature";
	}

	const registeredList = type === "shared" ? index.shared : index.features;
	if (registeredList.length === 0) {
		p.log.warn(`No registered ${type} modules found in index.json.`);
		return;
	}

	let name = nameArg?.trim();
	if (!name) {
		name = handleCancel(
			await p.select({
				message: `Select ${type} to unregister from index.json:`,
				options: registeredList.map((item) => ({
					value: item.name,
					label: item.name,
					hint: item.description,
				})),
			}),
		);
	}

	if (type === "shared") {
		index.shared = index.shared.filter((item) => item.name !== name);
	} else {
		index.features = index.features.filter((item) => item.name !== name);
	}

	saveMasterIndex(index);

	p.log.success(
		pc.green(
			`✓ Unregistered module '${type}/${name}' from index.json (source code retained on disk in ${type === "shared" ? "shared" : "features"}/${name})`,
		),
	);
}

async function main() {
	const args = process.argv.slice(2);
	const action = args[0]?.toLowerCase();

	// Parse simple flags like -m "message"
	let message: string | undefined;
	let version: string | undefined;
	const positionalArgs: string[] = [];

	for (let i = 1; i < args.length; i++) {
		if (args[i] === "-m" || args[i] === "--message") {
			message = args[i + 1];
			i++;
		} else if (args[i] === "-v" || args[i] === "--version") {
			version = args[i + 1];
			i++;
		} else if (!args[i].startsWith("-")) {
			positionalArgs.push(args[i]);
		}
	}

	const type = positionalArgs[0];
	const name = positionalArgs[1];

	if (!action) {
		const selectedAction = handleCancel(
			await p.select({
				message: "🏛️  Mason Registry: What would you like to do?",
				options: [
					{
						value: "status",
						label: "Inspect Status & Diff",
						hint: "Summary of unregistered, uncommitted, and drifted modules",
					},
					{
						value: "register",
						label: "Register Module",
						hint: "Add an existing module to index.json with integrity checksum",
					},
					{
						value: "commit",
						label: "Commit Changes",
						hint: "Commit a module's working changes to git in the background",
					},
					{
						value: "register-changes",
						label: "Register Changes",
						hint: "Update index.json & registry.json with latest checksums",
					},
					{
						value: "unregister",
						label: "Unregister Module",
						hint: "Remove module from index.json (source code stays on disk)",
					},
				],
			}),
		);

		switch (selectedAction) {
			case "status":
				diffRegistry();
				break;
			case "register":
				await registerModule();
				break;
			case "commit":
				await commitModule();
				break;
			case "register-changes":
				await registerModuleChanges();
				break;
			case "unregister":
				await unregisterModule();
				break;
		}
		return;
	}

	switch (action) {
		case "status":
		case "diff":
			diffRegistry();
			break;
		case "register":
			await registerModule(type, name);
			break;
		case "commit":
			await commitModule(type, name, message);
			break;
		case "register-changes":
		case "update":
			await registerModuleChanges(type, name, version);
			break;
		case "unregister":
			await unregisterModule(type, name);
			break;
		default:
			console.error(
				pc.red(
					`Unknown action: "${action}". Valid actions: status, diff, register, commit, register-changes, unregister.`,
				),
			);
			process.exit(1);
	}
}

main().catch((err) => {
	p.log.error(pc.red(err instanceof Error ? err.message : String(err)));
	process.exit(1);
});
