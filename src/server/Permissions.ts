import { cloneDeep } from "lodash"
import { ServerEnvironment } from "./ServerEnvironment"
import { UnreachableCaseError, PermissionError, ValidationError } from "../shared/errors"
import { RecordLoader } from "../shared/RecordLoader"
import { getRecordMap, setRecordMap } from "../shared/recordMapHelpers"
import { RecordMap, RecordTable, RecordValue, RecordPointer } from "../shared/schema"

export async function assertPermissions(args: {
	userId: string
	recordMapBeforeChanges?: RecordMap
	recordMapAfterChanges?: RecordMap
	environment: ServerEnvironment
	pointers: RecordPointer[]
}) {
	const permissions = new Permissions(args)

	await Promise.all(args.pointers.map(permissions.assert))
}

type AssertPermissionsFn<Table extends RecordTable> = (
	change: RecordChange<RecordValue<Table>>
) => Promise<void> | void

type RecordChange<Record extends RecordValue> =
	| {
			changeType: "CREATE"
			previous: undefined
			next: Record
	  }
	| {
			changeType: "UPDATE"
			previous: Record
			next: Record
	  }
	| {
			changeType: "DELETE"
			previous: Record
			next: undefined
	  }

function getRecordChange<Record extends RecordValue>({
	previous,
	next,
}: {
	previous?: Record
	next?: Record
}): RecordChange<Record> {
	if (previous && next) return { changeType: "UPDATE" as const, previous, next }
	if (!previous && next) return { changeType: "CREATE" as const, previous, next }
	if (previous && !next) return { changeType: "DELETE" as const, previous, next }

	throw new UnreachableCaseError(undefined as never, "Both previous and next are undefined")
}

class Permissions {
	userId: string
	recordMapBeforeChanges: RecordMap
	recordMapAfterChanges: RecordMap

	private environment: ServerEnvironment

	/** Loads documents with their "before change" state into recordMapBeforeChange */
	private beforeChangeLoader: RecordLoader

	constructor(args: {
		userId: string
		recordMapBeforeChanges?: RecordMap
		recordMapAfterChanges?: RecordMap
		environment: ServerEnvironment
	}) {
		this.userId = args.userId

		this.recordMapBeforeChanges = args.recordMapBeforeChanges
			? cloneDeep(args.recordMapBeforeChanges)
			: {}

		this.recordMapAfterChanges = args.recordMapAfterChanges
			? cloneDeep(args.recordMapAfterChanges)
			: cloneDeep(this.recordMapBeforeChanges)

		this.environment = args.environment

		this.beforeChangeLoader = new RecordLoader({
			onFetchRecord: async (pointer) => {
				let record = getRecordMap(this.recordMapBeforeChanges, pointer)
				if (record) return
				record = await this.environment.db.getRecord(pointer)
				setRecordMap(this.recordMapBeforeChanges, pointer, record)
			},
		})
	}

	assert = async (pointer: RecordPointer) => {
		if (!(pointer.table in this.assertions)) {
			throw new UnreachableCaseError(pointer.table as never)
		}

		const change = getRecordChange({
			previous: getRecordMap(this.recordMapBeforeChanges, pointer),
			next: getRecordMap(this.recordMapAfterChanges, pointer),
		})

		await this.assertions[pointer.table](change as any)
	}

	// storing the assertion functions inside a dictionary (instead of
	// as methods on the Permissions object) allows us to more easily
	// type them
	assertions: { [Key in RecordTable]: AssertPermissionsFn<Key> } = {
		auth_token: async ({ changeType, previous, next }) => {},
		message: async ({ changeType, previous, next }) => {
			switch (changeType) {
				case "CREATE": {
					assertPermission(
						"message author_id must equal your user ID",
						next.author_id === this.userId
					)

					// it's ok to create a thread and message in the same transaction
					const thread = await this.getRecordAfterChange({ table: "thread", id: next.thread_id })

					if (!thread) {
						throw new ValidationError(`thread with ID ${next.thread_id} not found`)
					}

					assertPermission(
						`you don't have permission to participate in thread ${next.thread_id}`,
						thread.member_ids?.includes(this.userId)
					)

					return
				}
				case "DELETE": {
					throw new PermissionError("cannot delete messages")
				}
				case "UPDATE": {
					assertPermission(
						"message author_id must equal your user ID",
						next.author_id === this.userId
					)
					assertPermission("cannot change message id", previous.id === next.id)
					assertPermission("cannot change message author_id", previous.author_id === next.author_id)
					assertPermission("cannot change message thread_id", previous.thread_id === next.thread_id)
					assertPermission("cannot change message text", previous.text === next.text)

					return
				}
				default: {
					throw new UnreachableCaseError(changeType)
				}
			}
		},
		password: async ({ changeType, previous, next }) => {},
		thread: async ({ changeType, previous, next }) => {},
		user: async ({ changeType, previous, next }) => {},
		user_settings: async ({ changeType, previous, next }) => {},
	}

	async getRecordBeforeChange<Table extends RecordTable>(
		pointer: RecordPointer<Table>
	): Promise<RecordValue<Table> | undefined> {
		const loader = this.beforeChangeLoader.loadRecord(pointer)

		if (!loader.loaded) {
			await loader
		}

		return getRecordMap(this.recordMapBeforeChanges, pointer)
	}

	async getRecordAfterChange<Table extends RecordTable>(
		pointer: RecordPointer<Table>
	): Promise<RecordValue<Table> | undefined> {
		const record = getRecordMap(this.recordMapAfterChanges, pointer)

		if (record) return record

		const loader = this.beforeChangeLoader.loadRecord(pointer)

		if (!loader.loaded) {
			await loader
		}

		// When we load records we only add them to `recordMapBeforeChange`.
		// As a consequence, it's possible for a record to be in
		// `recordMapBeforeChange` but not `recordMapAfterChange`.
		return getRecordMap(this.recordMapBeforeChanges, pointer)
	}
}

function assertPermission(msg: string, assertion?: boolean): asserts assertion is true {
	if (assertion) return
	throw new PermissionError(msg)
}
