import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	extractExternalImports,
	stripPackageVersion,
	validateManifestNpmDependencies,
} from "./externalImports.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("registry external dependency validation", () => {
	it("extracts package roots and strips scoped package versions", () => {
		const imports = extractExternalImports(
			'import jwt from "jsonwebtoken"; import type { X } from "@scope/pkg/subpath";',
		);
		expect(imports).toEqual(new Set(["jsonwebtoken", "@scope/pkg"]));
		expect(stripPackageVersion("@types/jsonwebtoken@^9.0.10")).toBe(
			"@types/jsonwebtoken",
		);
	});

	it("rejects an undeclared runtime import", () => {
		const directory = fs.mkdtempSync(
			path.join(os.tmpdir(), "registry-imports-"),
		);
		temporaryDirectories.push(directory);
		fs.writeFileSync(
			path.join(directory, "Jwt.ts"),
			'import jwt from "jsonwebtoken";\n',
		);
		expect(() =>
			validateManifestNpmDependencies(directory, {
				name: "jwt",
				type: "shared",
				dependencies: { npm: [] },
			}),
		).toThrow("jsonwebtoken");
	});
});
