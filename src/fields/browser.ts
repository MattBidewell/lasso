/**
 * Browser Rendering Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#browser-rendering
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createToggleField } from "./shared.ts"

export const browserDefinition: BindingTypeDefinition = {
  type: "browser",
  displayName: "Browser Rendering",
  configKey: "browser",
  isArray: false, // Browser binding is an object, not an array
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to Browser Rendering in your Worker code (e.g., env.BROWSER)",
      placeholder: "BROWSER",
      defaultValue: "BROWSER",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote Browser Rendering API during local development instead of local simulation",
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
