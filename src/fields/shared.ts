/**
 * Shared Field Definitions
 *
 * Common schemas and field factories used across multiple binding types.
 */

import { z } from "zod"
import type { FieldDefinition, InputType, SelectOption } from "./types.ts"

// ============================================================================
// Shared Zod Schemas
// ============================================================================

/**
 * Binding name schema with JavaScript identifier validation
 * Used for the "binding" field in most binding types
 */
export const bindingNameSchema = z
  .string({
    required_error: "Binding name is required",
  })
  .min(1, "Binding name is required")
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "Must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with number)"
  )

/**
 * Date schema with YYYY-MM-DD format validation
 * Used for compatibility_date and similar fields
 */
export const dateSchema = z
  .string({
    required_error: "Date is required",
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (val) => {
      const date = new Date(val)
      return !Number.isNaN(date.getTime())
    },
    { message: "Invalid date" }
  )

/**
 * Optional date schema
 */
export const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (val) => {
      const date = new Date(val)
      return !Number.isNaN(date.getTime())
    },
    { message: "Invalid date" }
  )
  .optional()

/**
 * Non-empty string schema for required ID fields
 */
export const requiredIdSchema = z
  .string({
    required_error: "This field is required",
  })
  .min(1, "This field is required")

/**
 * Optional string schema
 */
export const optionalStringSchema = z.string().optional()

// ============================================================================
// Field Factory Functions
// ============================================================================

/**
 * Create a binding name field definition
 */
export function createBindingNameField(
  overrides: Partial<FieldDefinition> = {}
): FieldDefinition {
  return {
    name: "binding",
    label: "Binding Name",
    type: "text",
    required: true,
    validation: bindingNameSchema,
    description: "JavaScript variable name to access this binding in your Worker code",
    placeholder: "MY_BINDING",
    ...overrides,
  }
}

/**
 * Create a required text field definition
 */
export function createRequiredTextField(
  name: string,
  label: string,
  options: {
    description?: string
    placeholder?: string
    validation?: z.ZodTypeAny
  } = {}
): FieldDefinition {
  return {
    name,
    label,
    type: "text",
    required: true,
    validation: options.validation ?? requiredIdSchema,
    description: options.description,
    placeholder: options.placeholder,
  }
}

/**
 * Create an optional text field definition
 */
export function createOptionalTextField(
  name: string,
  label: string,
  options: {
    description?: string
    placeholder?: string
    validation?: z.ZodTypeAny
  } = {}
): FieldDefinition {
  return {
    name,
    label,
    type: "text",
    required: false,
    validation: options.validation ?? optionalStringSchema,
    description: options.description,
    placeholder: options.placeholder,
  }
}

/**
 * Create a select field definition
 */
export function createSelectField(
  name: string,
  label: string,
  selectOptions: SelectOption[],
  options: {
    required?: boolean
    description?: string
    defaultValue?: string
    validation?: z.ZodTypeAny
  } = {}
): FieldDefinition {
  const values = selectOptions.map((o) => o.value) as [string, ...string[]]
  return {
    name,
    label,
    type: "select",
    required: options.required ?? true,
    options: selectOptions,
    defaultValue: options.defaultValue ?? selectOptions[0]?.value,
    validation: options.validation ?? z.enum(values),
    description: options.description,
  }
}

/**
 * Create a toggle (boolean) field definition
 */
export function createToggleField(
  name: string,
  label: string,
  options: {
    description?: string
    defaultValue?: boolean
  } = {}
): FieldDefinition {
  return {
    name,
    label,
    type: "toggle",
    required: false,
    validation: z.boolean().optional(),
    description: options.description,
    defaultValue: options.defaultValue ?? false,
  }
}

/**
 * Create a number field definition
 */
export function createNumberField(
  name: string,
  label: string,
  options: {
    required?: boolean
    description?: string
    placeholder?: string
    min?: number
    max?: number
    defaultValue?: number
  } = {}
): FieldDefinition {
  let validation = z.number()
  if (options.min !== undefined) {
    validation = validation.min(options.min, `Must be at least ${options.min}`)
  }
  if (options.max !== undefined) {
    validation = validation.max(options.max, `Must be at most ${options.max}`)
  }

  return {
    name,
    label,
    type: "number",
    required: options.required ?? false,
    validation: options.required ? validation : validation.optional(),
    description: options.description,
    placeholder: options.placeholder,
    defaultValue: options.defaultValue,
  }
}

/**
 * Create an array field definition
 */
export function createArrayField(
  name: string,
  label: string,
  options: {
    required?: boolean
    description?: string
    placeholder?: string
    itemValidation?: z.ZodTypeAny
  } = {}
): FieldDefinition {
  const itemSchema = options.itemValidation ?? z.string()
  const validation = options.required
    ? z.array(itemSchema).min(1, "At least one item is required")
    : z.array(itemSchema).optional()

  return {
    name,
    label,
    type: "array",
    required: options.required ?? false,
    validation,
    description: options.description,
    placeholder: options.placeholder,
  }
}

/**
 * Create a date field definition
 */
export function createDateField(
  name: string,
  label: string,
  options: {
    required?: boolean
    description?: string
    placeholder?: string
  } = {}
): FieldDefinition {
  return {
    name,
    label,
    type: "date",
    required: options.required ?? false,
    validation: options.required ? dateSchema : optionalDateSchema,
    description: options.description,
    placeholder: options.placeholder ?? "YYYY-MM-DD",
  }
}

/**
 * Create a masked field definition (for sensitive values)
 */
export function createMaskedField(
  name: string,
  label: string,
  options: {
    required?: boolean
    description?: string
    placeholder?: string
  } = {}
): FieldDefinition {
  return {
    name,
    label,
    type: "masked",
    required: options.required ?? false,
    validation: options.required ? requiredIdSchema : optionalStringSchema,
    description: options.description,
    placeholder: options.placeholder,
  }
}
