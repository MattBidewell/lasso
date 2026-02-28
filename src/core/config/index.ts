/**
 * Config Module
 *
 * Exports utilities for reading and writing wrangler config files.
 */

export {
  createJsoncEditor,
  detectFormatting,
  applyChanges,
  isFileWritable,
  type JsoncEditor,
  type ConfigChange,
} from "./editor.ts"
