import path from "node:path";
import { getVersion } from "../core/version.ts";

export type CliCommand = "run" | "update" | "upgrade";

export interface CliOptions {
  command: CliCommand;
  targetPath: string;
  watchEnabled: boolean;
  ansiEnabled: boolean;
  assumeYes: boolean;
}

export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let command: CliCommand = "run";
  let targetPath = process.cwd();
  let watchEnabled = true;
  let ansiEnabled = true;
  let assumeYes = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "update" || arg === "upgrade") {
      command = arg;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`
lasso - TUI for managing Cloudflare Wrangler configs

Usage:
  lasso [path] [options]
  lasso update [--yes]
  lasso upgrade [--yes]

Arguments:
  path                  Directory to search (default: cwd)

  Options:
  -h, --help            Show help
  -v, --version         Show version
  --no-watch            Disable file watching
  --no-ansi             Disable ANSI color parsing
  --yes                 Skip confirmation prompts
`);
      process.exit(0);
    }

    if (arg === "--version" || arg === "-v") {
      console.log(`lasso v${getVersion()}`);
      process.exit(0);
    }

    if (arg === "--no-watch") {
      watchEnabled = false;
      continue;
    }

    if (arg === "--no-ansi") {
      ansiEnabled = false;
      continue;
    }

    if (arg === "--ansi") {
      ansiEnabled = true;
      continue;
    }

    if (arg === "--yes") {
      assumeYes = true;
      continue;
    }

    // Assume it's a path
    if (arg && !arg.startsWith("-")) {
      targetPath = path.resolve(arg);
    }
  }

  return { command, targetPath, watchEnabled, ansiEnabled, assumeYes };
}
