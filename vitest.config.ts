import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const esbuild = require(
  require.resolve("esbuild", {
    paths: [process.cwd(), require.resolve("tsx")],
  }),
);

export default defineConfig({
  resolve: {
    alias: {
      "@/shared": path.resolve(__dirname, "./src/shared"),
      "@/features": path.resolve(__dirname, "./src/features"),
    },
  },
  plugins: [
    {
      name: "transform-decorators",
      transform(code, id) {
        if ((id.endsWith(".ts") || id.endsWith(".tsx")) && code.includes("@")) {
          const res = esbuild.transformSync(code, {
            loader: id.endsWith(".tsx") ? "tsx" : "ts",
            target: "node18",
            sourcefile: id,
            sourcemap: true,
          });
          return {
            code: res.code,
            map: res.map,
          };
        }
      },
    },
  ],
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist"],
  },
});
