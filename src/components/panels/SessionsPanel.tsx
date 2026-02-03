import { For, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import {
  state,
  selectSession,
  activateSession,
  getSelectedSession,
  getSelectedConfig,
  getSelectedEnv,
  getSession,
  setFocusedPanel,
} from "../../state/store.ts";
import {
  startDevSession,
  startTailSession,
  startDeploySession,
  stopSession,
  removeSessionFromList,
} from "../../state/actions.ts";
import { COLORS } from "../../themes/index.ts";
import type { SessionAction, SessionStatus } from "../../types.ts";
import { createSessionId } from "../../types.ts";

const STATUS_ICONS: Record<SessionStatus, string> = {
  running: "●",
  stopping: "◌",
  completed: "✓",
  failed: "✗",
};

interface SessionItem {
  id: string;
  type: "action" | "session";
  action: SessionAction;
  displayName: string;
  envDisplay: string;
  status?: SessionStatus;
  isActive?: boolean;
}

export function SessionsPanel() {
  const isFocused = () => state.focusedPanel === "sessions";
  const selectedIndex = () => state.selectedSessionIndex;
  const activeId = () => state.activeSessionId;

  // Get all items (actions + sessions) for current config+env
  const items = createMemo((): SessionItem[] => {
    const config = getSelectedConfig();
    const env = getSelectedEnv();

    if (!config || !env) {
      return [];
    }

    const result: SessionItem[] = [];
    const actions: SessionAction[] = ["dev", "deploy", "tail"];

    for (const action of actions) {
      const sessionId = createSessionId(config.path, env, action);
      const session = getSession(sessionId);

      if (session) {
        // Session exists - show it with status
        result.push({
          id: sessionId,
          type: "session",
          action,
          displayName: config.name,
          envDisplay: env,
          status: session.status,
          isActive: sessionId === activeId(),
        });
      } else {
        // No session - show as available action (no icon)
        result.push({
          id: sessionId,
          type: "action",
          action,
          displayName: config.name,
          envDisplay: env,
        });
      }
    }

    return result;
  });

  const handleEnter = () => {
    const item = items()[selectedIndex()];
    if (!item) return;

    if (item.type === "action") {
      // Start the action
      switch (item.action) {
        case "dev":
          startDevSession();
          break;
        case "deploy":
          startDeploySession();
          break;
        case "tail":
          startTailSession();
          break;
      }
    } else if (item.type === "session") {
      // Activate existing session and go to output
      activateSession(item.id);
      setFocusedPanel("output");
    }
  };

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    const itemCount = items().length;

    switch (event.name) {
      case "j":
      case "down":
        selectSession(Math.min(selectedIndex() + 1, itemCount - 1));
        break;
      case "k":
      case "up":
        selectSession(Math.max(selectedIndex() - 1, 0));
        break;
      case "g":
        selectSession(0);
        break;
      case "G":
        selectSession(itemCount - 1);
        break;
      case "return":
        handleEnter();
        break;
      case "x": {
        // Stop selected session (only if it's a running session)
        const item = items()[selectedIndex()];
        if (item?.type === "session" && item.status === "running") {
          stopSession(item.id);
        }
        break;
      }
      case "d":
      case "delete":
      case "backspace": {
        // Remove selected session (only if not running)
        const item = items()[selectedIndex()];
        if (item?.type === "session" && item.status !== "running" && item.status !== "stopping") {
          removeSessionFromList(item.id);
        }
        break;
      }
    }
  });

  return (
    <scrollbox
      title="[4] Sessions"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      flexGrow={1}
      focused={isFocused()}
    >
      <Show when={items().length === 0}>
        <text fg={COLORS.muted}> Select a config and environment first</text>
      </Show>
      <For each={items()}>
        {(item, i) => {
          const selected = i() === selectedIndex();
          const prefix = selected ? "> " : "  ";

          // Format: [icon] name [env] action
          // Actions have no icon, sessions have status icon
          const icon = item.type === "session" && item.status ? STATUS_ICONS[item.status] : " ";
          const content = `${prefix}${icon} ${item.displayName} [${item.envDisplay}] ${item.action}`;

          // Determine color
          const color = item.isActive
            ? COLORS.accent
            : selected
              ? COLORS.selected
              : item.type === "session" && item.status === "failed"
                ? COLORS.error
                : item.type === "session" && item.status === "completed"
                  ? COLORS.success
                  : COLORS.normal;

          return (
            <text fg={color}>
              <Show when={selected} fallback={<span>{content}</span>}>
                <strong>{content}</strong>
              </Show>
            </text>
          );
        }}
      </For>
    </scrollbox>
  );
}
