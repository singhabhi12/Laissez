import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

// Formatting is handled by `npm run format` (prettier), not by lint errors:
// the pre-existing source is written wider than prettier's default and
// reflowing it would churn files this migration never touched.
export default tseslint.config(
  { ignores: [".next", "out", "next-env.d.ts", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // src/components/ui is unmodified shadcn/ui registry output. React's newer
    // purity rules flag upstream patterns there (carousel.tsx, sidebar.tsx);
    // rewriting vendored primitives is out of scope for app linting.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  prettierConfig,
);
