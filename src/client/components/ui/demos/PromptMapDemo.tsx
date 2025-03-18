import pLimit from "p-limit"
import React, { Fragment, useMemo, useRef, useState } from "react"
import { useCounter } from "../../../hooks/useCounter"
import { useClientEnvironment } from "../../../services/ClientEnvironment"

export function PromptMapDemo() {
	const columnsRef = useRef<string[]>([])
	const dataRef = useRef<string[][]>([])
	const [_, rerender] = useCounter()

	const [importText, setImportText] = useState("")
	const onImport = () => {
		const columns = columnsRef.current
		const data = dataRef.current

		const lines = importText.split("\n").filter(Boolean)
		data.push(...lines.map((line) => [line, ...columns.map(() => "")]))
		setImportText("")
		populate()
		rerender()
	}

	const [columnText, setColumnText] = useState("")
	const onNewColumn = () => {
		const columns = columnsRef.current
		const data = dataRef.current

		columns.push(columnText)
		setColumnText("")
		for (const row of data) row.push("")
		populate()
		rerender()
	}

	const { api } = useClientEnvironment()

	const limit = useMemo(() => pLimit(10), [])

	const populate = () => {
		const columns = columnsRef.current
		const data = dataRef.current

		for (let i = 0; i < data.length; i++) {
			for (let j = 0; j < columns.length; j++) {
				if (data[i][j + 1] !== "") continue

				data[i][j + 1] = "loading..."

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
					const response = await api.prompt({ system, prompts: [prompt] })
					if (response.status !== 200) {
						data[i][j + 1] = "error..."
						return
					}
					const value = response.body.reverse()[0].content
					data[i][j + 1] = value
					rerender()
				})
			}
		}
	}

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
					gridTemplateColumns: `repeat(${columnsRef.current.length + 1}, 1fr)`,
					gap: "8px",
				}}
			>
				<div style={{ fontWeight: "bold" }}>input</div>
				{columnsRef.current.map((column, i) => (
					<div key={i} style={{ fontWeight: "bold" }}>
						{column}
					</div>
				))}

				{dataRef.current.map((row, i) => (
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
