import { Database, Transaction } from "better-sqlite3"
import { compare } from "shared/compare"
import { Okv } from "./types"

type K = string
type V = string

export class SQLiteOkv implements Okv<K, V> {
	/**
	 * import sqlite from "better-sqlite3"
	 * new SQLiteDatabase(sqlite("path/to.db"))
	 */
	constructor(private db: Database) {
		const createTableQuery = db.prepare(
			`create table if not exists data ( key text primary key, value text)`
		)

		// Make sure the table exists.
		createTableQuery.run()

		const insertQuery = db.prepare(`insert or replace into data values ($key, $value)`)
		const deleteQuery = db.prepare(`delete from data where key = $key`)

		this.writeFactsQuery = this.db.transaction(
			(tx: { set?: { key: K; value: V }[]; delete?: K[] }) => {
				for (const { key, value } of tx.set || []) {
					insertQuery.run({ key, value })
				}
				for (const key of tx.delete || []) {
					deleteQuery.run({ key: key })
				}
			}
		)
	}

	compare = compare

	private writeFactsQuery: Transaction

	list(
		args: {
			gt?: K
			gte?: K
			lt?: K
			lte?: K
			offset?: number
			limit?: number
			reverse?: boolean
		} = {}
	) {
		const sqlArgs: any = {}
		const whereClauses: string[] = []

		if (args.gte !== undefined) {
			sqlArgs.gte = args.gte
			whereClauses.push("key >= $gte")
		} else if (args.gt !== undefined) {
			sqlArgs.gt = args.gt
			whereClauses.push("key > $gt")
		}

		if (args.lte !== undefined) {
			sqlArgs.lte = args.lte
			whereClauses.push("key <= $lte")
		} else if (args.lt !== undefined) {
			sqlArgs.lt = args.lt
			whereClauses.push("key < $lt")
		}

		let sqlQuery = `select * from data`
		if (whereClauses.length) {
			sqlQuery += " where "
			sqlQuery += whereClauses.join(" and ")
		}

		sqlQuery += " order by key"
		if (args.reverse) {
			sqlQuery += " desc"
		}

		if (args.limit) {
			sqlArgs.limit = args.limit
			sqlQuery += ` limit $limit`
		}
		if (args.offset) {
			sqlArgs.offset = args.offset
			sqlQuery += ` offset $offset`
		}

		const results: any[] = this.db.prepare(sqlQuery).all(sqlArgs)

		return results
	}

	write(tx: { set?: { key: K; value: V }[]; delete?: K[] }) {
		this.writeFactsQuery(tx)
	}

	close() {
		this.db.close()
	}
}
