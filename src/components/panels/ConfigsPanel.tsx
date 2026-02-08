import { For, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, selectConfig, getFilteredConfigs, setFocusedPanel } from "../../state/store.ts";
import { COLORS } from "../../themes/index.ts";

export function ConfigsPanel() {
  const isFocused = () => state.focusedPanel === "configs";
  const configs = createMemo(() => getFilteredConfigs());
  const selectedIndex = () => state.selectedConfigIndex;

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    const isTop = event.name === "g" && !event.shift;
    const isBottom = (event.name === "G") || (event.name === "g" && event.shift);

    switch (event.name) {
      case "j":
      case "down":
        selectConfig(selectedIndex() + 1);
        break;
      case "k":
      case "up":
        selectConfig(selectedIndex() - 1);
        break;
      case "g":
        if (event.shift) {
          selectConfig(configs().length - 1);
        } else {
          selectConfig(0);
        }
        break;
      case "G":
        selectConfig(configs().length - 1);
        break;
    }
  });

  // Create display items
  const items = createMemo(() =>
    configs().map((config, i) => {
      const selected = i === selectedIndex();
      const active = isFocused() && selected;
      const prefix = active ? "> " : "  ";

      return {
        name: config.name,
        prefix,
        selected,
        active,
        hasError: !!config.error,
      };
    })
  );

  return (
    <scrollbox
      title="[1] Configs"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      flexGrow={1}
      focused={isFocused()}
      onMouseDown={() => setFocusedPanel("configs")}
    >
      <Show when={items().length === 0}>
        <text fg={COLORS.muted}>  No configs found</text>
      </Show>
      <For each={items()}>
        {(item) => (
          <text fg={item.hasError ? COLORS.error : item.active ? COLORS.selected : COLORS.normal}>
            <Show when={item.active} fallback={<span>{item.prefix}{item.name}</span>}>
              <strong>{item.prefix}{item.name}</strong>
            </Show>
          </text>
        )}
      </For>
    </scrollbox>
  );
}
