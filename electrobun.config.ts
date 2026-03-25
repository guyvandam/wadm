import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "WADM",
    identifier: "com.wadm.app",
    version: "0.1.0",
    description: "Weighted Average Decision Matrix",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
  },
  scripts: {
    preBuild: "build-frontend.ts",
    postBuild: "scripts/copy-dist.ts",
  },
} satisfies ElectrobunConfig;
