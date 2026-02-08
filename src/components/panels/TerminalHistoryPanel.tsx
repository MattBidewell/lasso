import { For, Show, createMemo } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, selectHistory, activateExecution, setFocusedPanel } from "../../state/store.ts";
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
    return [...state.executions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, MAX_HISTORY_LINES)
      .map((execution) => {
        return {
          id: execution.id,
          timestamp: execution.startedAt,
          configPath: execution.configPath,
          environment: execution.environment,
          action: execution.action,
          displayName: execution.displayName,
          status: execution.status === "stopping" ? "running" : execution.status,
          command: execution.command,
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
      case "completed": return " ";
      case "failed": return "✗";
      default: return " ";
    }
  };

  const truncate = (value: string, max = 80): string => {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
  };

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    const itemCount = history().length;

    const previewHistory = (index: number) => {
      selectHistory(index);
      const entry = history()[index];
      if (entry) {
        activateExecution(entry.id);
      }
    };
    
    switch (event.name) {
      case "j":
      case "down":
        previewHistory(Math.min(selectedIndex() + 1, itemCount - 1));
        break;
      case "k":
      case "up":
        previewHistory(Math.max(selectedIndex() - 1, 0));
        break;
      case "g":
        if (event.shift) {
          previewHistory(itemCount - 1);
        } else {
          previewHistory(0);
        }
        break;
      case "G":
        previewHistory(itemCount - 1);
        break;
      case "return": {
        const entry = history()[selectedIndex()];
        if (entry) {
          activateExecution(entry.id);
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
      onMouseDown={() => setFocusedPanel("history")}
    >
      <Show when={history().length === 0}>
        <text fg={COLORS.muted}> No commands run yet</text>
      </Show>
      <For each={history()}>
        {(entry, i) => {
          const selected = createMemo(() => i() === selectedIndex());
          const active = createMemo(() => isFocused() && selected());
          const prefix = createMemo(() => active() ? "> " : "  ");
          const time = formatTime(entry.timestamp);
          const icon = getStatusIcon(entry.status);
          const shortId = entry.id.slice(-6);
          const summary = createMemo(() =>
            `${prefix()}${icon} [${time}] ${entry.displayName} [${entry.environment}] ${entry.action} #${shortId}`
          );
          const content = createMemo(() => `${prefix()}${icon} [${time}] ${truncate(entry.command)}`);
          const commandLine = createMemo(() => `  ${entry.command}`);

          const color = createMemo(() =>
            active()
              ? COLORS.selected
              : entry.status === "failed"
                ? COLORS.error
                : entry.status === "running"
                  ? COLORS.accent
                  : COLORS.normal
          );

          return (
            <Show
              when={active()}
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
