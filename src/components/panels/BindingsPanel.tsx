import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { COLORS } from "../../themes/index.ts";
import {
  state,
  setFocusedPanel,
  getBindingEntries,
  selectBinding,
  openBindingTypeSelect,
  openEditBinding,
  openDeleteBinding,
} from "../../state/store.ts";

export function BindingsPanel() {
  const isFocused = () => state.focusedPanel === "bindings";

  const entries = createMemo(() => getBindingEntries());
  const [renderOn, setRenderOn] = createSignal(true);
  const selectedIndex = () => state.selectedBindingIndex;

  createEffect(() => {
    const count = entries().length;
    state.selectedConfigIndex;
    state.selectedEnvIndex;
    if (count === 0) {
      selectBinding(0);
      return;
    }
    if (selectedIndex() >= count) {
      selectBinding(count - 1);
    }
  });

  createEffect(() => {
    entries().length;
    state.selectedConfigIndex;
    state.selectedEnvIndex;
    setRenderOn(false);
    queueMicrotask(() => setRenderOn(true));
  });

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    switch (event.name) {
      case "j":
      case "down":
        selectBinding(selectedIndex() + 1);
        break;
      case "k":
      case "up":
        selectBinding(selectedIndex() - 1);
        break;
      case "g":
        if (event.shift) {
          selectBinding(entries().length - 1);
        } else {
          selectBinding(0);
        }
        break;
      case "G":
        selectBinding(entries().length - 1);
        break;
      case "a":
      case "A":
        // Open binding type selection modal to add a new binding
        openBindingTypeSelect();
        break;
      case "e":
      case "E":
      case "return":
        // Open edit binding modal for selected binding
        {
          const entry = entries()[selectedIndex()];
          if (entry) {
            openEditBinding(
              entry.fieldBindingType,
              entry.typeIndex,
              entry.raw as Record<string, unknown>
            );
          }
        }
        break;
      case "d":
      case "D":
        // Open delete confirmation modal for selected binding
        {
          const entry = entries()[selectedIndex()];
          if (entry) {
            openDeleteBinding(
              entry.fieldBindingType,
              entry.typeIndex,
              entry.normalized.displayName ?? entry.normalized.name
            );
          }
        }
        break;
    }
  });

  return (
    <scrollbox
      title="[3] Bindings"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      flexGrow={1}
      focused={isFocused()}
      onMouseDown={() => setFocusedPanel("bindings")}
    >
      <Show when={renderOn()}>
          <Show
            when={entries().length > 0}
            fallback={<text fg={COLORS.muted}> No bindings</text>}
          >
            <For each={entries()}>
              {(entry, i) => {
                const selected = createMemo(() => i() === selectedIndex());
                const active = createMemo(() => isFocused() && selected());
                const prefix = createMemo(() => (active() ? "> " : "  "));
                const label = entry.normalized.displayName ?? entry.normalized.name;
                const content = createMemo(
                  () =>
                    `${prefix()}${label} (${entry.normalized.type.toUpperCase()})`,
                );

                return (
                  <text fg={active() ? COLORS.selected : COLORS.normal}>
                    <Show when={active()} fallback={<span>{content()}</span>}>
                      <strong>{content()}</strong>
                    </Show>
                  </text>
                );
              }}
            </For>
          </Show>
      </Show>
    </scrollbox>
  );
}
