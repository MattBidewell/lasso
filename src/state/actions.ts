import { Runner, type RunnerCallbacks } from "../core/runner/index.ts";
import { parseAnsiLine } from "../core/ansi.ts";
import type { DeployOptions, TailOptions, SessionAction } from "../types.ts";
import { createSessionId } from "../types.ts";
import {
  state,
  getSelectedConfig,
  getSelectedEnv,
  openModal,
  closeModal,
  setFocusedPanel,
  addExecution,
  updateExecutionStatus,
  activateSession,
  appendExecutionOutput,
  clearExecutionOutput,
  getSession,
  getSelectedSession,
} from "./store.ts";

// Re-export closeModal for use by modals
export { closeModal } from "./store.ts";

// Renderer reference for triggering re-renders (set during app init)
let triggerRender: (() => void) | null = null;

// Renderer reference for cleanup on exit
let rendererInstance: { destroy: () => void } | null = null;

export function setRenderer(renderer: { destroy: () => void }): void {
  rendererInstance = renderer;
}

export function exitApp(): void {
  runner?.stopAll();
  rendererInstance?.destroy();
  process.exit(0);
}

export function setRenderCallback(callback: () => void): void {
  triggerRender = callback;
}

// ============ Runner Setup ============

const runnerCallbacks: RunnerCallbacks = {
  onSessionStart: (_sessionId, _executionId, _action) => {
    // Execution is added before calling startDev/startTail/startDeploy
  },
  onSessionEnd: (_sessionId, executionId, code) => {
    const status = code === 0 ? "completed" : "failed";
    updateExecutionStatus(executionId, status, Date.now());
  },
  onSessionOutput: (_sessionId, executionId, line) => {
    appendExecutionOutput(executionId, parseAnsiLine(line, state.ansiEnabled));
  },
  onRender: () => {
    triggerRender?.();
  },
};

let runner: Runner | null = null;

export function getRunner(): Runner {
  if (!runner) {
    runner = new Runner(runnerCallbacks);
  }
  return runner;
}

// ============ Modal Actions ============

export function showDeployModal(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config) return;

  openModal({
    type: "deploy",
    configName: config.name,
    environment: env,
  });
}

export function showTailModal(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config) return;

  openModal({
    type: "tail",
    configName: config.name,
    environment: env,
  });
}

export function showHelpModal(): void {
  openModal({ type: "help" });
}

// ============ Session Actions ============

export function startDevSession(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  const sessionId = createSessionId(config.path, env, "dev");
  const existing = getSession(sessionId);
  if (existing && (existing.status === "running" || existing.status === "stopping")) {
    activateSession(sessionId);
    return;
  }

  const executionId = createExecutionId(sessionId);
  addExecution({
    id: executionId,
    sessionId,
    configPath: config.path,
    environment: env,
    action: "dev",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
    command: buildCommand("dev", config.path, env),
  });

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startDev(config, env, executionId);
}

export function startTailSession(options: TailOptions = {}): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  closeModal();

  const sessionId = createSessionId(config.path, env, "tail");
  const existing = getSession(sessionId);
  if (existing && (existing.status === "running" || existing.status === "stopping")) {
    activateSession(sessionId);
    return;
  }

  const executionId = createExecutionId(sessionId);
  addExecution({
    id: executionId,
    sessionId,
    configPath: config.path,
    environment: env,
    action: "tail",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
    command: buildCommand("tail", config.path, env),
  });

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startTail(config, env, executionId, options);
}

export function startDeploySession(options?: DeployOptions): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  closeModal();

  const sessionId = createSessionId(config.path, env, "deploy");
  const existing = getSession(sessionId);
  if (existing && (existing.status === "running" || existing.status === "stopping")) {
    activateSession(sessionId);
    return;
  }

  const executionId = createExecutionId(sessionId);
  addExecution({
    id: executionId,
    sessionId,
    configPath: config.path,
    environment: env,
    action: "deploy",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
    command: buildCommand("deploy", config.path, env),
  });

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startDeploy(config, env, executionId, options);
}

export function stopSession(sessionId: string): void {
  const session = getSession(sessionId);
  if (session && session.status === "running") {
    updateExecutionStatus(session.executionId, "stopping");
    appendExecutionOutput(
      session.executionId,
      parseAnsiLine("[lasso] Sent SIGINT to stop execution.", state.ansiEnabled)
    );
    getRunner().stop(sessionId, "SIGINT");
  }
}

export function stopSelectedSession(): void {
  const session = getSelectedSession();
  if (session) {
    stopSession(session.id);
  }
}

export function clearSelectedSessionOutput(): void {
  const session = getSelectedSession();
  if (session) {
    clearExecutionOutput(session.executionId);
  }
}

let executionCounter = 0;

function createExecutionId(_sessionId: string): string {
  executionCounter += 1;
  const stamp = Date.now().toString(36);
  const counter = executionCounter.toString(36);
  return `${stamp}${counter}`;
}

function buildCommand(action: SessionAction, configPath: string, environment: string): string {
  const base = `npx wrangler ${action}`;
  const config = `-c ${configPath}`;
  const env = environment !== "default" ? `-e ${environment}` : "";
  return `${base} ${config} ${env}`.trim();
}
