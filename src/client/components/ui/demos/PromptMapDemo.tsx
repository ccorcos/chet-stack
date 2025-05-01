import { isEqual } from "lodash"
import pLimit from "p-limit"
import React, { Fragment, Suspense, useLayoutEffect, useMemo, useState } from "react"
import { Tuple } from "../../../../shared/database/types"
import { randomId } from "../../../../shared/randomId"
import { useGet, useWrite } from "../../../hooks/useDatabase"
import { useRefCurrent } from "../../../hooks/useRefCurrent"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { DataList } from "../DataList"
import { Layout, LeftPanelLayout } from "../Layout"

export function Spreadsheet(props: { id: Tuple }) {
	const result = useGet(props.id) || []
	result.remoteResult.suspend()
	const data: string[][] = result.localResult.hit || [["Name"]]

	const write = useWrite()

	const [importText, setImportText] = useState("")
	const onImport = () => {
		const columns = data[0]
		const lines = importText.split("\n").filter(Boolean)
		write({
			set: [
				{
					key: props.id,
					value: [...data, ...lines.map((line) => [line, ...columns.slice(1).map(() => "")])],
				},
			],
		})
		setImportText("")
	}

	const [columnText, setColumnText] = useState("")
	const onNewColumn = () => {
		if (columnText.trim() === "") return
		const [columns, ...rest] = data
		write({
			set: [
				{
					key: props.id,
					value: [[...columns, columnText], ...rest.map((row) => [...row, ""])],
				},
			],
		})
		setColumnText("")
	}

	const dataRef = useRefCurrent(data)
	const writeCell = (i: number, j: number, value: string) => {
		const data = dataRef.current
		write({
			set: [
				{
					key: props.id,
					value: data.map((row, k) =>
						k !== i ? row : row.map((cell, l) => (l !== j ? cell : value))
					),
				},
			],
		})
	}

	const { api } = useClientEnvironment()
	const limit = useMemo(() => pLimit(10), [])

	useLayoutEffect(() => {
		const data = dataRef.current
		const columns = data[0]

		for (let i = 0; i < data.length; i++) {
			for (let j = 0; j < columns.length; j++) {
				if (data[i][j] !== "") continue

				writeCell(i, j, "loading...")

				const system = `
					You are a helpful assistant populating cells in a spreadsheet so keep your answers concise.

					If the question is yes or no, then answer yes or no.
					If the question is a number, then answer with a number.
					If the question is a number but doesn't specify units, then specify the US customary unit in the response.
					If the question is a number range, then answer with a hyphenated range.
					If the question is categorical, then answer with only the category.
				`
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean)
					.join(" ")

				let prompt = `In regards to ${data[i][0]}, ` + columns[j]

				// Replace the col values.
				const row = data[i]
				for (let k = 0; k < row.length; k++) {
					prompt = prompt.replace(`{{${k}}}`, row[k])
				}

				limit(async () => {
					console.log("prompt", prompt)
					const response = await api.prompt({ system, prompt: prompt })
					if (response.status !== 200) {
						writeCell(i, j, "error...")
						return
					}
					const value = response.body
					writeCell(i, j, value)
				})
			}
		}
	}, [data])

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
			<textarea
				style={{ width: 450, height: 100 }}
				value={importText}
				onChange={(e) => setImportText(e.target.value)}
			/>
			<button style={{ width: 200 }} onClick={onImport}>
				Import
			</button>

			<textarea
				style={{ width: 450, height: 100 }}
				value={columnText}
				onChange={(e) => setColumnText(e.target.value)}
			/>
			<button style={{ width: 200 }} onClick={onNewColumn}>
				New Column
			</button>

			<div
				style={{
					flex: 1,
					display: "grid",
					gridTemplateColumns: `repeat(${data[0].length}, 1fr)`,
					gap: "8px",
				}}
			>
				{data[0].map((column, i) => (
					<div key={i} style={{ fontWeight: "bold" }}>
						{column}
					</div>
				))}

				{data.slice(1).map((row, i) => (
					<Fragment key={i}>
						{row.map((cell, j) => (
							<div key={`${i}-${j}`} style={{ padding: "4px", border: "1px solid #ddd" }}>
								{cell}
							</div>
						))}
					</Fragment>
				))}
			</div>
		</div>
	)
}

export function PromptMapDemo() {
	const [selected, setSelected] = useState<Tuple | undefined>(undefined)

	return (
		<Layout
			LeftPanel={
				<Suspense fallback={<div>Loading...</div>}>
					<LeftPanelLayout show={true}>
						<JSONObjectList id={["promptList"]} selected={selected} setSelected={setSelected} />
					</LeftPanelLayout>
				</Suspense>
			}
		>
			<Suspense fallback={<div>Loading...</div>}>
				{selected && <Spreadsheet id={selected} />}
			</Suspense>
		</Layout>
	)
}

function JSONObjectList(props: {
	id: Tuple
	selected: Tuple | undefined
	setSelected: (key: Tuple | undefined) => void
}) {
	const { id } = props

	const result = useGet(id)
	result.remoteResult.suspend()
	const list: Tuple[] = result.localResult.hit || []

	const onNewItem = (): Tuple => [randomId()]

	const write = useWrite()
	const onInsert = () => {
		if (list.length === 0) {
			write({ set: [{ key: id, value: [onNewItem()] }] })
		} else {
			write({ set: [{ key: id, value: [...list, onNewItem()] }] })
		}
	}

	const onReorder = ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
		const newList = list.slice()
		newList.splice(toIndex, 0, newList.splice(fromIndex, 1)[0])
		write({ set: [{ key: id, value: newList }] })
	}

	const onDelete = (x: Tuple) => {
		write({ set: [{ key: id, value: list.filter((item) => !isEqual(item, x)) }] })
	}

	return (
		<DataList
			list={list}
			selected={props.selected ? [props.selected] : []}
			setSelected={(items) => props.setSelected(items[0])}
			onInsert={onInsert}
			onDelete={onDelete}
			onReorder={onReorder}
		>
			{(item) => JSON.stringify(item)}
		</DataList>
	)
}
