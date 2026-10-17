import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests cover the pure logic in src/lib only, so no DOM environment or
// JSX transform is needed here.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts", "scripts/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
