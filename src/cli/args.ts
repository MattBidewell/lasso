import path from "node:path";

export interface CliOptions {
  targetPath: string;
  watchEnabled: boolean;
}

export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let targetPath = process.cwd();
  let watchEnabled = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      console.log(`
lasso - TUI for managing Cloudflare Wrangler configs

Usage:
  lasso [path] [options]

Arguments:
  path                  Directory to search (default: cwd)

Options:
  -h, --help            Show help
  -v, --version         Show version
  --no-watch            Disable file watching
`);
      process.exit(0);
    }

    if (arg === "--version" || arg === "-v") {
      console.log("lasso v0.1.0");
      process.exit(0);
    }

    if (arg === "--no-watch") {
      watchEnabled = false;
      continue;
    }

    // Assume it's a path
    if (arg && !arg.startsWith("-")) {
      targetPath = path.resolve(arg);
    }
  }

  return { targetPath, watchEnabled };
}
