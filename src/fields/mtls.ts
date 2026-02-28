/**
 * mTLS Certificate Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#mtls-certificates
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import { createBindingNameField, createRequiredTextField, createToggleField } from "./shared.ts"

export const mtlsDefinition: BindingTypeDefinition = {
  type: "mtls_certificate",
  displayName: "mTLS Certificate",
  configKey: "mtls_certificates",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the mTLS certificate in your Worker code (e.g., env.MY_CERT)",
      placeholder: "MY_CERT",
    }),
    createRequiredTextField("certificate_id", "Certificate ID", {
      description: "The UUID of the uploaded mTLS certificate. Required - upload via 'wrangler mtls-certificate upload'",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote mTLS certificate during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    certificate_id: z.string().min(1, "Certificate ID is required"),
    remote: z.boolean().optional(),
  }),
}
