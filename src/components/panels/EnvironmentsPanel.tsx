import { For, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, selectEnv, getSelectedConfig, hasActiveSession, setFocusedPanel } from "../../state/store.ts";
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

    const isTop = event.name === "g" && !event.shift;
    const isBottom = (event.name === "G") || (event.name === "g" && event.shift);

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
        if (event.shift) {
          selectEnv(environments().length - 1);
        } else {
          selectEnv(0);
        }
        break;
      case "G":
        selectEnv(environments().length - 1);
        break;
    }
  });

  // Create display items
  const items = createMemo(() =>
    environments().map((env, i) => {
      const selected = i === selectedEnvIndex();
      const active = isFocused() && selected;
      const prefix = active ? "> " : "  ";

      // Check if this env has an active session
      const config = getSelectedConfig();
      const isActive = config ? hasActiveSession(config.path, env, "dev") || hasActiveSession(config.path, env, "tail") : false;

      return {
        name: env,
        prefix,
        selected,
        active,
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
      onMouseDown={() => setFocusedPanel("environments")}
    >
      <Show when={items().length === 0}>
        <text fg={COLORS.muted}>  No environments</text>
      </Show>
      <For each={items()}>
        {(item) => (
          <text fg={item.active ? COLORS.selected : COLORS.normal}>
            <Show when={item.active} fallback={<span>{item.prefix}{item.name}{item.isActive ? " ●" : ""}</span>}>
              <strong>{item.prefix}{item.name}{item.isActive ? " ●" : ""}</strong>
            </Show>
          </text>
        )}
      </For>
    </scrollbox>
  );
}
