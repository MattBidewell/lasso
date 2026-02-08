import { readFileSync } from "node:fs";
import solidPlugin from "@opentui/solid/bun-plugin";

function inferTarget(): string {
  const platform = process.platform;
  const arch = process.arch;

  const os = platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : null;
  const cpu = arch === "arm64" ? "arm64" : arch === "x64" ? "x64" : null;

  if (!os || !cpu) {
    throw new Error(`Unsupported platform: ${platform} ${arch}`);
  }

  return `bun-${os}-${cpu}`;
}

const target = process.env.BUILD_TARGET ?? inferTarget();
const outfile = process.env.BUILD_OUTFILE ?? "dist/lasso";

const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as { version?: string };
const version = pkg.version ?? "0.0.0";

const buildConfig = {
  entrypoints: ["src/index.tsx"],
  minify: true,
  plugins: [solidPlugin],
  define: {
    "process.env.LASSO_VERSION": JSON.stringify(version),
  },
  compile: {
    target,
    outfile,
  },
} as unknown as Parameters<typeof Bun.build>[0];

await Bun.build(buildConfig);
