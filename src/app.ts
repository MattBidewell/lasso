import type { ChildProcess } from "node:child_process";
import { createCliRenderer, type CliRenderer } from "@opentui/core";
import type { FSWatcher } from "chokidar";
import {
  findWranglerConfigs,
  parseConfig,
  watchWranglerConfigs,
} from "./discovery/index.ts";
import {
  runWranglerDev,
  runWranglerDeploy,
  runWranglerDeployAll,
  stopProcess,
} from "./runner/index.ts";
import {
  type AppState,
  type DeployScope,
  createInitialState,
} from "./types/app.ts";
import { parseKeyEvent, isCtrlC, isCtrlD, renderMainScreen } from "./ui/index.ts";

export class LassoApp {
  private renderer: CliRenderer | null = null;
  private state: AppState;
  private watcher: FSWatcher | null = null;
  private runningProcess: ChildProcess | null = null;
  private deployCancel: (() => void) | null = null;
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
        if (this.state.isDeploying) {
          this.stopDeploy();
          return;
        }
        if (this.state.isRunning && this.runningProcess) {
          this.stopDevServer();
          return;
        }
        this.cleanup();
        return;
      }

      if (isCtrlD(event)) {
        if (!this.state.modal && !this.state.isRunning && !this.state.isDeploying) {
          this.showDeployModal();
        }
        return;
      }

      const key = parseKeyEvent(event);
      if (key) {
        this.handleKeyPress(key);
      }
    });

    this.renderer.addInputHandler((sequence: string) => {
      if (sequence === "\x03") {
        if (this.state.isDeploying) {
          this.stopDeploy();
          return true;
        }
        if (this.state.isRunning && this.runningProcess) {
          this.stopDevServer();
          return true;
        }
        this.cleanup();
        return true;
      }
      // Ctrl+D
      if (sequence === "\x04") {
        if (!this.state.modal && !this.state.isRunning && !this.state.isDeploying) {
          this.showDeployModal();
        }
        return true;
      }
      return false;
    });
  }

  private handleKeyPress(key: string): void {
    // Modal takes priority
    if (this.state.modal) {
      this.handleModalKeyPress(key);
      return;
    }

    // Global keys
    switch (key) {
      case "q":
        this.stopDeploy();
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
    } else if (this.state.focusedPanel === "environments") {
      this.handleEnvironmentsPanelKey(key);
    } else if (this.state.focusedPanel === "output") {
      this.handleOutputPanelKey(key);
    }
  }

  private handleModalKeyPress(key: string): void {
    switch (key) {
      case "y":
        this.startDeploy("selected");
        break;
      case "a":
        this.startDeploy("all");
        break;
      case "n":
      case "escape":
        this.closeModal();
        break;
    }
  }

  private handleConfigsPanelKey(key: string): void {
    const maxIndex = this.state.configs.length - 1;

    switch (key) {
      case "j":
      case "down": {
        const newIndex = Math.min(this.state.selectedConfigIndex + 1, maxIndex);
        if (newIndex !== this.state.selectedConfigIndex) {
          this.switchConfig(newIndex);
        }
        break;
      }
      case "k":
      case "up": {
        const newIndex = Math.max(this.state.selectedConfigIndex - 1, 0);
        if (newIndex !== this.state.selectedConfigIndex) {
          this.switchConfig(newIndex);
        }
        break;
      }
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

  private switchConfig(newIndex: number): void {
    // Save current output to the current config's storage
    const currentConfig = this.state.configs[this.state.selectedConfigIndex];
    if (currentConfig && this.state.output.length > 0) {
      this.state.outputByConfig[currentConfig.path] = [...this.state.output];
    }

    // Switch to new config
    this.state.selectedConfigIndex = newIndex;
    this.state.selectedEnvIndex = 0;

    // Load saved output for the new config, or clear if none
    const newConfig = this.state.configs[newIndex];
    const savedOutput = newConfig ? this.state.outputByConfig[newConfig.path] : undefined;
    if (savedOutput) {
      this.state.output = [...savedOutput];
    } else {
      this.state.output = [];
      this.state.isRunning = false;
      this.state.isDeploying = false;
      this.state.currentCommand = null;
    }
    this.state.outputScrollOffset = 0;

    this.render();
  }

  private handleEnvironmentsPanelKey(key: string): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected) return;

    const maxEnvIndex = selected.environments.length - 1;
    const hasOutput = this.state.output.length > 0 || this.state.isRunning || this.state.isDeploying;

    switch (key) {
      case "j":
      case "down":
        // If at bottom and output panel exists, go to output
        if (this.state.selectedEnvIndex >= maxEnvIndex && hasOutput) {
          this.state.focusedPanel = "output";
          this.render();
        } else {
          this.state.selectedEnvIndex = Math.min(
            this.state.selectedEnvIndex + 1,
            maxEnvIndex,
          );
          this.render();
        }
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

  private handleOutputPanelKey(key: string): void {
    const maxScroll = Math.max(0, this.state.output.length - 5); // Keep at least 5 lines visible

    switch (key) {
      case "k":
      case "up":
        // Scroll up (increase offset from bottom)
        this.state.outputScrollOffset = Math.min(
          this.state.outputScrollOffset + 1,
          maxScroll,
        );
        this.render();
        break;
      case "j":
      case "down":
        // Scroll down (decrease offset from bottom)
        this.state.outputScrollOffset = Math.max(
          this.state.outputScrollOffset - 1,
          0,
        );
        this.render();
        break;
      case "h":
      case "left":
      case "escape":
        // Go back to environments panel
        this.state.focusedPanel = "environments";
        this.state.outputScrollOffset = 0; // Reset scroll when leaving
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
    this.state.currentCommand = "dev";
    this.state.output = [];
    this.state.outputScrollOffset = 0;
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

  private showDeployModal(): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    // Only allow deploy from environments panel
    if (this.state.focusedPanel !== "environments") return;

    const env = selected.environments[this.state.selectedEnvIndex] ?? "default";
    this.state.modal = {
      type: "deploy-confirm",
      workerName: selected.name,
      environment: env,
      environments: selected.environments,
    };
    this.render();
  }

  private startDeploy(scope: DeployScope): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    this.closeModal();

    this.state.isDeploying = true;
    this.state.currentCommand = "deploy";
    this.state.output = [];
    this.state.outputScrollOffset = 0;
    this.render();

    if (scope === "all") {
      const { cancel } = runWranglerDeployAll({
        configPath: selected.path,
        environments: selected.environments,
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
        onEnvironmentStart: (env) => {
          this.state.output.push(`--- Deploying: ${env} ---`);
          this.render();
        },
        onEnvironmentComplete: (env, code) => {
          this.state.output.push(
            `--- ${env}: ${code === 0 ? "success" : `failed (${code})`} ---`,
          );
          this.render();
        },
        onAllComplete: (results) => {
          const failed = results.filter((r) => r.code !== 0);
          this.state.isDeploying = false;
          this.state.output.push(
            failed.length === 0
              ? `All ${results.length} environment(s) deployed successfully`
              : `Deploy complete: ${results.length - failed.length}/${results.length} succeeded`,
          );
          this.deployCancel = null;
          this.render();
        },
      });
      this.deployCancel = cancel;
    } else {
      const env = selected.environments[this.state.selectedEnvIndex];
      this.runningProcess = runWranglerDeploy({
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
          this.state.isDeploying = false;
          this.state.output.push(
            code === 0
              ? "Deploy completed successfully"
              : `Deploy failed with code ${code}`,
          );
          this.runningProcess = null;
          this.render();
        },
      });
    }
  }

  private stopDeploy(): void {
    if (this.deployCancel) {
      this.deployCancel();
      this.deployCancel = null;
      this.state.isDeploying = false;
      this.state.output.push("Deploy cancelled");
      this.render();
    }
    if (this.runningProcess && this.state.isDeploying) {
      stopProcess(this.runningProcess);
      this.runningProcess = null;
      this.state.isDeploying = false;
      this.state.output.push("Deploy cancelled");
      this.render();
    }
  }

  private closeModal(): void {
    this.state.modal = null;
    this.render();
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
    this.stopDeploy();
    this.stopDevServer();
    this.watcher?.close();
    this.renderer?.destroy();
    process.exit(0);
  }
}
