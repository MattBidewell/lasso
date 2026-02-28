/**
 * Fields Module
 *
 * Exports field definitions and the FieldRegistry for binding and config editing.
 */

// Export types
export type {
  InputType,
  BindingType,
  SelectOption,
  FieldDefinition,
  BindingTypeDefinition,
  ValidationResult,
} from "./types.ts"

// Export registry
export { FieldRegistry, fieldRegistry } from "./registry.ts"

// Export shared utilities
export {
  bindingNameSchema,
  dateSchema,
  optionalDateSchema,
  requiredIdSchema,
  optionalStringSchema,
  createBindingNameField,
  createRequiredTextField,
  createOptionalTextField,
  createSelectField,
  createToggleField,
  createNumberField,
  createArrayField,
  createDateField,
  createMaskedField,
} from "./shared.ts"

// Export binding definitions
export { kvNamespaceDefinition } from "./kv.ts"
export { d1DatabaseDefinition } from "./d1.ts"
export { r2BucketDefinition } from "./r2.ts"
export { durableObjectDefinition } from "./durable-objects.ts"
export { serviceBindingDefinition } from "./service.ts"
export { queueProducerDefinition, queueConsumerDefinition } from "./queue.ts"
export { hyperdriveDefinition } from "./hyperdrive.ts"
export { vectorizeDefinition } from "./vectorize.ts"
export { analyticsEngineDefinition } from "./analytics.ts"
export { aiDefinition } from "./ai.ts"
export { browserDefinition } from "./browser.ts"
export { emailDefinition } from "./email.ts"
export { mtlsDefinition } from "./mtls.ts"
export { dispatchNamespaceDefinition } from "./dispatch.ts"
export { imagesDefinition } from "./images.ts"
export { environmentVariableDefinition } from "./vars.ts"

// Export top-level config field definitions
export {
  topLevelCoreFields,
  routeFields,
  triggerFields,
  buildFields,
  limitsFields,
  observabilityFields,
  placementFields,
  assetsFields,
  bundlingFields,
  configSections,
  type ConfigSection,
} from "./top-level.ts"

// Import for registration
import { fieldRegistry } from "./registry.ts"
import { kvNamespaceDefinition } from "./kv.ts"
import { d1DatabaseDefinition } from "./d1.ts"
import { r2BucketDefinition } from "./r2.ts"
import { durableObjectDefinition } from "./durable-objects.ts"
import { serviceBindingDefinition } from "./service.ts"
import { queueProducerDefinition, queueConsumerDefinition } from "./queue.ts"
import { hyperdriveDefinition } from "./hyperdrive.ts"
import { vectorizeDefinition } from "./vectorize.ts"
import { analyticsEngineDefinition } from "./analytics.ts"
import { aiDefinition } from "./ai.ts"
import { browserDefinition } from "./browser.ts"
import { emailDefinition } from "./email.ts"
import { mtlsDefinition } from "./mtls.ts"
import { dispatchNamespaceDefinition } from "./dispatch.ts"
import { imagesDefinition } from "./images.ts"
import { environmentVariableDefinition } from "./vars.ts"

// Register all binding types
fieldRegistry.registerBindingType(kvNamespaceDefinition)
fieldRegistry.registerBindingType(d1DatabaseDefinition)
fieldRegistry.registerBindingType(r2BucketDefinition)
fieldRegistry.registerBindingType(durableObjectDefinition)
fieldRegistry.registerBindingType(serviceBindingDefinition)
fieldRegistry.registerBindingType(queueProducerDefinition)
fieldRegistry.registerBindingType(queueConsumerDefinition)
fieldRegistry.registerBindingType(hyperdriveDefinition)
fieldRegistry.registerBindingType(vectorizeDefinition)
fieldRegistry.registerBindingType(analyticsEngineDefinition)
fieldRegistry.registerBindingType(aiDefinition)
fieldRegistry.registerBindingType(browserDefinition)
fieldRegistry.registerBindingType(emailDefinition)
fieldRegistry.registerBindingType(mtlsDefinition)
fieldRegistry.registerBindingType(dispatchNamespaceDefinition)
fieldRegistry.registerBindingType(imagesDefinition)
fieldRegistry.registerBindingType(environmentVariableDefinition)
