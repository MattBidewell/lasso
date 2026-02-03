import { For, Show, createMemo } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, selectHistory, activateSession, setFocusedPanel } from "../../state/store.ts";
import { COLORS } from "../../themes/index.ts";
import type { SessionAction } from "../../types.ts";

const MAX_HISTORY_LINES = 100;

export interface CommandEntry {
  id: string;
  timestamp: number;
  configPath: string;
  environment: string;
  action: SessionAction;
  displayName: string;
  status: "running" | "completed" | "failed";
  command: string;
}

export function TerminalHistoryPanel() {
  const isFocused = () => state.focusedPanel === "history";
  
  // Get all sessions sorted by timestamp (most recent first)
  const history = createMemo(() => {
    return [...state.sessions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, MAX_HISTORY_LINES)
      .map((session) => {
        const command = buildCommand(session.action, session.configPath, session.environment);
        return {
          id: session.id,
          timestamp: session.startedAt,
          configPath: session.configPath,
          environment: session.environment,
          action: session.action,
          displayName: session.displayName,
          status: session.status === "stopping" ? "running" : session.status,
          command,
        };
      });
  });

  const selectedIndex = () => state.selectedHistoryIndex;

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case "running": return "●";
      case "completed": return "✓";
      case "failed": return "✗";
      default: return " ";
    }
  };

  const truncate = (value: string, max = 80): string => {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
  };

  const buildCommand = (action: SessionAction, configPath: string, environment: string): string => {
    const base = `npx wrangler ${action}`;
    const config = `-c ${configPath}`;
    const env = environment !== "default" ? `-e ${environment}` : "";
    return `${base} ${config} ${env}`.trim();
  };

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    const itemCount = history().length;
    
    switch (event.name) {
      case "j":
      case "down":
        selectHistory(Math.min(selectedIndex() + 1, itemCount - 1));
        break;
      case "k":
      case "up":
        selectHistory(Math.max(selectedIndex() - 1, 0));
        break;
      case "g":
        selectHistory(0);
        break;
      case "G":
        selectHistory(itemCount - 1);
        break;
      case "return": {
        const entry = history()[selectedIndex()];
        if (entry) {
          activateSession(entry.id);
          setFocusedPanel("output");
        }
        break;
      }
    }
  });

  return (
    <scrollbox
      title="[6] History"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      height="100%"
      flexGrow={0}
      focused={isFocused()}
    >
      <Show when={history().length === 0}>
        <text fg={COLORS.muted}> No commands run yet</text>
      </Show>
      <For each={history()}>
        {(entry, i) => {
          const selected = createMemo(() => i() === selectedIndex());
          const prefix = createMemo(() => selected() ? "> " : "  ");
          const time = formatTime(entry.timestamp);
          const icon = getStatusIcon(entry.status);
          const summary = createMemo(() =>
            `${prefix()}${icon} [${time}] ${entry.displayName} [${entry.environment}] ${entry.action}`
          );
          const content = createMemo(() => `${prefix()}${icon} [${time}] ${truncate(entry.command)}`);
          const commandLine = createMemo(() => `  ${entry.command}`);

          const color = createMemo(() =>
            selected()
              ? COLORS.selected
              : entry.status === "failed"
                ? COLORS.error
                : entry.status === "completed"
                  ? COLORS.success
                  : entry.status === "running"
                    ? COLORS.accent
                    : COLORS.normal
          );

          return (
            <Show
              when={selected()}
              fallback={
                <text fg={color()}>
                  <span>{content()}</span>
                </text>
              }
            >
              <text fg={color()}>
                <strong>{summary()}</strong>
              </text>
              <text fg={COLORS.muted}>{commandLine()}</text>
            </Show>
          );
        }}
      </For>
    </scrollbox>
  );
}
