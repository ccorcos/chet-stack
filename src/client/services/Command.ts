import { codec } from "../../shared/database/Codec"
import { InMemoryBaseOKV } from "../../shared/database/InMemoryBaseOKV"
import { tupleDb } from "../../shared/database/TupleDb"
import { Tuple, TupleDb } from "../../shared/database/types"

/** 0 is highest priority. */
type Priority = 0 | 1 | 2

export type Command = {
	name: string
	description?: string
	shortcut?: string | string[]
	priority?: Priority
	// Sometimes we want to use the Command architecture without exposing it to the user.
	hidden?: boolean
	// If a command is not enabled, we'll typically unregister it. But sometimes it's expensive
	// to compute if it's enabled so we want to do it lazily, or we want the user the understand
	// that the command is there, but simply not possible in the current state.
	enabled?: () => boolean
	execute: () => void | Promise<void>
}

function* indexCommand(command: Command): Generator<Tuple> {
	yield ["command", command.name]

	const shortcuts =
		typeof command.shortcut === "string" ? [command.shortcut] : command.shortcut ?? []
	const order = (command.priority ?? 0) * -1

	for (const shortcut of shortcuts) {
		yield ["shortcut", shortcut, order, command.name]
	}
}

function register(db: TupleDb, command: Command) {
	if (db.get(["command", command.name]))
		throw new Error("Command already registered: " + command.name)

	const indexes = [...indexCommand(command)]
	db.write({ set: indexes.map((index) => ({ key: index, value: command.name })) })
}

function unregister(db: TupleDb, command: Command) {
	const indexes = [...indexCommand(command)]
	db.write({ delete: indexes })
}

export class CommandService {
	private db = tupleDb(new InMemoryBaseOKV(codec.compare))

	register(command: Command) {
		register(this.db, command)
		return () => unregister(this.db, command)
	}
}
