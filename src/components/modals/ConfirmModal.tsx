/**
 * Confirm Delete Modal
 *
 * Shows a confirmation dialog before deleting a binding.
 */

import { useKeyboard } from "@opentui/solid"
import { state, closeModal } from "../../state/store.ts"
import { deleteBinding } from "../../state/actions.ts"
import { fieldRegistry } from "../../fields/index.ts"
import { COLORS } from "../../themes/index.ts"

export function ConfirmModal() {
  const modal = () => state.modal
  const isOpen = () => modal()?.type === "confirm_delete"

  const bindingType = () => {
    const m = modal()
    return m?.type === "confirm_delete" ? m.bindingType : null
  }

  const bindingIndex = () => {
    const m = modal()
    return m?.type === "confirm_delete" ? m.bindingIndex : 0
  }

  const displayName = () => {
    const m = modal()
    return m?.type === "confirm_delete" ? m.displayName : ""
  }

  const bindingTypeName = () => {
    const type = bindingType()
    if (!type) return ""
    return fieldRegistry.getDisplayName(type)
  }

  const handleConfirm = () => {
    const type = bindingType()
    if (!type) return
    deleteBinding(type, bindingIndex())
  }

  useKeyboard((event) => {
    if (!isOpen()) return

    switch (event.name) {
      case "y":
      case "Y":
      case "return":
        handleConfirm()
        break
      case "n":
      case "N":
      case "escape":
        closeModal()
        break
    }
  })

  return (
    <box
      position="absolute"
      top="35%"
      left="25%"
      width="50%"
      height="30%"
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.error}
      title="Confirm Delete"
      backgroundColor="black"
    >
      <text> </text>
      <text fg={COLORS.normal}>  Are you sure you want to delete this binding?</text>
      <text> </text>
      <text fg={COLORS.selected}>  Type: {bindingTypeName()}</text>
      <text fg={COLORS.selected}>  Name: {displayName()}</text>
      <text> </text>
      <text fg={COLORS.error}>  This action cannot be undone.</text>
      <text> </text>
      <text fg={COLORS.muted}>  Y/Enter: Delete  N/Esc: Cancel</text>
    </box>
  )
}
