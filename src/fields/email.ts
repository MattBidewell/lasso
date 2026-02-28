/**
 * Email Binding Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#email-bindings
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createOptionalTextField,
  createArrayField,
  createToggleField,
  bindingNameSchema,
} from "./shared.ts"

export const emailDefinition: BindingTypeDefinition = {
  type: "email",
  displayName: "Email (Send)",
  configKey: "send_email",
  isArray: true,
  fields: [
    {
      name: "name",
      label: "Binding Name",
      type: "text",
      required: true,
      validation: bindingNameSchema,
      description: "The binding name used to refer to the email sender in your Worker code (e.g., env.EMAIL)",
      placeholder: "EMAIL",
    },
    createOptionalTextField("destination_address", "Destination Address", {
      description: "If set, restricts this binding to only send to this specific verified email address. Optional",
      placeholder: "recipient@example.com",
    }),
    createArrayField("allowed_destination_addresses", "Allowed Destination Addresses", {
      description: "If set, restricts this binding to only send to these verified email addresses. Optional",
      placeholder: "user@example.com",
    }),
    createArrayField("allowed_sender_addresses", "Allowed Sender Addresses", {
      description: "If set, restricts this binding to only send from these verified email addresses. Optional",
      placeholder: "sender@example.com",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote email service during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    name: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    destination_address: z.string().email("Must be a valid email address").optional(),
    allowed_destination_addresses: z.array(z.string().email()).optional(),
    allowed_sender_addresses: z.array(z.string().email()).optional(),
    remote: z.boolean().optional(),
  }),
}
