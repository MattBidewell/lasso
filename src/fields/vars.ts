/**
 * Environment Variables Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#environment-variables
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { bindingNameSchema, createMaskedField } from "./shared.ts"

export const environmentVariableDefinition: BindingTypeDefinition = {
  type: "environment_variable",
  displayName: "Environment Variable",
  configKey: "vars",
  isArray: false, // Vars is an object, not an array
  fields: [
    {
      name: "name",
      label: "Variable Name",
      type: "text",
      required: true,
      validation: bindingNameSchema,
      description: "The name of the environment variable, accessible as env.MY_VAR in your Worker code",
      placeholder: "MY_VAR",
    },
    createMaskedField("value", "Value", {
      required: true,
      description: "The value of the environment variable. Masked in the UI for security",
      placeholder: "my-secret-value",
    }),
  ],
  schema: z.object({
    name: z
      .string()
      .min(1, "Variable name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    value: z.string().min(1, "Variable value is required"),
  }),
}
