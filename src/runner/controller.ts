import type { ChildProcess } from "node:child_process";
import type { DiscoveredConfig, DeployScope } from "../types/app.ts";
import { runWranglerDev, runWranglerDeploy, runWranglerDeployAll, stopProcess } from "./index.ts";

/**
 * Callbacks for process lifecycle events
 */
export interface ProcessControllerCallbacks {
  onOutputLine: (line: string) => void;
  onDevStart: () => void;
  onDevEnd: (code: number | null) => void;
  onDeployStart: () => void;
  onDeployEnd: () => void;
  onRender: () => void;
}

/**
 * Manages the lifecycle of wrangler dev and deploy processes
 */
export class ProcessController {
  private runningProcess: ChildProcess | null = null;
  private deployCancel: (() => void) | null = null;
  private _isRunning = false;
  private _isDeploying = false;

  constructor(private callbacks: ProcessControllerCallbacks) {}

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isDeploying(): boolean {
    return this._isDeploying;
  }

  /**
   * Start the wrangler dev server for a config/environment
   */
  startDevServer(config: DiscoveredConfig, env: string): void {
    if (!config.config) return;

    this._isRunning = true;
    this.callbacks.onDevStart();

    this.runningProcess = runWranglerDev({
      configPath: config.path,
      environment: env,
      onStdout: (data) => {
        this.pushOutputLines(data);
        this.callbacks.onRender();
      },
      onStderr: (data) => {
        this.pushOutputLines(data);
        this.callbacks.onRender();
      },
      onExit: (code) => {
        this._isRunning = false;
        this.callbacks.onOutputLine(`Process exited with code ${code}`);
        this.runningProcess = null;
        this.callbacks.onDevEnd(code);
        this.callbacks.onRender();
      },
    });
  }

  /**
   * Stop the running dev server
   */
  stopDevServer(): void {
    if (this.runningProcess) {
      stopProcess(this.runningProcess);
      this.runningProcess = null;
      this._isRunning = false;
    }
  }

  /**
   * Start a deploy for selected environment or all environments
   */
  startDeploy(config: DiscoveredConfig, env: string, scope: DeployScope): void {
    if (!config.config) return;

    this._isDeploying = true;
    this.callbacks.onDeployStart();

    if (scope === "all") {
      const { cancel } = runWranglerDeployAll({
        configPath: config.path,
        environments: config.environments,
        onStdout: (data) => {
          this.pushOutputLines(data);
          this.callbacks.onRender();
        },
        onStderr: (data) => {
          this.pushOutputLines(data);
          this.callbacks.onRender();
        },
        onEnvironmentStart: (envName) => {
          this.callbacks.onOutputLine(`--- Deploying: ${envName} ---`);
          this.callbacks.onRender();
        },
        onEnvironmentComplete: (envName, code) => {
          this.callbacks.onOutputLine(
            `--- ${envName}: ${code === 0 ? "success" : `failed (${code})`} ---`,
          );
          this.callbacks.onRender();
        },
        onAllComplete: (results) => {
          const failed = results.filter((r) => r.code !== 0);
          this._isDeploying = false;
          this.callbacks.onOutputLine(
            failed.length === 0
              ? `All ${results.length} environment(s) deployed successfully`
              : `Deploy complete: ${results.length - failed.length}/${results.length} succeeded`,
          );
          this.deployCancel = null;
          this.callbacks.onDeployEnd();
          this.callbacks.onRender();
        },
      });
      this.deployCancel = cancel;
    } else {
      this.runningProcess = runWranglerDeploy({
        configPath: config.path,
        environment: env,
        onStdout: (data) => {
          this.pushOutputLines(data);
          this.callbacks.onRender();
        },
        onStderr: (data) => {
          this.pushOutputLines(data);
          this.callbacks.onRender();
        },
        onExit: (code) => {
          this._isDeploying = false;
          this.callbacks.onOutputLine(
            code === 0
              ? "Deploy completed successfully"
              : `Deploy failed with code ${code}`,
          );
          this.runningProcess = null;
          this.callbacks.onDeployEnd();
          this.callbacks.onRender();
        },
      });
    }
  }

  /**
   * Stop any running deploy
   */
  stopDeploy(): void {
    if (this.deployCancel) {
      this.deployCancel();
      this.deployCancel = null;
      this._isDeploying = false;
      this.callbacks.onOutputLine("Deploy cancelled");
      this.callbacks.onRender();
    }
    if (this.runningProcess && this._isDeploying) {
      stopProcess(this.runningProcess);
      this.runningProcess = null;
      this._isDeploying = false;
      this.callbacks.onOutputLine("Deploy cancelled");
      this.callbacks.onRender();
    }
  }

  /**
   * Stop all running processes
   */
  stopAll(): void {
    this.stopDeploy();
    this.stopDevServer();
  }

  private pushOutputLines(data: string): void {
    const lines = data.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      this.callbacks.onOutputLine(line);
    }
  }
}
