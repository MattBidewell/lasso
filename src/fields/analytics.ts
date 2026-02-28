/**
 * Analytics Engine Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#analytics-engine-datasets
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createOptionalTextField } from "./shared.ts"

export const analyticsEngineDefinition: BindingTypeDefinition = {
  type: "analytics_engine",
  displayName: "Analytics Engine",
  configKey: "analytics_engine_datasets",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the Analytics Engine dataset in your Worker code (e.g., env.MY_ANALYTICS)",
      placeholder: "MY_ANALYTICS",
    }),
    createOptionalTextField("dataset", "Dataset Name", {
      description: "The name of the Analytics Engine dataset to write to. Optional - defaults to the binding name",
      placeholder: "my-dataset",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    dataset: z.string().optional(),
  }),
}
