import { spawn } from "node:child_process";
import { Runner, type RunnerCallbacks } from "../core/runner/index.ts";
import type { DeployOptions, TailOptions } from "../types.ts";
import { createSessionId } from "../types.ts";
import {
  state,
  getSelectedConfig,
  getSelectedEnv,
  openModal,
  closeModal,
  setFocusedPanel,
  addSession,
  updateSessionStatus,
  removeSession,
  activateSession,
  appendSessionOutput,
  clearSessionOutput,
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
  onSessionStart: (_sessionId, _action) => {
    // Session is added before calling startDev/startTail/startDeploy
  },
  onSessionEnd: (sessionId, code) => {
    const status = code === 0 ? "completed" : "failed";
    updateSessionStatus(sessionId, status);
  },
  onSessionOutput: (sessionId, line) => {
    appendSessionOutput(sessionId, line);
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

// ============ Navigation Shortcuts ============

export function handleEnter(): void {
  const session = getSelectedSession();
  if (session?.status === "running" && session.action === "dev") {
    stopSession(session.id);
  } else {
    startDevSession();
  }
}

export function handleDeployKey(): void {
  const session = getSelectedSession();
  if (session?.status === "running" && session.action === "deploy") {
    stopSession(session.id);
  } else {
    showDeployModal();
  }
}

export function handleTailKey(): void {
  const session = getSelectedSession();
  if (session?.status === "running" && session.action === "tail") {
    stopSession(session.id);
  } else {
    showTailModal();
  }
}

export function handleEscape(): void {
  if (state.modal) {
    closeModal();
  } else {
    const session = getSelectedSession();
    if (session?.status === "running") {
      stopSession(session.id);
    }
    setFocusedPanel("sessions");
  }
}

// ============ Editor Actions ============

export function openInEditor(): void {
  const config = getSelectedConfig();
  if (!config) return;

  const editor = process.env.EDITOR || process.env.VISUAL || "vi";

  const child = spawn(editor, [config.path], {
    stdio: "inherit",
    detached: true,
  });

  child.unref();
}

// ============ Session Actions ============

export function startDevSession(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  const sessionId = createSessionId(config.path, env, "dev");

  if (getSession(sessionId)) {
    activateSession(sessionId);
    return;
  }

  addSession({
    id: sessionId,
    configPath: config.path,
    environment: env,
    action: "dev",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
  });

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startDev(config, env);
}

export function startTailSession(options: TailOptions = {}): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  closeModal();

  const sessionId = createSessionId(config.path, env, "tail");

  if (getSession(sessionId)) {
    activateSession(sessionId);
    return;
  }

  addSession({
    id: sessionId,
    configPath: config.path,
    environment: env,
    action: "tail",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
  });

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startTail(config, env, options);
}

export function startDeploySession(options?: DeployOptions): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  closeModal();

  const sessionId = createSessionId(config.path, env, "deploy");

  if (getSession(sessionId)) {
    activateSession(sessionId);
    return;
  }

  addSession({
    id: sessionId,
    configPath: config.path,
    environment: env,
    action: "deploy",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
  });

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startDeploy(config, env, options);
}

export function stopSession(sessionId: string): void {
  const session = getSession(sessionId);
  if (session && session.status === "running") {
    updateSessionStatus(sessionId, "stopping");
    getRunner().stop(sessionId);
  }
}

export function stopSelectedSession(): void {
  const session = getSelectedSession();
  if (session) {
    stopSession(session.id);
  }
}

export function removeSessionFromList(sessionId: string): void {
  const session = getSession(sessionId);
  if (session && session.status !== "running" && session.status !== "stopping") {
    removeSession(sessionId);
  }
}

export function removeSelectedSession(): void {
  const session = getSelectedSession();
  if (session) {
    removeSessionFromList(session.id);
  }
}

export function clearSelectedSessionOutput(): void {
  const session = getSelectedSession();
  if (session) {
    clearSessionOutput(session.id);
  }
}
