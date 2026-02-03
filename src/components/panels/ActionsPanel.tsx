import { For, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import {
  state,
  selectAction,
  activateSession,
  getSelectedConfig,
  getSelectedEnv,
  getSession,
  setFocusedPanel,
} from "../../state/store.ts";
import {
  startDevSession,
  showDeployModal,
  showTailModal,
  stopSession,
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

const ACTION_NAMES: Record<SessionAction, string> = {
  dev: "dev",
  deploy: "deploy",
  tail: "tail",
};

// Always 3 actions in order
const ALL_ACTIONS: SessionAction[] = ["dev", "deploy", "tail"];

interface ActionItem {
  action: SessionAction;
  status?: SessionStatus;
  isRunning: boolean;
}

export function ActionsPanel() {
  const isFocused = () => state.focusedPanel === "actions";
  const selectedIndex = () => state.selectedActionIndex;

  // Get current config and env
  const config = createMemo(() => getSelectedConfig());
  const env = createMemo(() => getSelectedEnv());

  // Get action items with their status
  const items = createMemo((): ActionItem[] => {
    const currentConfig = config();
    const currentEnv = env();

    if (!currentConfig || !currentEnv) {
      return [];
    }

    return ALL_ACTIONS.map((action) => {
      const sessionId = createSessionId(currentConfig.path, currentEnv, action);
      const session = getSession(sessionId);

      return {
        action,
        status: session?.status,
        isRunning: session?.status === "running",
      };
    });
  });

  // Preview session output when selection changes
  const previewAction = (index: number) => {
    selectAction(index);

    const currentConfig = config();
    const currentEnv = env();
    if (!currentConfig || !currentEnv) return;

    const action = ALL_ACTIONS[index];
    if (!action) return;

    const sessionId = createSessionId(currentConfig.path, currentEnv, action);
    const session = getSession(sessionId);

    // Activate session to show its output in the output panel
    if (session) {
      activateSession(sessionId);
    }
  };

  const handleEnter = () => {
    const currentConfig = config();
    const currentEnv = env();
    if (!currentConfig || !currentEnv) return;

    const item = items()[selectedIndex()];
    if (!item) return;

    // If already running, just go to output
    if (item.isRunning) {
      const sessionId = createSessionId(currentConfig.path, currentEnv, item.action);
      activateSession(sessionId);
      setFocusedPanel("output");
      return;
    }

    // Start the action
    switch (item.action) {
      case "dev":
        startDevSession();
        break;
      case "deploy":
        showDeployModal();
        break;
      case "tail":
        showTailModal();
        break;
    }
  };

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    const itemCount = items().length;

    switch (event.name) {
      case "j":
      case "down":
        previewAction(Math.min(selectedIndex() + 1, itemCount - 1));
        break;
      case "k":
      case "up":
        previewAction(Math.max(selectedIndex() - 1, 0));
        break;
      case "g":
        previewAction(0);
        break;
      case "G":
        previewAction(itemCount - 1);
        break;
      case "return":
        handleEnter();
        break;
      case "x": {
        // Stop selected action if running
        const item = items()[selectedIndex()];
        const currentConfig = config();
        const currentEnv = env();
        if (item?.isRunning && currentConfig && currentEnv) {
          const sessionId = createSessionId(currentConfig.path, currentEnv, item.action);
          stopSession(sessionId);
        }
        break;
      }
    }
  });

  return (
    <scrollbox
      title="[4] Actions"
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
          // Create a reactive signal for whether this item is selected
          const isSelected = createMemo(() => i() === selectedIndex());
          const prefix = createMemo(() => isSelected() ? "> " : "  ");

          // Show icon only if running, otherwise space
          const icon = item.status ? STATUS_ICONS[item.status] : " ";
          const content = createMemo(() => `${prefix()}${icon} ${ACTION_NAMES[item.action]}`);

          // Color based on status - must be reactive
          const color = createMemo(() =>
            isSelected()
              ? COLORS.selected
              : item.status === "failed"
                ? COLORS.error
                : item.status === "completed"
                  ? COLORS.success
                  : item.status === "running"
                    ? COLORS.accent
                    : COLORS.normal
          );

          return (
            <text fg={color()}>
              <Show when={isSelected()} fallback={<span>{content()}</span>}>
                <strong>{content()}</strong>
              </Show>
            </text>
          );
        }}
      </For>
    </scrollbox>
  );
}
