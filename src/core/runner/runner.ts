import { spawn, type ChildProcess } from "node:child_process";
import type { DiscoveredConfig, DeployOptions, SessionAction, TailOptions } from "../../types.ts";

export interface RunnerCallbacks {
  onSessionStart: (sessionId: string, action: SessionAction) => void;
  onSessionEnd: (sessionId: string, code: number | null) => void;
  onSessionOutput: (sessionId: string, line: string) => void;
  onRender: () => void;
}

interface SessionProcess {
  id: string;
  process: ChildProcess;
  action: SessionAction;
}

export class Runner {
  private sessions: Map<string, SessionProcess> = new Map();
  private callbacks: RunnerCallbacks;

  constructor(callbacks: RunnerCallbacks) {
    this.callbacks = callbacks;
  }

  startDev(config: DiscoveredConfig, environment: string): void {
    const sessionId = this.createSessionId(config.path, environment, "dev");

    const args = ["wrangler", "dev", "-c", config.path];
    if (environment !== "default") {
      args.push("-e", environment);
    }

    this.spawnSession(sessionId, "dev", args, config.directory);
  }

  startTail(config: DiscoveredConfig, environment: string, options: TailOptions = {}): void {
    const sessionId = this.createSessionId(config.path, environment, "tail");

    const args = ["wrangler", "tail", "-c", config.path];
    if (environment !== "default") {
      args.push("-e", environment);
    }

    // Add tail options
    if (options.format) args.push("--format", options.format);
    if (options.samplingRate) args.push("--sampling-rate", String(options.samplingRate));
    if (options.search) args.push("--search", options.search);

    this.spawnSession(sessionId, "tail", args, config.directory);
  }

  startDeploy(config: DiscoveredConfig, environment: string, options?: DeployOptions): void {
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

    this.spawnSession(sessionId, "deploy", args, config.directory);
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.process.kill("SIGTERM");
      this.sessions.delete(sessionId);
    }
  }

  stopAll(): void {
    for (const session of this.sessions.values()) {
      session.process.kill("SIGTERM");
    }
    this.sessions.clear();
  }

  private createSessionId(configPath: string, environment: string, action: SessionAction): string {
    return `${configPath}:${environment}:${action}`;
  }

  private spawnSession(
    sessionId: string,
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

    this.sessions.set(sessionId, { id: sessionId, process: childProcess, action });

    // Handle output
    childProcess.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.callbacks.onSessionOutput(sessionId, line);
      }
      this.callbacks.onRender();
    });

    childProcess.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.callbacks.onSessionOutput(sessionId, line);
      }
      this.callbacks.onRender();
    });

    // Handle process exit
    childProcess.on("exit", (code: number | null) => {
      this.sessions.delete(sessionId);
      this.callbacks.onSessionEnd(sessionId, code);
      this.callbacks.onRender();
    });

    // Notify start
    this.callbacks.onSessionStart(sessionId, action);
    this.callbacks.onRender();
  }
}
