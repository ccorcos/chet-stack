import { Simplify } from "../../shared/typeHelpers"

export class Database {
	constructor(private dbPath: string) {}
}

export type DatabaseApi = Simplify<Database>
