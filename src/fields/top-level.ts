/**
 * Top-Level Config Field Definitions
 *
 * Field definitions for wrangler.json top-level configuration fields
 * like name, main, compatibility_date, etc.
 */

import { z } from "zod"
import type { FieldDefinition } from "./types.ts"
import {
  createRequiredTextField,
  createOptionalTextField,
  createToggleField,
  createSelectField,
  createDateField,
  createArrayField,
  createNumberField,
  bindingNameSchema,
  dateSchema,
} from "./shared.ts"

// ============================================================================
// Core Config Fields
// ============================================================================

export const topLevelCoreFields: FieldDefinition[] = [
  {
    name: "name",
    label: "Worker Name",
    type: "text",
    required: true,
    validation: z
      .string()
      .min(1, "Worker name is required")
      .max(255, "Worker name must be 255 characters or less")
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_-]*$/,
        "Must start with a letter and contain only letters, numbers, underscores, and hyphens"
      ),
    description: "Name of your Worker (used in URLs and dashboard)",
    placeholder: "my-worker",
  },
  createRequiredTextField("main", "Entry Point", {
    description: "Path to the entry point file for your Worker",
    placeholder: "src/index.ts",
  }),
  {
    name: "compatibility_date",
    label: "Compatibility Date",
    type: "date",
    required: true,
    validation: dateSchema,
    description: "Date determining which Workers runtime features are enabled",
    placeholder: "YYYY-MM-DD",
  },
  createOptionalTextField("account_id", "Account ID", {
    description: "Cloudflare account ID (optional, can be set via env var)",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  }),
  createArrayField("compatibility_flags", "Compatibility Flags", {
    description: "Feature flags to enable/disable specific runtime features",
    placeholder: "nodejs_compat",
  }),
  createToggleField("workers_dev", "Enable workers.dev", {
    description: "Enable *.workers.dev subdomain",
    defaultValue: true,
  }),
  createToggleField("preview_urls", "Enable Preview URLs", {
    description: "Enable preview URLs for deployments",
    defaultValue: true,
  }),
]

// ============================================================================
// Routes Configuration
// ============================================================================

export const routeFields: FieldDefinition[] = [
  createOptionalTextField("route", "Route", {
    description: "Single route pattern for the Worker",
    placeholder: "example.com/*",
  }),
  // Note: routes array is more complex and would need special handling
]

// ============================================================================
// Triggers Configuration
// ============================================================================

export const triggerFields: FieldDefinition[] = [
  createArrayField("triggers.crons", "Cron Triggers", {
    description: "Cron expressions for scheduled triggers",
    placeholder: "0 * * * *",
  }),
]

// ============================================================================
// Build Configuration
// ============================================================================

export const buildFields: FieldDefinition[] = [
  createOptionalTextField("build.command", "Build Command", {
    description: "Custom build command to run",
    placeholder: "npm run build",
  }),
  createOptionalTextField("build.cwd", "Working Directory", {
    description: "Working directory for the build command",
    placeholder: "./",
  }),
  createOptionalTextField("build.watch_dir", "Watch Directory", {
    description: "Directory to watch for changes during dev",
    placeholder: "src",
  }),
]

// ============================================================================
// Limits Configuration
// ============================================================================

export const limitsFields: FieldDefinition[] = [
  createNumberField("limits.cpu_ms", "CPU Time Limit (ms)", {
    description: "Maximum CPU time per request (up to 300000 for paid plans)",
    min: 0,
    max: 300000,
    placeholder: "50",
  }),
]

// ============================================================================
// Observability Configuration
// ============================================================================

export const observabilityFields: FieldDefinition[] = [
  createToggleField("observability.enabled", "Enable Observability", {
    description: "Enable Workers Observability",
  }),
  createNumberField("observability.head_sampling_rate", "Head Sampling Rate", {
    description: "Sampling rate for head-based sampling (0-1)",
    min: 0,
    max: 1,
    placeholder: "1",
  }),
]

// ============================================================================
// Placement Configuration
// ============================================================================

export const placementFields: FieldDefinition[] = [
  createSelectField(
    "placement.mode",
    "Placement Mode",
    [
      { value: "smart", label: "Smart", description: "Auto-place near backend services" },
      { value: "off", label: "Off", description: "Disable smart placement" },
    ],
    {
      required: false,
      description: "Smart placement mode for optimizing Worker location",
    }
  ),
  createOptionalTextField("placement.hint", "Placement Hint", {
    description: "Region hint (e.g., aws:us-east-1)",
    placeholder: "aws:us-east-1",
  }),
]

// ============================================================================
// Assets Configuration
// ============================================================================

export const assetsFields: FieldDefinition[] = [
  createOptionalTextField("assets.directory", "Assets Directory", {
    description: "Directory containing static assets",
    placeholder: "./public",
  }),
  createOptionalTextField("assets.binding", "Assets Binding", {
    description: "Binding name to access assets in code",
    placeholder: "ASSETS",
  }),
  createSelectField(
    "assets.html_handling",
    "HTML Handling",
    [
      { value: "auto-trailing-slash", label: "Auto Trailing Slash" },
      { value: "force-trailing-slash", label: "Force Trailing Slash" },
      { value: "drop-trailing-slash", label: "Drop Trailing Slash" },
      { value: "none", label: "None" },
    ],
    {
      required: false,
      description: "How to handle HTML file URL paths",
    }
  ),
  createSelectField(
    "assets.not_found_handling",
    "404 Handling",
    [
      { value: "single-page-application", label: "SPA (serve index.html)" },
      { value: "404-page", label: "404 Page" },
      { value: "none", label: "None" },
    ],
    {
      required: false,
      description: "How to handle requests for missing assets",
    }
  ),
]

// ============================================================================
// Bundling Configuration
// ============================================================================

export const bundlingFields: FieldDefinition[] = [
  createOptionalTextField("tsconfig", "TypeScript Config", {
    description: "Path to custom tsconfig file",
    placeholder: "./tsconfig.json",
  }),
  createToggleField("no_bundle", "Disable Bundling", {
    description: "Skip bundling (for pre-bundled code)",
  }),
  createToggleField("minify", "Minify Output", {
    description: "Minify the bundled output",
    defaultValue: false,
  }),
  createToggleField("keep_names", "Keep Names", {
    description: "esbuild keepNames option for better debugging",
    defaultValue: false,
  }),
  createToggleField("find_additional_modules", "Find Additional Modules", {
    description: "Include additional modules matching rules",
  }),
  createToggleField("preserve_file_names", "Preserve File Names", {
    description: "Keep original file names in output",
  }),
  createOptionalTextField("base_dir", "Base Directory", {
    description: "Base directory for module resolution",
    placeholder: ".",
  }),
]

// ============================================================================
// Export All Config Sections
// ============================================================================

export const configSections = {
  core: topLevelCoreFields,
  routes: routeFields,
  triggers: triggerFields,
  build: buildFields,
  limits: limitsFields,
  observability: observabilityFields,
  placement: placementFields,
  assets: assetsFields,
  bundling: bundlingFields,
}

export type ConfigSection = keyof typeof configSections
