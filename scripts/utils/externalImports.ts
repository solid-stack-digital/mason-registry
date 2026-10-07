import fs from "node:fs";
import path from "node:path";

const STATIC_IMPORT_RE =
	/\b(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const IMPLICIT_REGISTRY_PACKAGES = new Set(["@solid-stack/di"]);

export interface ManifestDependencies {
	npm?: string[];
	npmDev?: string[];
}

export function normalizePackageName(specifier: string): string | null {
	if (
		specifier.startsWith(".") ||
		specifier.startsWith("/") ||
		specifier.startsWith("@/") ||
		specifier.startsWith("node:")
	)
		return null;
	if (specifier.startsWith("@")) {
		const [scope, name] = specifier.split("/");
		return scope && name ? `${scope}/${name}` : null;
	}
	return specifier.split("/")[0] ?? null;
}

export function stripPackageVersion(pkg: string): string {
	if (pkg.startsWith("@")) {
		const separator = pkg.indexOf("@", 1);
		return separator === -1 ? pkg : pkg.slice(0, separator);
	}
	return pkg.split("@")[0] ?? pkg;
}

export function extractExternalImports(content: string): Set<string> {
	const result = new Set<string>();
	for (const regex of [STATIC_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
		regex.lastIndex = 0;
		let match = regex.exec(content);
		while (match) {
			const pkg = match[1] ? normalizePackageName(match[1]) : null;
			if (pkg) result.add(pkg);
			match = regex.exec(content);
		}
	}
	return result;
}

function collectSourceFiles(dir: string, baseDir = dir): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const absolutePath = path.join(dir, entry.name);
		if (entry.isDirectory())
			return entry.name.startsWith(".") || entry.name === "__tests__"
				? []
				: collectSourceFiles(absolutePath, baseDir);
		if (
			!entry.isFile() ||
			entry.name.endsWith(".test.ts") ||
			entry.name.endsWith(".spec.ts") ||
			!/\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(entry.name)
		)
			return [];
		return [path.relative(baseDir, absolutePath)];
	});
}

export function validateManifestNpmDependencies(
	moduleDir: string,
	manifest: { name: string; type: string; dependencies: ManifestDependencies },
): void {
	const declared = new Set(
		[
			...(manifest.dependencies?.npm ?? []),
			...(manifest.dependencies?.npmDev ?? []),
		].map(stripPackageVersion),
	);
	const used = new Set<string>();
	for (const relativeFile of collectSourceFiles(moduleDir)) {
		const content = fs.readFileSync(
			path.join(moduleDir, relativeFile),
			"utf-8",
		);
		for (const pkg of extractExternalImports(content))
			if (!IMPLICIT_REGISTRY_PACKAGES.has(pkg)) used.add(pkg);
	}
	const undeclared = [...used].filter((pkg) => !declared.has(pkg)).sort();
	if (undeclared.length > 0) {
		throw new Error(
			[
				`Registry module '${manifest.type}/${manifest.name}' imports undeclared npm packages:`,
				...undeclared.map((pkg) => `  - ${pkg}`),
				"Add them to registry.json dependencies.npm or dependencies.npmDev.",
			].join("\n"),
		);
	}
}
