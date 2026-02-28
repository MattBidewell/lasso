/**
 * Service Binding Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#service-bindings
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createBindingNameField,
  createRequiredTextField,
  createOptionalTextField,
  createToggleField,
} from "./shared.ts"

export const serviceBindingDefinition: BindingTypeDefinition = {
  type: "service_binding",
  displayName: "Service Binding",
  configKey: "services",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the service in your Worker code (e.g., env.AUTH_SERVICE)",
      placeholder: "AUTH_SERVICE",
    }),
    createRequiredTextField("service", "Service Name", {
      description: "The name of the target Worker service. Required. Use 'worker-name-env' format for specific environments",
      placeholder: "my-auth-worker",
    }),
    createOptionalTextField("entrypoint", "Entrypoint", {
      description: "The named export of the service to bind to. Optional - defaults to the default export",
      placeholder: "default",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote service during local development instead of local Workers",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    service: z.string().min(1, "Service name is required"),
    entrypoint: z.string().optional(),
    props: z.record(z.unknown()).optional(),
    remote: z.boolean().optional(),
  }),
}
