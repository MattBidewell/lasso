#!/usr/bin/env node
import { parseArgs } from "./cli/index.ts";
import { LassoApp } from "./app.ts";

async function main(): Promise<void> {
  const { targetPath, watchEnabled } = parseArgs();

  const app = new LassoApp(targetPath, watchEnabled);
  await app.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
