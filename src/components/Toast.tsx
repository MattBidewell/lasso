import { Show } from "solid-js";
import { state } from "../state/store.ts";
import { COLORS } from "../themes/index.ts";

export function Toast() {
  return (
    <Show when={state.toastMessage}>
      <box
        position="absolute"
        right="2%"
        bottom="2%"
        width={34}
        height={3}
        border={true}
        borderStyle="rounded"
        borderColor={COLORS.activeBorder}
        backgroundColor="black"
      >
        <text fg={COLORS.normal}>  {state.toastMessage}</text>
      </box>
    </Show>
  );
}
