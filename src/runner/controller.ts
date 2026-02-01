import type { ChildProcess } from "node:child_process";
import type { DiscoveredConfig, TailOptions, DeployOptions } from "../types/app.ts";
import { runWranglerDev, runWranglerDeploy, runWranglerTail, stopProcess } from "./index.ts";

/**
 * Callbacks for process lifecycle events
 */
export interface ProcessControllerCallbacks {
  onOutputLine: (line: string) => void;
  onDevStart: () => void;
  onDevEnd: (code: number | null) => void;
  onDeployStart: () => void;
  onDeployEnd: () => void;
  onTailStart: () => void;
  onTailEnd: (code: number | null) => void;
  onTailOutputLine: (line: string) => void;
  onRender: () => void;
}

/**
 * Manages the lifecycle of wrangler dev and deploy processes
 */
export class ProcessController {
  private runningProcess: ChildProcess | null = null;
  private tailProcess: ChildProcess | null = null;
  private _isRunning = false;
  private _isDeploying = false;
  private _isTailing = false;

  constructor(private callbacks: ProcessControllerCallbacks) {}

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isDeploying(): boolean {
    return this._isDeploying;
  }

  get isTailing(): boolean {
    return this._isTailing;
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
   * Start a deploy for the selected environment
   */
  startDeploy(config: DiscoveredConfig, env: string, deployOptions?: DeployOptions): void {
    if (!config.config) return;

    this._isDeploying = true;
    this.callbacks.onDeployStart();

    this.runningProcess = runWranglerDeploy({
      configPath: config.path,
      environment: env,
      deployOptions,
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

  /**
   * Stop any running deploy
   */
  stopDeploy(): void {
    if (this.runningProcess && this._isDeploying) {
      stopProcess(this.runningProcess);
      this.runningProcess = null;
      this._isDeploying = false;
      this.callbacks.onOutputLine("Deploy cancelled");
      this.callbacks.onRender();
    }
  }

  /**
   * Start tailing logs for a config/environment
   */
  startTail(config: DiscoveredConfig, env: string, options: TailOptions): void {
    if (!config.config) return;

    // Stop any existing tail
    this.stopTail();

    this._isTailing = true;
    this.callbacks.onTailStart();

    this.tailProcess = runWranglerTail({
      configPath: config.path,
      workerName: config.name,
      environment: env,
      tailOptions: options,
      onStdout: (data) => {
        this.pushTailOutputLines(data);
        this.callbacks.onRender();
      },
      onStderr: (data) => {
        this.pushTailOutputLines(data);
        this.callbacks.onRender();
      },
      onExit: (code) => {
        this._isTailing = false;
        this.callbacks.onTailOutputLine(`Tail ended with code ${code}`);
        this.tailProcess = null;
        this.callbacks.onTailEnd(code);
        this.callbacks.onRender();
      },
    });
  }

  /**
   * Stop any running tail
   */
  stopTail(): void {
    if (this.tailProcess) {
      stopProcess(this.tailProcess);
      this.tailProcess = null;
      this._isTailing = false;
      this.callbacks.onTailOutputLine("Tail stopped");
      this.callbacks.onRender();
    }
  }

  /**
   * Stop all running processes
   */
  stopAll(): void {
    this.stopDeploy();
    this.stopDevServer();
    this.stopTail();
  }

  private pushTailOutputLines(data: string): void {
    const lines = data.split('\n').filter((line) => line.trim());
    for (const line of lines) {
      this.callbacks.onTailOutputLine(line);
    }
  }

  private pushOutputLines(data: string): void {
    const lines = data.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      this.callbacks.onOutputLine(line);
    }
  }
}
