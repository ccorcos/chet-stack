import React, { useLayoutEffect, useState } from "react"
import {
	applyRecordDbOperation,
	recordDb,
	RecordDbOperation,
	TableDef,
} from "../../../../shared/database/RecordDb"
import { tupleTx } from "../../../../shared/database/TupleDb"
import * as t from "../../../../shared/DataType"
import { randomId } from "../../../../shared/randomId"
import { useGet, useList } from "../../../hooks/useDatabase"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Subspace } from "../../Subspace"
import { Button } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBox, ListItem, useListBox } from "../ListBox"

export function AirtableDemo() {
	return (
		<Subspace prefix={["AirtableDemo2"]}>
			<Airtable />
		</Subspace>
	)
}

function Airtable() {
	const { localResult } = useList({
		gt: ["model", "table"],
		lt: ["model", "table", null],
	})

	const result = localResult.hit || localResult.prefix
	const tables = result?.map((item) => item.value as TableDef)

	const [selected, setSelected] = useState<TableDef[]>([])

	// Annoying how this creates an extra render.
	useLayoutEffect(() => {
		if (tables && tables.length > 0) setSelected([tables[0]])
	}, [Boolean(tables)])

	return (
		<Layout
			LeftPanel={
				<LeftPanelLayout className="layer" style={{ padding: 8 }}>
					{tables ? (
						<TableList tables={tables} selected={selected} setSelected={setSelected} />
					) : (
						<div>Loading...</div>
					)}
				</LeftPanelLayout>
			}
		>
			<ContentLayout style={{ padding: 8 }}>
				{selected.length > 0 && <TableEditor table={selected[0]} />}
			</ContentLayout>
		</Layout>
	)
}

function TableEditor(props: { table: TableDef }) {
	const { table } = props
	// TODO: dataType editor.
	return <div>{JSON.stringify(table, null, 2)}</div>
}

function useWriteRecordDb() {
	const { api, cache } = useClientEnvironment()

	return async (operations: RecordDbOperation[]) => {
		// Optimistic update.
		let finalize: any
		const tx = tupleTx({
			compare: cache.compare,
			list: cache.listRaw,
			write: (args) => {
				console.log("write here", args)
				finalize = cache.write(args)
			},
		})
		const rdb = recordDb(tx)
		for (const operation of operations) applyRecordDbOperation(rdb, operation)
		tx.commit()

		const promise = api.writeRecordDb({ operations })
		promise.then(finalize)
		return await promise
	}
}

function TableList(props: {
	tables: TableDef[]
	selected: TableDef[]
	setSelected: (selected: TableDef[]) => void
}) {
	const { tables, selected, setSelected } = props

	const { onClick, onKeyDown } = useListBox({
		list: tables,
		selected,
		setSelected,
		multiselect: true,
	})

	const write = useWriteRecordDb()

	const handleNewTable = () => {
		const table: TableDef = { table: "Untitled " + randomId(), dataType: t.any }
		write([{ type: "setTable", args: table }])
		setSelected([table])
	}

	return (
		<ListBox
			onClick={onClick}
			onKeyDown={onKeyDown}
			style={{ display: "flex", flexDirection: "column", gap: 4 }}
		>
			{tables.map((table) => (
				<ListItem
					key={table.table}
					item={table}
					selected={selected.includes(table)}
					style={{ padding: 4, borderRadius: 4 }}
				>
					{table.table.startsWith("Untitled ") ? (
						<span style={{ color: "var(--fg1)" }}>Untitled</span>
					) : (
						table.table
					)}
				</ListItem>
			))}
			<div>
				<Button onClick={handleNewTable}>New Table</Button>
			</div>
		</ListBox>
	)
}

export function RecordDbDemoOld() {
	const { api, cache } = useClientEnvironment()

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
						const tx = tupleTx({
							compare: cache.compare,
							list: cache.listRaw,
							write: (args) => {
								finalize = cache.write(args)
							},
						})
						const rdb = recordDb(tx)

						const record = { table: "person", id: randomId(), name, age }
						rdb.setRecord(record)
						tx.commit()
						setDraft({ name: "", age: -1 })

						const promise = api.writeRecordDb({ operations: [{ type: "setRecord", args: record }] })
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
