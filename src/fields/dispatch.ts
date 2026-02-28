/**
 * Dispatch Namespace Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#dispatch-namespace-bindings-workers-for-platforms
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createBindingNameField,
  createRequiredTextField,
  createOptionalTextField,
  createToggleField,
} from "./shared.ts"

export const dispatchNamespaceDefinition: BindingTypeDefinition = {
  type: "dispatch_namespace",
  displayName: "Dispatch Namespace",
  configKey: "dispatch_namespaces",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the dispatch namespace in your Worker code (e.g., env.DISPATCHER)",
      placeholder: "DISPATCHER",
    }),
    createRequiredTextField("namespace", "Namespace", {
      description: "The name of the Workers for Platforms dispatch namespace. Required - must exist in your account",
      placeholder: "my-namespace",
    }),
    createOptionalTextField("outbound.service", "Outbound Service", {
      description: "The Worker service that handles outbound requests from dispatched Workers. Optional",
      placeholder: "my-outbound-worker",
    }),
    createOptionalTextField("outbound.parameters", "Outbound Parameters", {
      description: "Parameters passed to the outbound service as a JSON array. Optional",
      placeholder: '["param1", "param2"]',
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote Dispatch Namespace during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    namespace: z.string().min(1, "Namespace is required"),
    outbound: z
      .object({
        service: z.string().optional(),
        parameters: z.array(z.string()).optional(),
      })
      .optional(),
    remote: z.boolean().optional(),
  }),
}
