import {
  createCliRenderer,
  ScrollBoxRenderable,
  type CliRenderer,
} from "@opentui/core";
import type { FSWatcher } from "chokidar";
import {
  findWranglerConfigs,
  parseConfig,
  watchWranglerConfigs,
} from "./discovery/index.ts";
import { ProcessController } from "./runner/index.ts";
import { InputRouter } from "./input/index.ts";
import {
  type AppState,
  type TailOptions,
  type DeployOptions,
  createInitialState,
} from "./types/app.ts";
import { parseKeyEvent, isCtrlC, isCtrlD } from "./ui/input.ts";
import { renderMainScreen, type MainScreenPanels } from "./ui/screens/main.ts";
import { ConfigsPanel } from "./ui/panels/config-list.ts";
import { EnvironmentsPanel } from "./ui/panels/environments.ts";
import { OutputPanel } from "./ui/panels/output.ts";
import { LogsPanel } from "./ui/panels/logs.ts";
import { createTailModalState } from "./ui/modals/tail-options.ts";
import { createDeployModalState } from "./ui/modals/deploy-options.ts";

export class LassoApp {
  private renderer: CliRenderer | null = null;
  private state: AppState;
  private watcher: FSWatcher | null = null;
  private watchEnabled: boolean;
  private renderScheduled = false;
  private processController: ProcessController;
  private inputRouter: InputRouter;
  private panels: MainScreenPanels;

  constructor(cwd: string, watchEnabled: boolean) {
    this.state = createInitialState(cwd);
    this.watchEnabled = watchEnabled;

    // Initialize process controller
    this.processController = new ProcessController({
      onOutputLine: (line) => {
        this.state.output.push(line);
      },
      onDevStart: () => {
        this.state.isRunning = true;
        this.state.currentCommand = "dev";
        this.state.output = [];
        this.state.outputScrollOffset = 0;
      },
      onDevEnd: () => {
        this.state.isRunning = false;
      },
      onDeployStart: () => {
        this.state.isDeploying = true;
        this.state.currentCommand = "deploy";
        this.state.output = [];
        this.state.outputScrollOffset = 0;
      },
      onDeployEnd: () => {
        this.state.isDeploying = false;
      },
      onTailStart: () => {
        this.state.isTailing = true;
        this.state.currentCommand = "tail";
        this.state.tailOutput = [];
      },
      onTailEnd: () => {
        this.state.isTailing = false;
      },
      onTailOutputLine: (line) => {
        this.state.tailOutput.push(line);
        // Keep tail output limited to 500 lines
        if (this.state.tailOutput.length > 500) {
          this.state.tailOutput = this.state.tailOutput.slice(-500);
        }
      },
      onRender: () => this.render(),
    });

    // Initialize panels with their callbacks
    this.panels = {
      configs: new ConfigsPanel({
        onRefresh: () => this.refresh(),
        onScrollToSelection: (index) =>
          this.scrollToSelection("configs", index),
      }),
      environments: new EnvironmentsPanel({
        onStartDev: () => this.startDevServer(),
        onScrollToSelection: (index) =>
          this.scrollToSelection("environments", index),
      }),
      output: new OutputPanel({
        onScrollOutput: (delta) => this.scrollOutput(delta),
      }),
      logs: new LogsPanel({
        onScrollLogs: (delta) => this.scrollLogs(delta),
      }),
    };

    // Initialize input router
    this.inputRouter = new InputRouter(
      () => this.state,
      (updates) => Object.assign(this.state, updates),
      {
        onQuit: () => {
          this.processController.stopAll();
          this.cleanup();
        },
        onShowDeployModal: () => this.showDeployModal(),
        onShowTailModal: () => this.showTailModal(),
        onCloseModal: () => this.closeModal(),
        onStartDeploy: (deployOptions) => this.startDeploy(deployOptions),
        onStartTail: (options) => this.startTail(options),
        onStateChange: () => this.scheduleRender(),
      },
    );

    // Register panels with the router
    this.inputRouter.registerPanel(this.panels.configs);
    this.inputRouter.registerPanel(this.panels.environments);
    this.inputRouter.registerPanel(this.panels.output);
    this.inputRouter.registerPanel(this.panels.logs);
  }

  async start(): Promise<void> {
    const configPaths = await findWranglerConfigs({ cwd: this.state.cwd });
    this.state.configs = configPaths.map((p) => parseConfig(p, this.state.cwd));

    this.renderer = await createCliRenderer({
      exitOnCtrlC: false,
      useMouse: true,
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
        // Stop tail if logs panel is focused and tailing
        if (this.state.isTailing && this.state.focusedPanel === "logs") {
          this.processController.stopTail();
          return;
        }
        if (this.state.isDeploying) {
          this.processController.stopDeploy();
          return;
        }
        if (this.state.isRunning) {
          this.processController.stopDevServer();
          return;
        }
        this.cleanup();
        return;
      }

      if (isCtrlD(event)) {
        if (
          !this.state.modal &&
          !this.state.isRunning &&
          !this.state.isDeploying
        ) {
          this.showDeployModal();
        }
        return;
      }

      const key = parseKeyEvent(event);
      if (key) {
        // Handle 't' key for tail modal from environments panel
        if (key === "t" && this.state.focusedPanel === "environments" && !this.state.modal) {
          this.showTailModal();
          return;
        }
        this.inputRouter.handleKeyPress(key);
      }
    });

    this.renderer.addInputHandler((sequence: string) => {
      if (sequence === "\x03") {
        if (this.state.isDeploying) {
          this.processController.stopDeploy();
          return true;
        }
        if (this.state.isRunning) {
          this.processController.stopDevServer();
          return true;
        }
        this.cleanup();
        return true;
      }
      // Ctrl+D
      if (sequence === "\x04") {
        if (
          !this.state.modal &&
          !this.state.isRunning &&
          !this.state.isDeploying
        ) {
          this.showDeployModal();
        }
        return true;
      }
      return false;
    });
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

    const env = selected.environments[this.state.selectedEnvIndex] ?? "default";
    this.processController.startDevServer(selected, env);
    this.render();
  }

  private showDeployModal(): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    // Only allow deploy from environments panel
    if (this.state.focusedPanel !== "environments") return;

    const env = selected.environments[this.state.selectedEnvIndex] ?? "default";
    this.state.modal = createDeployModalState(selected.name, env);
    this.render();
  }

  private startDeploy(deployOptions?: DeployOptions): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    this.closeModal();

    const env = selected.environments[this.state.selectedEnvIndex] ?? "default";
    this.processController.startDeploy(selected, env, deployOptions);
    this.render();
  }

  private closeModal(): void {
    this.state.modal = null;
    this.render();
  }

  private showTailModal(): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    // Only allow tail from environments panel
    if (this.state.focusedPanel !== "environments") return;

    const env = selected.environments[this.state.selectedEnvIndex] ?? "default";
    this.state.modal = createTailModalState(selected.name, env);
    this.render();
  }

  private startTail(options: TailOptions): void {
    const selected = this.state.configs[this.state.selectedConfigIndex];
    if (!selected?.config) return;

    this.closeModal();

    const env = selected.environments[this.state.selectedEnvIndex] ?? "default";
    this.processController.startTail(selected, env, options);
    this.render();
  }

  private render(): void {
    if (!this.renderer) return;

    const children = this.renderer.root.getChildren();
    for (const child of children) {
      this.renderer.root.remove(child.id);
    }

    const content = renderMainScreen(this.state, this.panels);
    if (content) {
      this.renderer.root.add(content);
    }
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;

    setImmediate(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  private scrollToSelection(
    panel: "configs" | "environments",
    index: number,
  ): void {
    if (!this.renderer) return;

    // Defer to next tick to ensure the ScrollBox has been rendered
    setImmediate(() => {
      const scrollBoxId =
        panel === "configs" ? "configs-scrollbox" : "environments-scrollbox";
      const scrollBox = this.renderer?.root.findDescendantById(scrollBoxId);

      if (scrollBox && scrollBox instanceof ScrollBoxRenderable) {
        // Each item is approximately 1 line height
        const itemHeight = 1;
        const targetY = index * itemHeight;
        scrollBox.scrollTo({ x: 0, y: targetY });
      }
    });
  }

  private scrollOutput(delta: number): void {
    if (!this.renderer) return;

    const scrollBox = this.renderer.root.findDescendantById("output-scrollbox");

    if (scrollBox && scrollBox instanceof ScrollBoxRenderable) {
      if (delta === Infinity) {
        // Jump to bottom
        scrollBox.scrollTo({ x: 0, y: scrollBox.scrollHeight });
      } else if (delta === -Infinity) {
        // Jump to top
        scrollBox.scrollTo({ x: 0, y: 0 });
      } else {
        // Scroll by delta lines
        scrollBox.scrollBy({ x: 0, y: delta });
      }
    }
  }

  private scrollLogs(delta: number): void {
    if (!this.renderer) return;

    const scrollBox = this.renderer.root.findDescendantById("logs-scrollbox");

    if (scrollBox && scrollBox instanceof ScrollBoxRenderable) {
      if (delta === Infinity) {
        // Jump to bottom
        scrollBox.scrollTo({ x: 0, y: scrollBox.scrollHeight });
      } else if (delta === -Infinity) {
        // Jump to top
        scrollBox.scrollTo({ x: 0, y: 0 });
      } else {
        // Scroll by delta lines
        scrollBox.scrollBy({ x: 0, y: delta });
      }
    }
  }

  private cleanup(): void {
    this.processController.stopAll();
    this.watcher?.close();
    this.renderer?.destroy();
    process.exit(0);
  }
}
