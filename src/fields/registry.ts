/**
 * Field Registry
 *
 * Singleton that provides access to all field definitions for bindings
 * and config fields.
 */

import type {
  BindingType,
  BindingTypeDefinition,
  FieldDefinition,
  ValidationResult,
} from "./types.ts"

export class FieldRegistry {
  private bindingTypes: Map<BindingType, BindingTypeDefinition> = new Map()
  private configSections: Map<string, FieldDefinition[]> = new Map()

  /**
   * Register a binding type definition
   */
  registerBindingType(definition: BindingTypeDefinition): void {
    this.bindingTypes.set(definition.type, definition)
  }

  /**
   * Register config section fields
   */
  registerConfigSection(section: string, fields: FieldDefinition[]): void {
    this.configSections.set(section, fields)
  }

  /**
   * Get definition for a binding type
   */
  getBindingType(type: BindingType): BindingTypeDefinition | undefined {
    return this.bindingTypes.get(type)
  }

  /**
   * Get all registered binding types
   */
  getAllBindingTypes(): BindingTypeDefinition[] {
    return Array.from(this.bindingTypes.values())
  }

  /**
   * Get field definitions for a binding type
   */
  getFieldsForBinding(type: BindingType): FieldDefinition[] {
    return this.bindingTypes.get(type)?.fields ?? []
  }

  /**
   * Validate binding values against the type's schema
   */
  validateBinding(type: BindingType, values: unknown): ValidationResult {
    const definition = this.bindingTypes.get(type)
    if (!definition) {
      return { valid: false, errors: { _form: "Unknown binding type" } }
    }

    const result = definition.schema.safeParse(values)
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!errors[field]) {
          errors[field] = issue.message
        }
      }
      return { valid: false, errors }
    }
    return { valid: true, data: result.data as Record<string, unknown> }
  }

  /**
   * Get display name for a binding type
   */
  getDisplayName(type: BindingType): string {
    return this.bindingTypes.get(type)?.displayName ?? type
  }

  /**
   * Get config key for a binding type (e.g., "kv_namespaces")
   */
  getConfigKey(type: BindingType): string {
    return this.bindingTypes.get(type)?.configKey ?? type
  }

  /**
   * Check if binding type uses array in config (vs object)
   */
  isArrayBinding(type: BindingType): boolean {
    return this.bindingTypes.get(type)?.isArray ?? true
  }

  /**
   * Get config section fields
   */
  getConfigSection(section: string): FieldDefinition[] {
    return this.configSections.get(section) ?? []
  }

  /**
   * Get all config sections
   */
  getAllConfigSections(): string[] {
    return Array.from(this.configSections.keys())
  }
}

// Singleton export
export const fieldRegistry = new FieldRegistry()
