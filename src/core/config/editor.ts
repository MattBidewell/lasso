/**
 * JSONC Editor
 *
 * Utility for reading and writing JSONC files while preserving comments.
 * Uses Microsoft's jsonc-parser for comment-aware editing.
 */

import { readFileSync, writeFileSync, accessSync, constants } from "node:fs"
import {
  modify,
  applyEdits,
  parseTree,
  findNodeAtLocation,
  type FormattingOptions,
  type Node,
} from "jsonc-parser"
import stripJsonComments from "strip-json-comments"

// ============================================================================
// Types
// ============================================================================

export interface JsoncEditor {
  /** Get the entire parsed config object */
  get(): unknown

  /** Get value at a specific JSON path */
  getPath(path: (string | number)[]): unknown

  /** Set value at a JSON path (creates intermediate objects if needed) */
  set(path: (string | number)[], value: unknown): void

  /** Delete value at a JSON path */
  delete(path: (string | number)[]): void

  /** Save changes back to the file */
  save(): void

  /** Get current text content (including pending changes) */
  toString(): string

  /** Check if there are unsaved changes */
  isDirty(): boolean

  /** Discard all unsaved changes and reload from file */
  reload(): void

  /** Get the file path */
  getFilePath(): string
}

export interface ConfigChange {
  /** JSON path to the target */
  path: (string | number)[]
  /** New value (undefined means delete) */
  value: unknown
}

// ============================================================================
// Formatting Detection
// ============================================================================

/**
 * Detect formatting options from existing file content
 */
export function detectFormatting(text: string): FormattingOptions {
  // Try to detect indentation from the file
  const indentMatch = text.match(/\n([ \t]+)["{\[]/)
  let tabSize = 2
  let insertSpaces = true

  if (indentMatch?.[1]) {
    const indent = indentMatch[1]
    if (indent.includes("\t")) {
      insertSpaces = false
      tabSize = 1
    } else {
      insertSpaces = true
      tabSize = indent.length
    }
  }

  // Detect line ending
  const eol = text.includes("\r\n") ? "\r\n" : "\n"

  return {
    tabSize,
    insertSpaces,
    eol,
  }
}

// ============================================================================
// Editor Implementation
// ============================================================================

/**
 * Create a JSONC editor for the given file path
 * @throws Error if file does not exist or is not readable
 */
export function createJsoncEditor(filePath: string): JsoncEditor {
  // Verify file exists and is readable
  try {
    accessSync(filePath, constants.R_OK)
  } catch {
    throw new Error(`Cannot read file: ${filePath}`)
  }

  let originalText = readFileSync(filePath, "utf-8")
  let text = originalText
  const formatting = detectFormatting(text)

  /**
   * Get value at a path from the AST
   */
  function getValueAtPath(path: (string | number)[]): unknown {
    if (path.length === 0) {
      return JSON.parse(stripJsonComments(text))
    }

    const tree = parseTree(text)
    if (!tree) return undefined

    const node = findNodeAtLocation(tree, path)
    if (!node) return undefined

    // Extract the value from the text
    const nodeText = text.substring(node.offset, node.offset + node.length)
    try {
      return JSON.parse(stripJsonComments(nodeText))
    } catch {
      return undefined
    }
  }

  return {
    get(): unknown {
      try {
        return JSON.parse(stripJsonComments(text))
      } catch {
        return {}
      }
    },

    getPath(path: (string | number)[]): unknown {
      return getValueAtPath(path)
    },

    set(path: (string | number)[], value: unknown): void {
      const edits = modify(text, path, value, { formattingOptions: formatting })
      text = applyEdits(text, edits)
    },

    delete(path: (string | number)[]): void {
      const edits = modify(text, path, undefined, { formattingOptions: formatting })
      text = applyEdits(text, edits)
    },

    save(): void {
      // Verify file is writable
      try {
        accessSync(filePath, constants.W_OK)
      } catch {
        throw new Error(`Cannot write to file: ${filePath}`)
      }

      writeFileSync(filePath, text, "utf-8")
      originalText = text
    },

    toString(): string {
      return text
    },

    isDirty(): boolean {
      return text !== originalText
    },

    reload(): void {
      text = readFileSync(filePath, "utf-8")
      originalText = text
    },

    getFilePath(): string {
      return filePath
    },
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Apply multiple changes atomically to a JSONC editor
 */
export function applyChanges(editor: JsoncEditor, changes: ConfigChange[]): void {
  for (const change of changes) {
    if (change.value === undefined) {
      editor.delete(change.path)
    } else {
      editor.set(change.path, change.value)
    }
  }
}

/**
 * Check if a file is writable
 */
export function isFileWritable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.W_OK)
    return true
  } catch {
    return false
  }
}
