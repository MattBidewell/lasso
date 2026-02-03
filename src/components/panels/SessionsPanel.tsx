import { For, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import {
  state,
  selectSession,
  activateSession,
  getSelectedSession,
  setFocusedPanel,
} from "../../state/store.ts";
import {
  stopSession,
  removeSessionFromList,
} from "../../state/actions.ts";
import { COLORS } from "../../themes/index.ts";
import type { SessionStatus } from "../../types.ts";

const STATUS_ICONS: Record<SessionStatus, string> = {
  running: "●",
  stopping: "◌",
  completed: "✓",
  failed: "✗",
};

const ACTION_LABELS: Record<string, string> = {
  dev: "dev",
  tail: "tail",
  deploy: "deploy",
};

export function SessionsPanel() {
  const isFocused = () => state.focusedPanel === "sessions";
  const sessions = () => state.sessions;
  const selectedIndex = () => state.selectedSessionIndex;
  const activeId = () => state.activeSessionId;

  // Helper to select and activate a session (updates output window)
  const selectAndActivate = (index: number) => {
    selectSession(index);
    // Get the session at the new index after selection
    const newIndex = Math.max(0, Math.min(index, sessions().length - 1));
    const session = sessions()[newIndex];
    if (session) {
      activateSession(session.id);
    }
  };

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    switch (event.name) {
      case "j":
      case "down":
        selectAndActivate(selectedIndex() + 1);
        break;
      case "k":
      case "up":
        selectAndActivate(selectedIndex() - 1);
        break;
      case "g":
        selectAndActivate(0);
        break;
      case "G":
        selectAndActivate(sessions().length - 1);
        break;
      case "return":
      case "l":
      case "right":
        // Activate selected session (show its output)
        const selected = getSelectedSession();
        if (selected) {
          activateSession(selected.id);
          setFocusedPanel("output");
        }
        break;
      case "x":
        // Stop selected session
        const toStop = getSelectedSession();
        if (toStop && toStop.status === "running") {
          stopSession(toStop.id);
        }
        break;
      case "d":
      case "delete":
      case "backspace":
        // Remove selected session (only if not running)
        const toRemove = getSelectedSession();
        if (toRemove && toRemove.status !== "running" && toRemove.status !== "stopping") {
          removeSessionFromList(toRemove.id);
        }
        break;
      case "h":
      case "left":
      case "b":
        setFocusedPanel("bindings");
        break;
    }
  });

  // Create display items
  const items = createMemo(() =>
    sessions().map((session, i) => {
      const selected = i === selectedIndex();
      const active = session.id === activeId();
      const prefix = selected ? "> " : "  ";
      const icon = STATUS_ICONS[session.status];
      const actionLabel = ACTION_LABELS[session.action];

      // Truncate display name if too long (leave room for env, action, icon)
      const maxNameLen = 10;
      const displayName =
        session.displayName.length > maxNameLen
          ? session.displayName.slice(0, maxNameLen - 1) + "…"
          : session.displayName;

      // Truncate environment if needed
      const maxEnvLen = 6;
      const envDisplay =
        session.environment.length > maxEnvLen
          ? session.environment.slice(0, maxEnvLen - 1) + "…"
          : session.environment;

      return {
        session,
        prefix,
        selected,
        active,
        icon,
        actionLabel,
        displayName,
        envDisplay,
      };
    })
  );

  return (
    <scrollbox
      title="Sessions"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      flexGrow={1}
      focused={isFocused()}
    >
      <Show when={items().length === 0}>
        <text fg={COLORS.muted}> No active sessions</text>
      </Show>
      <For each={items()}>
        {(item) => {
          const content = `${item.prefix}${item.displayName} [${item.envDisplay}] ${item.actionLabel} ${item.icon}`;

          // Determine color based on state
          const color = item.active
            ? COLORS.accent
            : item.selected
              ? COLORS.selected
              : item.session.status === "failed"
                ? COLORS.error
                : item.session.status === "completed"
                  ? COLORS.success
                  : COLORS.normal;

          return (
            <text fg={color}>
              <Show when={item.selected} fallback={<span>{content}</span>}>
                <strong>{content}</strong>
              </Show>
            </text>
          );
        }}
      </For>
    </scrollbox>
  );
}
