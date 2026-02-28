/**
 * Vectorize Index Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#vectorize-indexes
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createRequiredTextField, createToggleField } from "./shared.ts"

export const vectorizeDefinition: BindingTypeDefinition = {
  type: "vectorize",
  displayName: "Vectorize Index",
  configKey: "vectorize",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the Vectorize index in your Worker code (e.g., env.MY_INDEX)",
      placeholder: "MY_INDEX",
    }),
    createRequiredTextField("index_name", "Index Name", {
      description: "The name of the Vectorize index. Required - must match an existing index in your account",
      placeholder: "my-vector-index",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote Vectorize index during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    index_name: z.string().min(1, "Index name is required"),
    remote: z.boolean().optional(),
  }),
}
