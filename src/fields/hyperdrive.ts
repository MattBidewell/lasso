/**
 * Hyperdrive Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#hyperdrive
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createRequiredTextField, createOptionalTextField } from "./shared.ts"

export const hyperdriveDefinition: BindingTypeDefinition = {
  type: "hyperdrive",
  displayName: "Hyperdrive",
  configKey: "hyperdrive",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the Hyperdrive connection in your Worker code (e.g., env.MY_DB)",
      placeholder: "MY_DB",
    }),
    createRequiredTextField("id", "Hyperdrive ID", {
      description: "The ID of the Hyperdrive configuration. Required - create one via 'wrangler hyperdrive create'",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    }),
    createOptionalTextField("localConnectionString", "Local Connection String", {
      description: "Database connection string to use during 'wrangler dev' instead of Hyperdrive",
      placeholder: "postgres://user:password@localhost:5432/database",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    id: z.string().min(1, "Hyperdrive ID is required"),
    localConnectionString: z.string().optional(),
  }),
}
