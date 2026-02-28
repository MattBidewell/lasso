/**
 * Field Types for Wrangler Config Editing
 *
 * These types define the structure for field definitions used in
 * binding and config editing modals.
 */

import type { z } from "zod"

// ============================================================================
// Input Types
// ============================================================================

/** Type of UI input control */
export type InputType =
  | "text" // Free text input
  | "select" // Selection from predefined options
  | "toggle" // Boolean on/off
  | "array" // List of items
  | "number" // Numeric input
  | "date" // Date in YYYY-MM-DD format
  | "masked" // Masked text with reveal toggle (for sensitive values)

// ============================================================================
// Binding Types
// ============================================================================

/** All supported wrangler binding types */
export type BindingType =
  | "kv_namespace"
  | "d1_database"
  | "r2_bucket"
  | "durable_object"
  | "service_binding"
  | "queue_producer"
  | "queue_consumer"
  | "vectorize"
  | "hyperdrive"
  | "analytics_engine"
  | "ai"
  | "browser"
  | "email"
  | "mtls_certificate"
  | "dispatch_namespace"
  | "images"
  | "environment_variable"

// ============================================================================
// Field Definitions
// ============================================================================

/** Option for select-type fields */
export interface SelectOption {
  value: string
  label: string
  description?: string
}

/** Definition of a single editable field */
export interface FieldDefinition {
  /** Field name in the config object */
  name: string

  /** Display label in the UI */
  label: string

  /** Type of input control to render */
  type: InputType

  /** Whether the field is required */
  required: boolean

  /** Zod validation schema */
  validation: z.ZodTypeAny

  /** Help text shown below the field */
  description?: string

  /** Placeholder text for empty fields */
  placeholder?: string

  /** Options for select-type fields */
  options?: SelectOption[]

  /** Default value for new entries */
  defaultValue?: unknown

  /** Conditional visibility predicate */
  showWhen?: (values: Record<string, unknown>) => boolean
}

/** Definition grouping fields for a binding type */
export interface BindingTypeDefinition {
  /** Internal type identifier */
  type: BindingType

  /** Human-readable name */
  displayName: string

  /** Key in wrangler config (e.g., "kv_namespaces") */
  configKey: string

  /** Whether config key is an array (most bindings) or object (ai, browser) */
  isArray: boolean

  /** Ordered list of fields */
  fields: FieldDefinition[]

  /** Complete Zod schema for the binding */
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>

  /** Icon for display (optional, future) */
  icon?: string
}

// ============================================================================
// Validation
// ============================================================================

/** Result of validating a form or field */
export interface ValidationResult {
  valid: boolean
  data?: Record<string, unknown>
  errors?: Record<string, string>
}
