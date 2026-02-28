/**
 * AI Binding Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#workers-ai
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createToggleField } from "./shared.ts"

export const aiDefinition: BindingTypeDefinition = {
  type: "ai",
  displayName: "Workers AI",
  configKey: "ai",
  isArray: false, // AI binding is an object, not an array
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to Workers AI in your Worker code (e.g., env.AI)",
      placeholder: "AI",
      defaultValue: "AI",
    }),
    createToggleField("staging", "Staging", {
      description: "When enabled, use the Workers AI staging environment instead of production. For testing only",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote Workers AI API during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    staging: z.boolean().optional(),
    remote: z.boolean().optional(),
  }),
}
