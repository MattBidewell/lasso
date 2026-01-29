import type { ChildProcess } from "node:child_process";
import { createCliRenderer, type CliRenderer } from "@opentui/core";
import type { FSWatcher } from "chokidar";
import {
  findWranglerConfigs,
  parseConfig,
  watchWranglerConfigs,
} from "./discovery/index.ts";
import { runWranglerDev, stopProcess } from "./runner/index.ts";
import { type AppState, createInitialState } from "./types/app.ts";
import { parseKeyEvent, isCtrlC, renderMainScreen } from "./ui/index.ts";

export class LassoApp {
  private renderer: CliRenderer | null = null;
  private state: AppState;
  private watcher: FSWatcher | null = null;
  private runningProcess: ChildProcess | null = null;
  private watchEnabled: boolean;

  constructor(cwd: string, watchEnabled: boolean) {
    this.state = createInitialState(cwd);
    this.watchEnabled = watchEnabled;
  }

  async start(): Promise<void> {
    const configPaths = await findWranglerConfigs({ cwd: this.state.cwd });
    this.state.configs = configPaths.map((p) => parseConfig(p, this.state.cwd));

    this.renderer = await createCliRenderer({
      exitOnCtrlC: false,
      useMouse: false,
      useAlternateScreen: true,
    });

    this.setupKeyHandling();

    if (this.watchEnabled) {
      this.setupWatcher();
    }

    this.render();

    process.on("SIGINT", () => this.cleanup());
    process.on("SIGTERM", () => this.cleanup());
  }

  private setupKeyHandling(): void {
    if (!this.renderer) return;

    this.renderer.keyInput.on("keypress", (event) => {
      if (isCtrlC(event)) {
        if (this.state.isRunning && this.runningProcess) {
          this.stopDevServer();
          return;
        }
        this.cleanup();
        return;
      }

      const key = parseKeyEvent(event);
      if (key) {
        this.handleKeyPress(key);
      }
    });

    this.renderer.addInputHandler((sequence: string) => {
      if (sequence === "\x03") {
        if (this.state.isRunning && this.runningProcess) {
          this.stopDevServer();
          return true;
        }
        this.cleanup();
        return true;
      }
      return false;
    });
  }

  private handleKeyPress(key: string): void {
    // Global keys
    switch (key) {
      case "q":
        this.stopDevServer();
        this.cleanup();
        return;
      case "r":
        if (this.state.focusedPanel === "configs") {
          this.refresh();
          return;
        }
        break;
    }

    // Panel-specific keys
    if (this.state.focusedPanel === "configs") {
      this.handleConfigsPanelKey(key);
    } else {
      this.handleEnvironmentsPanelKey(key);
    }
  }

  private handleConfigsPanelKey(key: string): void {
    const maxIndex = this.state.configs.length - 1;

    switch (key) {
      case "j":
      case "down":
        this.state.selectedConfigIndex = Math.min(
          this.state.selectedConfigIndex + 1,
          maxIndex,
        );
        this.state.selectedEnvIndex = 0; // Reset env selection when changing config
        this.render();
        break;
      case "k":
      case "up":
        this.state.selectedConfigIndex = Math.max(
          this.state.selectedConfigIndex - 1,
          0,
        );
        this.state.selectedEnvIndex = 0;
        this.render();
        break;
      case "enter":
      case "l":
      case "right":
        if (this.state.configs.length > 0) {
          const selected = this.state.configs[this.state.selectedConfigIndex];
          if (selected?.config) {
            this.state.focusedPanel = "environments";
            this.state.selectedEnvIndex = 0;
            this.render();
          }
        }
        break;
    }
  }

  private handleEnvironmentsPanelKey(key: string): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected) return;

    const maxEnvIndex = selected.environments.length - 1;

    switch (key) {
      case "j":
      case "down":
        this.state.selectedEnvIndex = Math.min(
          this.state.selectedEnvIndex + 1,
          maxEnvIndex,
        );
        this.render();
        break;
      case "k":
      case "up":
        this.state.selectedEnvIndex = Math.max(
          this.state.selectedEnvIndex - 1,
          0,
        );
        this.render();
        break;
      case "enter":
        this.startDevServer();
        break;
      case "h":
      case "left":
      case "escape":
        this.state.focusedPanel = "configs";
        this.render();
        break;
    }
  }

  private setupWatcher(): void {
    this.watcher = watchWranglerConfigs({
      cwd: this.state.cwd,
      onAdd: (filePath) => {
        const config = parseConfig(filePath, this.state.cwd);
        this.state.configs = [...this.state.configs, config].sort((a, b) =>
          a.relativePath.localeCompare(b.relativePath),
        );
        this.state.statusMessage = `Added: ${config.relativePath}`;
        this.render();
        setTimeout(() => {
          this.state.statusMessage = null;
          this.render();
        }, 2000);
      },
      onChange: (filePath) => {
        const config = parseConfig(filePath, this.state.cwd);
        const index = this.state.configs.findIndex((c) => c.path === filePath);
        if (index !== -1) {
          this.state.configs[index] = config;
          this.state.statusMessage = `Updated: ${config.relativePath}`;
          this.render();
          setTimeout(() => {
            this.state.statusMessage = null;
            this.render();
          }, 2000);
        }
      },
      onRemove: (filePath) => {
        const removed = this.state.configs.find((c) => c.path === filePath);
        this.state.configs = this.state.configs.filter(
          (c) => c.path !== filePath,
        );
        this.state.selectedConfigIndex = Math.min(
          this.state.selectedConfigIndex,
          Math.max(0, this.state.configs.length - 1),
        );
        if (removed) {
          this.state.statusMessage = `Removed: ${removed.relativePath}`;
          this.render();
          setTimeout(() => {
            this.state.statusMessage = null;
            this.render();
          }, 2000);
        }
      },
    });
  }

  private async refresh(): Promise<void> {
    this.state.statusMessage = "Refreshing...";
    this.render();

    const configPaths = await findWranglerConfigs({ cwd: this.state.cwd });
    this.state.configs = configPaths.map((p) => parseConfig(p, this.state.cwd));
    this.state.selectedConfigIndex = Math.min(
      this.state.selectedConfigIndex,
      Math.max(0, this.state.configs.length - 1),
    );
    this.state.statusMessage = `Found ${this.state.configs.length} worker(s)`;
    this.render();

    setTimeout(() => {
      this.state.statusMessage = null;
      this.render();
    }, 2000);
  }

  private startDevServer(): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    const env = selected.environments[this.state.selectedEnvIndex];

    this.state.isRunning = true;
    this.state.output = [];
    this.render();

    this.runningProcess = runWranglerDev({
      configPath: selected.path,
      environment: env,
      onStdout: (data) => {
        this.state.output.push(
          ...data.split("\n").filter((line) => line.trim()),
        );
        this.render();
      },
      onStderr: (data) => {
        this.state.output.push(
          ...data.split("\n").filter((line) => line.trim()),
        );
        this.render();
      },
      onExit: (code) => {
        this.state.isRunning = false;
        this.state.output.push(`Process exited with code ${code}`);
        this.runningProcess = null;
        this.render();
      },
    });
  }

  private stopDevServer(): void {
    if (this.runningProcess) {
      stopProcess(this.runningProcess);
      this.runningProcess = null;
      this.state.isRunning = false;
    }
  }

  private render(): void {
    if (!this.renderer) return;

    const children = this.renderer.root.getChildren();
    for (const child of children) {
      this.renderer.root.remove(child.id);
    }

    const content = renderMainScreen(this.state);
    if (content) {
      this.renderer.root.add(content);
    }
  }

  private cleanup(): void {
    this.stopDevServer();
    this.watcher?.close();
    this.renderer?.destroy();
    process.exit(0);
  }
}
