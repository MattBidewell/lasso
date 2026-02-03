import { For, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, selectEnv, getSelectedConfig, hasActiveSession } from "../../state/store.ts";
import { COLORS } from "../../themes/index.ts";

export function EnvironmentsPanel() {
  const isFocused = () => state.focusedPanel === "environments";
  const selectedEnvIndex = () => state.selectedEnvIndex;

  const environments = createMemo(() => {
    const config = getSelectedConfig();
    return config?.environments ?? [];
  });

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    const PAGE_SIZE = 5;
    switch (event.name) {
      case "j":
      case "down":
        selectEnv(selectedEnvIndex() + 1);
        break;
      case "k":
      case "up":
        selectEnv(selectedEnvIndex() - 1);
        break;
      case "g":
        selectEnv(0);
        break;
      case "G":
        selectEnv(environments().length - 1);
        break;
      case "ctrl-d":
        selectEnv(selectedEnvIndex() + PAGE_SIZE);
        break;
      case "ctrl-u":
        selectEnv(selectedEnvIndex() - PAGE_SIZE);
        break;
    }
  });

  // Create display items
  const items = createMemo(() =>
    environments().map((env, i) => {
      const selected = i === selectedEnvIndex();
      const prefix = selected ? "> " : "  ";

      // Check if this env has an active session
      const config = getSelectedConfig();
      const isActive = config ? hasActiveSession(config.path, env, "dev") || hasActiveSession(config.path, env, "tail") : false;

      return {
        name: env,
        prefix,
        selected,
        isActive,
      };
    })
  );

  return (
    <scrollbox
      title="[2] Environments"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      flexGrow={1}
      focused={isFocused()}
    >
      <Show when={items().length === 0}>
        <text fg={COLORS.muted}>  No environments</text>
      </Show>
      <For each={items()}>
        {(item) => (
          <text fg={item.selected ? COLORS.selected : COLORS.normal}>
            <Show when={item.selected} fallback={<span>{item.prefix}{item.name}{item.isActive ? " ●" : ""}</span>}>
              <strong>{item.prefix}{item.name}{item.isActive ? " ●" : ""}</strong>
            </Show>
          </text>
        )}
      </For>
    </scrollbox>
  );
}
