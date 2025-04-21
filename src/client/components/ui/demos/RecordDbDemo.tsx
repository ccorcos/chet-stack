import { once } from "lodash"
import React, { useState } from "react"
import { recordDb } from "../../../../shared/database/RecordDb"
import { Transaction } from "../../../../shared/database/Transaction"
import { tupleTx } from "../../../../shared/database/TupleDb"
import { BaseOKVCache, JSONValue, Tuple } from "../../../../shared/database/types"
import * as t from "../../../../shared/DataType"
import { randomId } from "../../../../shared/randomId"
import { useGet, useList } from "../../../hooks/useDatabase"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Button } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { Input } from "../Input"

const init = once((cache: BaseOKVCache<Tuple, JSONValue>) => {
	const tx = tupleTx(
		new Transaction({
			compare: cache.compare,
			list: cache.listRaw,
			write: (args) => {
				const finalize = cache.write(args)
				finalize()
			},
		})
	)

	const rdb = recordDb(tx)

	rdb.setTable({
		table: "person",
		dataType: t.object({ id: t.string, table: t.literal("person"), name: t.string, age: t.number }),
	})

	rdb.createIndex({
		table: "person",
		name: "byName",
		fn: (value) => [value.name, value.id],
	})

	rdb.createIndex({
		table: "person",
		name: "byAge",
		fn: (value) => [value.age, value.id],
	})

	tx.commit()
})

export function RecordDbDemo() {
	const { api, cache } = useClientEnvironment()
	init(cache)

	const [draft, setDraft] = useState<{ name: string; age: number }>({ name: "", age: -1 })
	const [state, setState] = useState<"byId" | "byName" | "byAge">("byId")
	const suffix = state === "byId" ? "" : "." + state
	const { localResult, remoteResult } = useList({
		gt: ["data", "person" + suffix],
		lt: ["data", "person" + suffix, null],
	})

	const result = localResult.hit || localResult.prefix
	// if (!result) throw remoteResult.promise

	return (
		<div>
			<div>People</div>
			<div style={{ display: "flex", gap: 8, flexDirection: "column", width: 200 }}>
				<div>New Person</div>
				<Input
					placeholder="name"
					value={draft.name}
					onChange={(e) => setDraft({ ...draft, name: e.target.value })}
				/>
				<Input
					type="number"
					placeholder="age"
					value={draft.age === -1 ? "" : draft.age}
					onChange={(e) => setDraft({ ...draft, age: parseInt(e.target.value) })}
				/>
				<Button
					onClick={() => {
						const { name, age } = draft
						if (!name) return
						if (!age) return

						let finalize: any
						const tx = tupleTx(
							new Transaction({
								compare: cache.compare,
								list: cache.listRaw,
								write: (args) => {
									finalize = cache.write(args)
								},
							})
						)
						const rdb = recordDb(tx)

						const record = { table: "person", id: randomId(), name, age }
						rdb.setRecord(record)
						tx.commit()
						setDraft({ name: "", age: -1 })

						const promise = api.writeRecords({ set: [record] })
						promise.then(finalize)
					}}
				>
					Create
				</Button>
			</div>

			<ComboBoxSelect
				items={["byId", "byName", "byAge"]}
				value={state}
				onChange={(x) => setState((x as any) ?? "byId")}
				placeholder="Sort by..."
			/>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
				{!result ? (
					<div>Loading...</div>
				) : (
					result.map(({ key }) => <Person id={key.at(-1)!} key={key.at(-1)!} />)
				)}
			</div>
		</div>
	)
}

function Person(props: { id: string }) {
	const { localResult, remoteResult } = useGet(["data", "person", props.id])
	if (!localResult.hit) throw remoteResult.promise
	const person = localResult.hit
	return (
		<React.Fragment>
			<div>id: {person.id}</div>
			<div>name: {person.name}</div>
			<div>age: {person.age}</div>
		</React.Fragment>
	)
}
