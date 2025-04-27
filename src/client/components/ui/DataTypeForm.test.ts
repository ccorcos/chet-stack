import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { dataTypeDataType } from "../../../shared/DataType"
import { descriminatingDataTypePaths } from "./demos/DataTypeFormDemo"

describe("DataTypeForm", () => {
	it("discriminate", () => {
		const result = descriminatingDataTypePaths(dataTypeDataType.options)

		assert.deepEqual(result, {
			"properties.type.value": [
				"null",
				"undefined",
				"string",
				"datetime",
				"number",
				"boolean",
				"any",
				"literal",
				"array",
				"tuple",
				"map",
				"object",
				"or",
				"dataType",
			],
		})
	})
})
