import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts", "src/client/index.ts", "src/client/core.ts", "src/server/index.ts"],
  minify: true,
  format: ["cjs", "esm"],
  dts: false,
  clean: true,
  external: ["react", "react-dom"],
  ...options,
}));
