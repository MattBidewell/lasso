/**
 * Edit Environment Modal
 *
 * Modal for adding or editing (renaming) environments.
 */

import { Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import {
  state,
  closeModal,
  updateEnvironmentName,
  setEnvironmentEditError,
} from "../../state/store.ts"
import { saveEnvironment } from "../../state/actions.ts"
import { COLORS } from "../../themes/index.ts"

export function EditEnvironmentModal() {
  const modal = () => state.modal
  const isOpen = () => modal()?.type === "environment_edit"

  const mode = () => {
    const m = modal()
    return m?.type === "environment_edit" ? m.mode : "add"
  }

  const existingName = () => {
    const m = modal()
    return m?.type === "environment_edit" ? m.existingName : undefined
  }

  const name = () => {
    const m = modal()
    return m?.type === "environment_edit" ? m.name : ""
  }

  const error = () => {
    const m = modal()
    return m?.type === "environment_edit" ? m.error : undefined
  }

  const title = () => (mode() === "add" ? "Add Environment" : "Edit Environment")

  const validate = (value: string): string | undefined => {
    if (!value) {
      return "Environment name is required"
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
      return "Must start with a letter, only letters/numbers/hyphens/underscores"
    }
    if (value === "default") {
      return "Cannot use 'default' as environment name"
    }
    return undefined
  }

  const handleSave = () => {
    const value = name()
    const validationError = validate(value)

    if (validationError) {
      setEnvironmentEditError(validationError)
      return
    }

    saveEnvironment(value, existingName())
  }

  useKeyboard((event) => {
    if (!isOpen()) return

    switch (event.name) {
      case "escape":
        closeModal()
        break
      case "return":
        handleSave()
        break
      case "backspace": {
        const current = name()
        updateEnvironmentName(current.slice(0, -1))
        break
      }
      default:
        // Handle printable characters (single character event names)
        if (event.name.length === 1) {
          const current = name()
          updateEnvironmentName(current + event.name)
        }
        break
    }
  })

  return (
    <box
      position="absolute"
      top="30%"
      left="20%"
      width="60%"
      height="40%"
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.activeBorder}
      title={title()}
      backgroundColor="black"
    >
      <text> </text>
      <text fg={COLORS.normal}>
        {"  "}Environment name defines a deployment target (e.g., staging, production)
      </text>
      <text> </text>
      <text fg={COLORS.selected}>
        {"  "}Name: {name()}_
      </text>
      <text> </text>
      <Show when={error()}>
        <text fg={COLORS.error}>{"  "}{error()}</text>
        <text> </text>
      </Show>
      <Show when={mode() === "edit"}>
        <text fg={COLORS.muted}>{"  "}Original: {existingName()}</text>
        <text> </text>
      </Show>
      <text fg={COLORS.muted}>{"  "}Enter: Save  Esc: Cancel</text>
    </box>
  )
}
