/**
 * Edit Binding Modal
 *
 * Modal for adding or editing a binding. Renders fields dynamically based on
 * the binding type definition.
 */

import { For, Show, createMemo } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import {
  state,
  closeModal,
  updateBindingEditField,
  updateBindingEditError,
  setBindingEditErrors,
  setBindingEditActiveField,
} from "../../state/store.ts"
import { saveBinding } from "../../state/actions.ts"
import { fieldRegistry } from "../../fields/index.ts"
import type { FieldDefinition } from "../../fields/types.ts"
import { COLORS } from "../../themes/index.ts"

export function EditBindingModal() {
  const modal = () => state.modal
  const isOpen = () => modal()?.type === "binding_edit"

  const bindingType = () => {
    const m = modal()
    return m?.type === "binding_edit" ? m.bindingType : null
  }

  const definition = createMemo(() => {
    const type = bindingType()
    return type ? fieldRegistry.getBindingType(type) : undefined
  })

  const fields = createMemo(() => {
    const def = definition()
    if (!def) return []

    // Filter fields based on showWhen predicate
    const m = modal()
    if (m?.type !== "binding_edit") return def.fields

    return def.fields.filter((field) => {
      if (!field.showWhen) return true
      return field.showWhen(m.values)
    })
  })

  const activeFieldIndex = () => {
    const m = modal()
    return m?.type === "binding_edit" ? m.activeFieldIndex : 0
  }

  const values = () => {
    const m = modal()
    return m?.type === "binding_edit" ? m.values : {}
  }

  const errors = () => {
    const m = modal()
    return m?.type === "binding_edit" ? m.errors : {}
  }

  const mode = () => {
    const m = modal()
    return m?.type === "binding_edit" ? m.mode : "add"
  }

  const bindingIndex = () => {
    const m = modal()
    return m?.type === "binding_edit" ? m.bindingIndex : undefined
  }

  const title = () => {
    const def = definition()
    const m = mode()
    if (!def) return "Edit Binding"
    return m === "add" ? `Add ${def.displayName}` : `Edit ${def.displayName}`
  }

  const validateField = (field: FieldDefinition): string | undefined => {
    const value = values()[field.name]
    const result = field.validation.safeParse(value)
    if (!result.success) {
      return result.error.issues[0]?.message
    }
    return undefined
  }

  const validateAll = (): boolean => {
    const allErrors: Record<string, string> = {}
    let hasErrors = false

    for (const field of fields()) {
      const error = validateField(field)
      if (error) {
        allErrors[field.name] = error
        hasErrors = true
      }
    }

    setBindingEditErrors(allErrors)
    return !hasErrors
  }

  const handleSave = () => {
    if (!validateAll()) return

    const type = bindingType()
    if (!type) return

    // Clean up values - remove empty optional fields
    const cleanValues: Record<string, unknown> = {}
    for (const field of fields()) {
      const value = values()[field.name]
      if (value !== undefined && value !== "") {
        cleanValues[field.name] = value
      } else if (field.required) {
        cleanValues[field.name] = value
      }
    }

    saveBinding(type, cleanValues, bindingIndex())
  }

  useKeyboard((event) => {
    if (!isOpen()) return

    const currentFields = fields()
    const currentIndex = activeFieldIndex()
    const currentField = currentFields[currentIndex]

    switch (event.name) {
      case "escape":
        closeModal()
        break
      case "tab":
        if (event.shift) {
          // Previous field
          const newIndex = Math.max(0, currentIndex - 1)
          setBindingEditActiveField(newIndex)
        } else {
          // Next field
          const newIndex = Math.min(currentFields.length - 1, currentIndex + 1)
          setBindingEditActiveField(newIndex)
        }
        // Validate current field on blur
        if (currentField) {
          const error = validateField(currentField)
          updateBindingEditError(currentField.name, error)
        }
        break
      case "return":
        handleSave()
        break
      case "space":
        if (currentField?.type === "toggle") {
          const currentValue = values()[currentField.name] as boolean
          updateBindingEditField(currentField.name, !currentValue)
        }
        break
      case "backspace":
        if (currentField && (currentField.type === "text" || currentField.type === "date" || currentField.type === "number" || currentField.type === "masked")) {
          const currentValue = String(values()[currentField.name] ?? "")
          updateBindingEditField(currentField.name, currentValue.slice(0, -1))
        }
        break
      case "up":
        if (currentField?.type === "select" && currentField.options) {
          const options = currentField.options
          const currentValue = values()[currentField.name] as string
          const currentOptionIndex = options.findIndex((o) => o.value === currentValue)
          const newOptionIndex = Math.max(0, currentOptionIndex - 1)
          updateBindingEditField(currentField.name, options[newOptionIndex]?.value ?? "")
        } else {
          // Move to previous field
          const newIndex = Math.max(0, currentIndex - 1)
          setBindingEditActiveField(newIndex)
        }
        break
      case "down":
        if (currentField?.type === "select" && currentField.options) {
          const options = currentField.options
          const currentValue = values()[currentField.name] as string
          const currentOptionIndex = options.findIndex((o) => o.value === currentValue)
          const newOptionIndex = Math.min(options.length - 1, currentOptionIndex + 1)
          updateBindingEditField(currentField.name, options[newOptionIndex]?.value ?? "")
        } else {
          // Move to next field
          const newIndex = Math.min(currentFields.length - 1, currentIndex + 1)
          setBindingEditActiveField(newIndex)
        }
        break
      default:
        // Handle printable characters for text/number/date fields
        if (currentField && event.name.length === 1) {
          if (currentField.type === "text" || currentField.type === "masked") {
            const currentValue = String(values()[currentField.name] ?? "")
            updateBindingEditField(currentField.name, currentValue + event.name)
          } else if (currentField.type === "date") {
            // Only allow digits and dashes for date
            if (/[\d-]/.test(event.name)) {
              const currentValue = String(values()[currentField.name] ?? "")
              updateBindingEditField(currentField.name, currentValue + event.name)
            }
          } else if (currentField.type === "number") {
            // Only allow digits and minus for numbers
            if (/[\d.-]/.test(event.name)) {
              const currentValue = String(values()[currentField.name] ?? "")
              const newValue = currentValue + event.name
              const num = Number.parseFloat(newValue)
              if (!Number.isNaN(num) || newValue === "-" || newValue === "") {
                updateBindingEditField(currentField.name, newValue === "" ? "" : num)
              }
            }
          }
        }
        break
    }
  })

  const renderField = (field: FieldDefinition, index: number) => {
    const isActive = () => index === activeFieldIndex()
    const value = () => values()[field.name]
    const error = () => errors()[field.name]
    const color = () => (isActive() ? COLORS.selected : COLORS.normal)
    const prefix = () => (isActive() ? "> " : "  ")
    const cursor = () => (isActive() ? "_" : "")

    return (
      <box flexDirection="column">
        <Show
          when={field.type === "toggle"}
          fallback={
            <Show
              when={field.type === "select"}
              fallback={
                // Text/Number/Date/Masked field
                <text fg={color()}>
                  {isActive() ? (
                    <strong>
                      {prefix()}
                      {field.label}
                      {field.required ? "*" : ""}: {renderFieldValue(field, value())}
                      {cursor()}
                    </strong>
                  ) : (
                    <span>
                      {prefix()}
                      {field.label}
                      {field.required ? "*" : ""}: {renderFieldValue(field, value())}
                    </span>
                  )}
                </text>
              }
            >
              {/* Select field */}
              <text fg={color()}>
                {isActive() ? (
                  <strong>
                    {prefix()}
                    {field.label}
                    {field.required ? "*" : ""}: {renderSelectValue(field, value() as string)}
                  </strong>
                ) : (
                  <span>
                    {prefix()}
                    {field.label}
                    {field.required ? "*" : ""}: {renderSelectValue(field, value() as string)}
                  </span>
                )}
              </text>
            </Show>
          }
        >
          {/* Toggle field */}
          <text fg={color()}>
            {isActive() ? (
              <strong>
                {prefix()}[{value() ? "x" : " "}] {field.label}
              </strong>
            ) : (
              <span>
                {prefix()}[{value() ? "x" : " "}] {field.label}
              </span>
            )}
          </text>
        </Show>
        <Show when={error()}>
          <text fg={COLORS.error}>    {error()}</text>
        </Show>
        <Show when={isActive() && field.description}>
          <text fg={COLORS.muted}>    {field.description}</text>
        </Show>
      </box>
    )
  }

  const renderFieldValue = (field: FieldDefinition, value: unknown): string => {
    if (value === undefined || value === null || value === "") {
      return field.placeholder ? `(${field.placeholder})` : "(empty)"
    }
    if (field.type === "masked") {
      // Mask sensitive values
      return "••••••••"
    }
    return String(value)
  }

  const renderSelectValue = (field: FieldDefinition, value: string): string => {
    const option = field.options?.find((o) => o.value === value)
    return option?.label ?? value ?? "(none)"
  }

  return (
    <box
      position="absolute"
      top="10%"
      left="10%"
      width="80%"
      height="80%"
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.activeBorder}
      title={title()}
      backgroundColor="black"
    >
      <text> </text>
      <scrollbox flexGrow={1}>
        <For each={fields()}>{(field, i) => renderField(field, i())}</For>
      </scrollbox>
      <text> </text>
      <text fg={COLORS.muted}>  Tab:next Shift+Tab:prev Enter:save Esc:cancel</text>
    </box>
  )
}
