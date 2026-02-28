/**
 * Shared Field Schema Tests
 */

import { describe, test, expect } from "bun:test"
import {
  bindingNameSchema,
  dateSchema,
  optionalDateSchema,
  requiredIdSchema,
  optionalStringSchema,
  createBindingNameField,
  createRequiredTextField,
  createOptionalTextField,
  createSelectField,
  createToggleField,
  createNumberField,
  createArrayField,
  createDateField,
} from "../../src/fields/shared.ts"

describe("Shared Schemas", () => {
  describe("bindingNameSchema", () => {
    test("accepts valid JavaScript identifiers", () => {
      expect(bindingNameSchema.safeParse("MY_BINDING").success).toBe(true)
      expect(bindingNameSchema.safeParse("_private").success).toBe(true)
      expect(bindingNameSchema.safeParse("binding123").success).toBe(true)
      expect(bindingNameSchema.safeParse("a").success).toBe(true)
    })

    test("rejects empty string", () => {
      const result = bindingNameSchema.safeParse("")
      expect(result.success).toBe(false)
    })

    test("rejects names starting with number", () => {
      const result = bindingNameSchema.safeParse("123abc")
      expect(result.success).toBe(false)
    })

    test("rejects names with special characters", () => {
      expect(bindingNameSchema.safeParse("my-binding").success).toBe(false)
      expect(bindingNameSchema.safeParse("my.binding").success).toBe(false)
      expect(bindingNameSchema.safeParse("my binding").success).toBe(false)
      expect(bindingNameSchema.safeParse("my@binding").success).toBe(false)
    })
  })

  describe("dateSchema", () => {
    test("accepts valid YYYY-MM-DD dates", () => {
      expect(dateSchema.safeParse("2024-01-15").success).toBe(true)
      expect(dateSchema.safeParse("2000-12-31").success).toBe(true)
      expect(dateSchema.safeParse("2099-06-01").success).toBe(true)
    })

    test("rejects invalid date formats", () => {
      expect(dateSchema.safeParse("01-15-2024").success).toBe(false)
      expect(dateSchema.safeParse("2024/01/15").success).toBe(false)
      expect(dateSchema.safeParse("Jan 15, 2024").success).toBe(false)
      expect(dateSchema.safeParse("2024-1-15").success).toBe(false)
    })

    test("rejects invalid dates", () => {
      expect(dateSchema.safeParse("2024-13-01").success).toBe(false)
      expect(dateSchema.safeParse("2024-00-01").success).toBe(false)
    })

    test("rejects empty string", () => {
      expect(dateSchema.safeParse("").success).toBe(false)
    })
  })

  describe("optionalDateSchema", () => {
    test("accepts valid dates", () => {
      expect(optionalDateSchema.safeParse("2024-01-15").success).toBe(true)
    })

    test("accepts undefined", () => {
      expect(optionalDateSchema.safeParse(undefined).success).toBe(true)
    })
  })

  describe("requiredIdSchema", () => {
    test("accepts non-empty strings", () => {
      expect(requiredIdSchema.safeParse("abc123").success).toBe(true)
      expect(requiredIdSchema.safeParse("a").success).toBe(true)
    })

    test("rejects empty string", () => {
      expect(requiredIdSchema.safeParse("").success).toBe(false)
    })
  })

  describe("optionalStringSchema", () => {
    test("accepts strings", () => {
      expect(optionalStringSchema.safeParse("hello").success).toBe(true)
      expect(optionalStringSchema.safeParse("").success).toBe(true)
    })

    test("accepts undefined", () => {
      expect(optionalStringSchema.safeParse(undefined).success).toBe(true)
    })
  })
})

describe("Field Factories", () => {
  describe("createBindingNameField", () => {
    test("creates field with correct defaults", () => {
      const field = createBindingNameField()
      expect(field.name).toBe("binding")
      expect(field.label).toBe("Binding Name")
      expect(field.type).toBe("text")
      expect(field.required).toBe(true)
    })

    test("allows overriding defaults", () => {
      const field = createBindingNameField({
        placeholder: "CUSTOM",
        description: "Custom description",
      })
      expect(field.placeholder).toBe("CUSTOM")
      expect(field.description).toBe("Custom description")
    })
  })

  describe("createRequiredTextField", () => {
    test("creates required text field", () => {
      const field = createRequiredTextField("test_field", "Test Field")
      expect(field.name).toBe("test_field")
      expect(field.label).toBe("Test Field")
      expect(field.type).toBe("text")
      expect(field.required).toBe(true)
    })

    test("accepts custom options", () => {
      const field = createRequiredTextField("test_field", "Test Field", {
        description: "Test description",
        placeholder: "Enter value",
      })
      expect(field.description).toBe("Test description")
      expect(field.placeholder).toBe("Enter value")
    })
  })

  describe("createOptionalTextField", () => {
    test("creates optional text field", () => {
      const field = createOptionalTextField("opt_field", "Optional Field")
      expect(field.name).toBe("opt_field")
      expect(field.required).toBe(false)
    })
  })

  describe("createSelectField", () => {
    test("creates select field with options", () => {
      const options = [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
      ]
      const field = createSelectField("select_field", "Select Field", options)
      expect(field.type).toBe("select")
      expect(field.options).toEqual(options)
      expect(field.defaultValue).toBe("a")
    })

    test("creates optional select field", () => {
      const options = [{ value: "a", label: "A" }]
      const field = createSelectField("select_field", "Select", options, {
        required: false,
      })
      expect(field.required).toBe(false)
    })
  })

  describe("createToggleField", () => {
    test("creates toggle field", () => {
      const field = createToggleField("toggle_field", "Toggle")
      expect(field.type).toBe("toggle")
      expect(field.required).toBe(false)
      expect(field.defaultValue).toBe(false)
    })

    test("accepts custom default value", () => {
      const field = createToggleField("toggle_field", "Toggle", {
        defaultValue: true,
      })
      expect(field.defaultValue).toBe(true)
    })
  })

  describe("createNumberField", () => {
    test("creates number field", () => {
      const field = createNumberField("num_field", "Number")
      expect(field.type).toBe("number")
    })

    test("validates min/max constraints", () => {
      const field = createNumberField("num_field", "Number", {
        required: true,
        min: 0,
        max: 100,
      })
      expect(field.required).toBe(true)

      // Test validation
      const result = field.validation.safeParse(50)
      expect(result.success).toBe(true)

      const tooLow = field.validation.safeParse(-1)
      expect(tooLow.success).toBe(false)

      const tooHigh = field.validation.safeParse(101)
      expect(tooHigh.success).toBe(false)
    })
  })

  describe("createArrayField", () => {
    test("creates array field", () => {
      const field = createArrayField("arr_field", "Array Field")
      expect(field.type).toBe("array")
    })

    test("validates array content", () => {
      const field = createArrayField("arr_field", "Array Field")
      const result = field.validation.safeParse(["a", "b", "c"])
      expect(result.success).toBe(true)
    })
  })

  describe("createDateField", () => {
    test("creates date field", () => {
      const field = createDateField("date_field", "Date")
      expect(field.type).toBe("date")
      expect(field.placeholder).toBe("YYYY-MM-DD")
    })

    test("validates date format", () => {
      const field = createDateField("date_field", "Date", { required: true })
      expect(field.validation.safeParse("2024-01-15").success).toBe(true)
      expect(field.validation.safeParse("invalid").success).toBe(false)
    })
  })
})
