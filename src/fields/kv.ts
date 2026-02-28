/**
 * KV Namespace Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#kv-namespaces
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createBindingNameField,
  createOptionalTextField,
  createToggleField,
} from "./shared.ts"

export const kvNamespaceDefinition: BindingTypeDefinition = {
  type: "kv_namespace",
  displayName: "KV Namespace",
  configKey: "kv_namespaces",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the KV Namespace in your Worker code (e.g., env.MY_KV)",
      placeholder: "MY_KV",
    }),
    createOptionalTextField("id", "Namespace ID", {
      description: "The ID of the KV namespace. Optional - can be configured later via dashboard or wrangler CLI",
      placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    }),
    createOptionalTextField("preview_id", "Preview Namespace ID", {
      description: "The ID of the KV namespace used during 'wrangler dev'. If not set, a local simulation is used",
      placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote KV namespace during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    id: z.string().optional(),
    preview_id: z.string().optional(),
    remote: z.boolean().optional(),
  }),
}
