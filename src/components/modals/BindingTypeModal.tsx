/**
 * Binding Type Selection Modal
 *
 * Displays a list of all available binding types for the user to select when
 * adding a new binding.
 */

import { For, createMemo } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { state, setBindingTypeSelectIndex, openAddBinding, closeModal } from "../../state/store.ts"
import { fieldRegistry } from "../../fields/index.ts"
import { COLORS } from "../../themes/index.ts"

export function BindingTypeModal() {
  const modal = () => state.modal
  const isOpen = () => modal()?.type === "binding_type_select"

  const bindingTypes = createMemo(() => fieldRegistry.getAllBindingTypes())
  const selectedIndex = () => {
    const m = modal()
    return m?.type === "binding_type_select" ? m.selectedIndex : 0
  }

  useKeyboard((event) => {
    if (!isOpen()) return

    const types = bindingTypes()
    const currentIndex = selectedIndex()

    switch (event.name) {
      case "escape":
        closeModal()
        break
      case "j":
      case "down":
        setBindingTypeSelectIndex(Math.min(currentIndex + 1, types.length - 1))
        break
      case "k":
      case "up":
        setBindingTypeSelectIndex(Math.max(currentIndex - 1, 0))
        break
      case "g":
        if (event.shift) {
          setBindingTypeSelectIndex(types.length - 1)
        } else {
          setBindingTypeSelectIndex(0)
        }
        break
      case "G":
        setBindingTypeSelectIndex(types.length - 1)
        break
      case "return":
        const selected = types[currentIndex]
        if (selected) {
          openAddBinding(selected.type)
        }
        break
    }
  })

  return (
    <box
      position="absolute"
      top="15%"
      left="25%"
      width="50%"
      height="70%"
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.activeBorder}
      title="Select Binding Type"
      backgroundColor="black"
    >
      <text> </text>
      <scrollbox flexGrow={1}>
        <For each={bindingTypes()}>
          {(definition, i) => {
            const isSelected = () => i() === selectedIndex()
            const prefix = () => (isSelected() ? "> " : "  ")
            const color = () => (isSelected() ? COLORS.selected : COLORS.normal)

            return (
              <text fg={color()}>
                {isSelected() ? (
                  <strong>
                    {prefix()}
                    {definition.displayName}
                  </strong>
                ) : (
                  <span>
                    {prefix()}
                    {definition.displayName}
                  </span>
                )}
              </text>
            )
          }}
        </For>
      </scrollbox>
      <text fg={COLORS.muted}>  j/k:navigate Enter:select Esc:cancel</text>
    </box>
  )
}
