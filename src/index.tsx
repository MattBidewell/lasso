import path from "node:path";
import { render } from "@opentui/solid";
import { App } from "./App.tsx";
import { setConfigs, addConfig, removeConfig, setStatusMessage, setAnsiEnabled, setToastMessage } from "./state/store.ts";
import { setRenderCallback, exitApp } from "./state/actions.ts";
import { findWranglerConfigs, discoverAndParse, watchWranglerConfigs } from "./core/discovery/index.ts";
import { parseConfig } from "./core/discovery/parse-config.ts";
import { parseArgs } from "./cli/args.ts";
import { checkForUpdate, runUpdate } from "./core/update.ts";
import type { FSWatcher } from "chokidar";

let watcher: FSWatcher | null = null;

async function main() {
  const cliOptions = parseArgs();
  if (cliOptions.command === "update" || cliOptions.command === "upgrade") {
    await runUpdate(cliOptions.assumeYes);
    process.exit(0);
  }

  const cwd = cliOptions.targetPath;
  setAnsiEnabled(cliOptions.ansiEnabled);

  const updateMessage = await checkForUpdate();
  if (updateMessage) {
    setToastMessage(updateMessage);
    setTimeout(() => setToastMessage(null), 2000);
  }

  // Set up render callback for process controller
  setRenderCallback(() => {
    // Solid handles reactivity automatically
  });

  // Initial config discovery
  const configPaths = await findWranglerConfigs({ cwd });
  const configs = await discoverAndParse(cwd, configPaths);
  setConfigs(configs);

  // Set up file watcher (if enabled)
  if (cliOptions.watchEnabled) {
    watcher = watchWranglerConfigs({
      cwd,
      onAdd: (filePath) => {
        try {
          const config = parseConfig(filePath, cwd);
          addConfig(config);
          const relativePath = path.relative(cwd, filePath);
          setStatusMessage(`Added: ${relativePath}`);
          setTimeout(() => setStatusMessage(null), 2000);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setStatusMessage(`Error adding config: ${errorMsg}`);
          setTimeout(() => setStatusMessage(null), 3000);
        }
      },
      onChange: (filePath) => {
        try {
          const config = parseConfig(filePath, cwd);
          addConfig(config); // addConfig handles updates
          const relativePath = path.relative(cwd, filePath);
          setStatusMessage(`Updated: ${relativePath}`);
          setTimeout(() => setStatusMessage(null), 2000);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setStatusMessage(`Error updating config: ${errorMsg}`);
          setTimeout(() => setStatusMessage(null), 3000);
        }
      },
      onRemove: (filePath) => {
        removeConfig(filePath);
        const relativePath = path.relative(cwd, filePath);
        setStatusMessage(`Removed: ${relativePath}`);
        setTimeout(() => setStatusMessage(null), 2000);
      },
    });
  }

  // Cleanup on exit
  const cleanup = () => {
    watcher?.close();
    exitApp();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Start the render - this blocks until the app exits
  // exitOnCtrlC: false lets us handle Ctrl+C ourselves in App.tsx
  await render(() => <App />, { exitOnCtrlC: false });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
