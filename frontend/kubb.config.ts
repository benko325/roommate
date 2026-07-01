import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";

// Generates typed models, operation clients, and TanStack Query hooks from the
// backend's OpenAPI spec. Regenerate with `pnpm generate:api` after API changes.
export default defineConfig({
  root: ".",
  input: { path: "../backend/openapi.json" },
  output: {
    path: "./src/lib/api/generated",
    clean: true,
    barrelType: "named",
  },
  plugins: [
    pluginOas(),
    pluginTs({ output: { path: "types" } }),
    pluginClient({ output: { path: "clients" } }),
    pluginReactQuery({ output: { path: "hooks" } }),
  ],
});
