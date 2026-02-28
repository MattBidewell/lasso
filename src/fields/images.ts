/**
 * Images Binding Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#images
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createToggleField } from "./shared.ts"

export const imagesDefinition: BindingTypeDefinition = {
  type: "images",
  displayName: "Cloudflare Images",
  configKey: "images",
  isArray: false, // Images binding is an object, not an array
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to Cloudflare Images in your Worker code (e.g., env.IMAGES)",
      placeholder: "IMAGES",
      defaultValue: "IMAGES",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote Cloudflare Images API during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    remote: z.boolean().optional(),
  }),
}
