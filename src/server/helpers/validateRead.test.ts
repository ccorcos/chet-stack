import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { setRecordMap } from "../../shared/recordMapHelpers"
import { FileRecord, RecordMap, RecordPointer } from "../../shared/schema"
import { canRead } from "./validateRead"

describe("validateRead", () => {
	it("works", () => {
		const ownerId = "user1"
		const file: FileRecord = {
			id: "file1",
			version: 1,
			created_at: "2023-11-02T17:58:25.790Z",
			updated_at: "2023-11-02T17:58:25.790Z",
			filename: "chet icon.jpg",
			owner_id: ownerId,
		}
		const pointer: RecordPointer = { table: "file", id: "file1" }
		const recordMap: RecordMap = {}
		setRecordMap(recordMap, pointer, file)

		assert.equal(canRead({ pointer, recordMap, userId: ownerId }), true)
		assert.equal(canRead({ pointer, recordMap, userId: "someoneElse" }), false)
	})
})
