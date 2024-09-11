import { Simplify } from "../../shared/typeHelpers"

export class Database {
	constructor(private dbPath: string) {}

	reset() {}
}

export type DatabaseApi = Simplify<Database>
