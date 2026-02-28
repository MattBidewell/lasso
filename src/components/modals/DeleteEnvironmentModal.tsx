/**
 * Delete Environment Modal
 *
 * Shows a confirmation dialog before deleting an environment.
 */

import { useKeyboard } from "@opentui/solid"
import { state, closeModal } from "../../state/store.ts"
import { deleteEnvironment } from "../../state/actions.ts"
import { COLORS } from "../../themes/index.ts"

export function DeleteEnvironmentModal() {
  const modal = () => state.modal
  const isOpen = () => modal()?.type === "environment_delete"

  const environmentName = () => {
    const m = modal()
    return m?.type === "environment_delete" ? m.environmentName : ""
  }

  const handleConfirm = () => {
    const name = environmentName()
    if (!name) return
    deleteEnvironment(name)
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
      title="Delete Environment"
      backgroundColor="black"
    >
      <text> </text>
      <text fg={COLORS.normal}>  Are you sure you want to delete this environment?</text>
      <text> </text>
      <text fg={COLORS.selected}>  Environment: {environmentName()}</text>
      <text> </text>
      <text fg={COLORS.error}>  This will remove all environment-specific configuration.</text>
      <text fg={COLORS.error}>  This action cannot be undone.</text>
      <text> </text>
      <text fg={COLORS.muted}>  Y/Enter: Delete  N/Esc: Cancel</text>
    </box>
  )
}
