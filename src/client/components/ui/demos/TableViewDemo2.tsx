import React, { useState } from "react"
import { randomId } from "../../../../shared/randomId"
import { useGet, useWrite } from "../../../hooks/useDatabase"
import { DataList } from "../DataList"
import { Layout, LeftPanelLayout } from "../Layout"

type StringPropertyType = { id: string; name?: string; type: "string" }
type NumberPropertyType = { id: string; name?: string; type: "number" }
type BooleanPropertyType = { id: string; name?: string; type: "boolean" }
type SelectPropertyType = {
	id: string
	name?: string
	type: "select"
	options?: string[]
	plural?: boolean
}

type Property = StringPropertyType | NumberPropertyType | BooleanPropertyType | SelectPropertyType
type PropertyValue = undefined | string | number | boolean | string[]
type PropertyType = Property["type"]

type Schema = {
	id: string
	name: string
	properties: string[]
}

type View = {
	id: string
	name: string
	columns: { property: string; width?: number }[]
	order: string[] // preferred record order with no sort.
	// filter, sort
	// type: "table" | "board" | "calendar" | "list"
}

type Record = {
	id: string
	[property: string]: PropertyValue
}

export function TableViewDemo2() {
	const [view, setView] = useState<string | undefined>(undefined)

	return (
		<Layout
			LeftPanel={
				<LeftPanelLayout show={true}>
					<ViewList selected={view} setSelected={setView} />
				</LeftPanelLayout>
			}
		>
			Hello
		</Layout>
	)
}

const ViewListKey = "ViewList"

// TODO: get with mapping to the items.

// ViewList[*] = $.id
// [ViewList, $.id] -> $

// Or maybe a query is simpler...
// {get: "ViewList"}
// {map: "[*]"}

const query = `
const list = JSON.parse(get("ViewList"))
const views = list.map(view => get(view))
`

function ViewList(props: {
	selected: string | undefined
	setSelected: (selected: string | undefined) => void
}) {
	const result = useGet(ViewListKey)
	result.remoteResult.suspend()
	const list: string[] = JSON.parse(result.localResult.hit || "[]")

	const write = useWrite()

	const onInsert = () => {
		const newView: View = {
			id: randomId(),
			name: "",
			columns: [],
			order: [],
		}

		if (list.length === 0) {
			// write({ set: [{ key: ViewListKey, value: JSON.stringify([onNewItem()]) }] })
		} else {
			write({
				// set: [{ key: ViewListKey, value: JSON.stringify([...list, onNewItem()]) }],
			})
		}
	}

	const onReorder = ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
		const newList = list.slice()
		newList.splice(toIndex, 0, newList.splice(fromIndex, 1)[0])
		write({ set: [{ key: ViewListKey, value: JSON.stringify(newList) }] })
	}

	const onDelete = (i: string) => {
		write({
			set: [
				{
					key: ViewListKey,
					value: JSON.stringify(list.filter((item) => item !== i)),
				},
			],
		})
	}

	return (
		<div style={{ width: 300 }}>
			<DataList
				list={list}
				selected={props.selected}
				setSelected={props.setSelected}
				onInsert={onInsert}
				onDelete={onDelete}
				onReorder={onReorder}
			/>
		</div>
	)
}
