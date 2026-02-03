import { spawn, type ChildProcess } from "node:child_process";
import type { DiscoveredConfig, DeployOptions, SessionAction, TailOptions } from "../../types.ts";

export interface RunnerCallbacks {
  onSessionStart: (sessionId: string, executionId: string, action: SessionAction) => void;
  onSessionEnd: (sessionId: string, executionId: string, code: number | null) => void;
  onSessionOutput: (sessionId: string, executionId: string, line: string) => void;
  onRender: () => void;
}

interface SessionProcess {
  id: string;
  process: ChildProcess;
  action: SessionAction;
  executionId: string;
}

export class Runner {
  private sessions: Map<string, SessionProcess> = new Map();
  private callbacks: RunnerCallbacks;

  constructor(callbacks: RunnerCallbacks) {
    this.callbacks = callbacks;
  }

  startDev(config: DiscoveredConfig, environment: string, executionId: string): void {
    const sessionId = this.createSessionId(config.path, environment, "dev");

    const args = ["wrangler", "dev", "-c", config.path];
    if (environment !== "default") {
      args.push("-e", environment);
    }

    this.spawnSession(sessionId, executionId, "dev", args, config.directory);
  }

  startTail(
    config: DiscoveredConfig,
    environment: string,
    executionId: string,
    options: TailOptions = {}
  ): void {
    const sessionId = this.createSessionId(config.path, environment, "tail");

    const args = ["wrangler", "tail", "-c", config.path];
    if (environment !== "default") {
      args.push("-e", environment);
    }

    // Add tail options
    if (options.format) args.push("--format", options.format);
    if (options.samplingRate) args.push("--sampling-rate", String(options.samplingRate));
    if (options.search) args.push("--search", options.search);

    this.spawnSession(sessionId, executionId, "tail", args, config.directory);
  }

  startDeploy(
    config: DiscoveredConfig,
    environment: string,
    executionId: string,
    options?: DeployOptions
  ): void {
    const sessionId = this.createSessionId(config.path, environment, "deploy");

    const args = ["wrangler", "deploy", "-c", config.path];
    if (environment !== "default") {
      args.push("-e", environment);
    }

    // Add deploy options
    if (options?.dryRun) args.push("--dry-run");
    if (options?.minify) args.push("--minify");
    if (options?.keepVars) args.push("--keep-vars");
    if (options?.noBundle) args.push("--no-bundle");
    if (options?.uploadSourceMaps) args.push("--upload-source-maps");

    this.spawnSession(sessionId, executionId, "deploy", args, config.directory);
  }

  stop(sessionId: string, signal: NodeJS.Signals = "SIGTERM"): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.process.kill(signal);
      this.sessions.delete(sessionId);
    }
  }

  stopAll(signal: NodeJS.Signals = "SIGTERM"): void {
    for (const session of this.sessions.values()) {
      session.process.kill(signal);
    }
    this.sessions.clear();
  }

  private createSessionId(configPath: string, environment: string, action: SessionAction): string {
    return `${configPath}:${environment}:${action}`;
  }

  private spawnSession(
    sessionId: string,
    executionId: string,
    action: SessionAction,
    args: string[],
    cwd: string
  ): void {
    // Stop existing session with same ID if any
    this.stop(sessionId);

    const childProcess = spawn("npx", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    this.sessions.set(sessionId, { id: sessionId, process: childProcess, action, executionId });

    // Handle output
    childProcess.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.callbacks.onSessionOutput(sessionId, executionId, line);
      }
      this.callbacks.onRender();
    });

    childProcess.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.callbacks.onSessionOutput(sessionId, executionId, line);
      }
      this.callbacks.onRender();
    });

    // Handle process exit
    childProcess.on("exit", (code: number | null) => {
      this.sessions.delete(sessionId);
      this.callbacks.onSessionEnd(sessionId, executionId, code);
      this.callbacks.onRender();
    });

    // Notify start
    this.callbacks.onSessionStart(sessionId, executionId, action);
    this.callbacks.onRender();
  }
}
