import { Database, Statement, Transaction } from "better-sqlite3"
import { Codec, jsonCodec } from "lexicodec"
import { OrderedKeyValueApi } from "./types"

export class SQLiteDatabase<K = any, V = any> implements OrderedKeyValueApi<K, V> {
	/**
	 * import sqlite from "better-sqlite3"
	 * new SQLiteOKV(sqlite("path/to.db"))
	 */
	constructor(
		private db: Database,
		public codec: Codec = jsonCodec
	) {
		const createTableQuery = db.prepare(
			`create table if not exists data ( key text primary key, value text)`
		)

		// Make sure the table exists.
		createTableQuery.run()

		this.getQuery = db.prepare(`select * from data where key = $key`)

		const insertQuery = db.prepare(`insert or replace into data values ($key, $value)`)
		const deleteQuery = db.prepare(`delete from data where key = $key`)

		this.writeFactsQuery = this.db.transaction(
			(tx: { set?: { key: K; value: V }[]; delete?: K[] }) => {
				for (const { key, value } of tx.set || []) {
					insertQuery.run({
						key: this.codec.encode(key),
						value: this.codec.encode(value),
					})
				}
				for (const key of tx.delete || []) {
					deleteQuery.run({ key: this.codec.encode(key) })
				}
			}
		)
	}

	private getQuery: Statement
	private writeFactsQuery: Transaction

	get(key: K) {
		return this.getQuery
			.all({ key: this.codec.encode(key) })
			.map((row: any) => this.codec.decode(row.value))[0] as V | undefined
	}

	list(
		args: {
			gt?: K
			gte?: K
			lt?: K
			lte?: K
			limit?: number
			reverse?: boolean
		} = {}
	) {
		const sqlArgs: any = {}
		const whereClauses: string[] = []

		if (args.gte !== undefined) {
			sqlArgs.gte = this.codec.encode(args.gte)
			whereClauses.push("key >= $gte")
		} else if (args.gt !== undefined) {
			sqlArgs.gt = this.codec.encode(args.gt)
			whereClauses.push("key > $gt")
		}

		if (args.lte !== undefined) {
			sqlArgs.lte = this.codec.encode(args.lte)
			whereClauses.push("key <= $lte")
		} else if (args.lt !== undefined) {
			sqlArgs.lt = this.codec.encode(args.lt)
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

		const results: any[] = this.db.prepare(sqlQuery).all(sqlArgs)

		return results.map(({ key, value }) => ({
			key: this.codec.decode(key),
			value: this.codec.decode(value),
		}))
	}

	set(key: K, value: V) {
		this.write({ set: [{ key, value }] })
	}

	delete(key: K) {
		this.write({ delete: [key] })
	}

	write(tx: { set?: { key: K; value: V }[]; delete?: K[] }) {
		this.writeFactsQuery(tx)
	}

	close() {
		this.db.close()
	}
}
